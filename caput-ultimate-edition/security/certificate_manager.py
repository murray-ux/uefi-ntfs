# security/certificate_manager.py
#
# SSL/TLS Certificate Manager — validates HTTPS connections, checks
# certificate chains, monitors expiry, and manages CA bundles.
#
# Uses the system CA store or Mozilla's certifi bundle by default.
# A custom CA bundle path can be injected for air-gapped or
# pinned-certificate environments.
#
# All target domains are configured via environment variables or
# constructor arguments — no hardcoded URLs.
#
# Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

import os
import ssl
import socket
import hashlib
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Try to import certifi; fall back to system store if unavailable
# ---------------------------------------------------------------------------
try:
    import certifi

    _DEFAULT_CA_BUNDLE = certifi.where()
except ImportError:
    certifi = None  # type: ignore[assignment]
    _DEFAULT_CA_BUNDLE = None  # will use ssl.create_default_context() default


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class CertificateInfo:
    """Result of a certificate validation check."""

    hostname: str
    port: int
    valid: bool
    subject: str = ""
    issuer: str = ""
    serial_number: str = ""
    not_before: Optional[datetime] = None
    not_after: Optional[datetime] = None
    tls_version: str = ""
    cipher_suite: str = ""
    errors: List[str] = field(default_factory=list)


@dataclass
class ExpiryWarning:
    """A certificate approaching its expiry date."""

    hostname: str
    expires: str
    days_remaining: int


# ---------------------------------------------------------------------------
# CertificateManager
# ---------------------------------------------------------------------------


class CertificateManager:
    """Centralised certificate management for HTTPS connections."""

    def __init__(self, ca_bundle: Optional[str] = None) -> None:
        if ca_bundle and Path(ca_bundle).is_file():
            self.ca_bundle: Optional[str] = ca_bundle
            logger.info("Using custom CA bundle: %s", self.ca_bundle)
        elif _DEFAULT_CA_BUNDLE:
            self.ca_bundle = _DEFAULT_CA_BUNDLE
            logger.info("Using Mozilla CA bundle: %s", self.ca_bundle)
        else:
            self.ca_bundle = None
            logger.info("Using system default CA store")

    # ----- SSL context -----

    def create_ssl_context(self) -> ssl.SSLContext:
        """Create an SSL context enforcing TLS 1.2+ and certificate validation."""
        if self.ca_bundle:
            ctx = ssl.create_default_context(cafile=self.ca_bundle)
        else:
            ctx = ssl.create_default_context()

        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.check_hostname = True
        ctx.verify_mode = ssl.CERT_REQUIRED
        return ctx

    # ----- Single-host verification -----

    def verify_certificate(
        self, hostname: str, port: int = 443, timeout: float = 10.0
    ) -> CertificateInfo:
        """Validate the SSL certificate presented by *hostname*:*port*."""
        ctx = self.create_ssl_context()
        try:
            with socket.create_connection((hostname, port), timeout=timeout) as sock:
                with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher() or ("", "", 0)
                    version = ssock.version() or ""

                    subject_cn = _extract_cn(cert, "subject")
                    issuer_org = _extract_field(cert, "issuer", "organizationName")

                    return CertificateInfo(
                        hostname=hostname,
                        port=port,
                        valid=True,
                        subject=subject_cn,
                        issuer=issuer_org,
                        serial_number=cert.get("serialNumber", ""),
                        not_before=_parse_cert_date(cert.get("notBefore", "")),
                        not_after=_parse_cert_date(cert.get("notAfter", "")),
                        tls_version=version,
                        cipher_suite=f"{cipher[0]} ({cipher[2]} bits)",
                    )
        except ssl.SSLCertVerificationError as exc:
            return _fail(hostname, port, f"Certificate verification failed: {exc}")
        except ssl.SSLError as exc:
            return _fail(hostname, port, f"SSL error: {exc}")
        except socket.timeout:
            return _fail(hostname, port, "Connection timeout")
        except OSError as exc:
            return _fail(hostname, port, f"Connection error: {exc}")

    # ----- Batch verification -----

    def verify_domains(self, domains: List[str]) -> Dict[str, CertificateInfo]:
        """Verify certificates for a list of domains."""
        results: Dict[str, CertificateInfo] = {}
        for domain in domains:
            info = self.verify_certificate(domain)
            results[domain] = info
            if info.valid:
                logger.info(
                    "PASS  %s  issuer=%s  tls=%s  expires=%s",
                    domain,
                    info.issuer,
                    info.tls_version,
                    info.not_after,
                )
            else:
                logger.error(
                    "FAIL  %s  errors=%s", domain, "; ".join(info.errors)
                )
        return results

    # ----- Expiry monitoring -----

    def check_expiry(
        self, domains: List[str], days_threshold: int = 30
    ) -> List[ExpiryWarning]:
        """Return warnings for any domain whose cert expires within *days_threshold*."""
        threshold = datetime.utcnow() + timedelta(days=days_threshold)
        warnings: List[ExpiryWarning] = []

        for domain in domains:
            info = self.verify_certificate(domain)
            if info.valid and info.not_after and info.not_after < threshold:
                remaining = (info.not_after - datetime.utcnow()).days
                warnings.append(
                    ExpiryWarning(
                        hostname=domain,
                        expires=info.not_after.isoformat(),
                        days_remaining=remaining,
                    )
                )
                logger.warning(
                    "Certificate for %s expires in %d days", domain, remaining
                )

        return warnings

    # ----- HTTPS connection test -----

    def test_connection(self, url: str, timeout: float = 10.0) -> bool:
        """Test an HTTPS GET against *url*. Returns True on 2xx/3xx."""
        try:
            import urllib.request

            ctx = self.create_ssl_context()
            req = urllib.request.Request(url, method="HEAD")
            resp = urllib.request.urlopen(req, timeout=timeout, context=ctx)
            logger.info("PASS  %s  status=%d", url, resp.status)
            return 200 <= resp.status < 400
        except Exception as exc:
            logger.error("FAIL  %s  %s", url, exc)
            return False

    # ----- Certificate pinning helper -----

    @staticmethod
    def compute_pin(cert_der: bytes) -> str:
        """Compute a SHA-256 pin for a DER-encoded certificate."""
        digest = hashlib.sha256(cert_der).hexdigest()
        return f"sha256/{digest}"

    @staticmethod
    def verify_pin(cert_der: bytes, expected_pin: str) -> bool:
        """Verify a certificate matches an expected pin."""
        return CertificateManager.compute_pin(cert_der) == expected_pin


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _extract_cn(cert: dict, key: str) -> str:
    """Extract commonName from a cert's subject or issuer tuple-of-tuples."""
    for rdn in cert.get(key, ()):
        for attr_type, attr_value in rdn:
            if attr_type == "commonName":
                return attr_value
    return ""


def _extract_field(cert: dict, key: str, field_name: str) -> str:
    for rdn in cert.get(key, ()):
        for attr_type, attr_value in rdn:
            if attr_type == field_name:
                return attr_value
    return ""


def _parse_cert_date(s: str) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%b %d %H:%M:%S %Y %Z")
    except ValueError:
        return None


def _fail(hostname: str, port: int, error: str) -> CertificateInfo:
    return CertificateInfo(hostname=hostname, port=port, valid=False, errors=[error])


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )

    # Domains from env or CLI args
    domains = sys.argv[1:] or os.environ.get(
        "GENESIS_VERIFY_DOMAINS", "www.google.com,github.com"
    ).split(",")

    mgr = CertificateManager()
    print(f"CA bundle: {mgr.ca_bundle or 'system default'}\n")

    print("--- Certificate Verification ---")
    results = mgr.verify_domains(domains)
    for domain, info in results.items():
        status = "PASS" if info.valid else "FAIL"
        print(f"  {status}  {domain}  issuer={info.issuer}  tls={info.tls_version}")

    print("\n--- Expiry Check (30 day threshold) ---")
    warnings = mgr.check_expiry(domains, days_threshold=30)
    if warnings:
        for w in warnings:
            print(f"  WARNING  {w.hostname}: {w.days_remaining} days remaining")
    else:
        print("  All certificates valid for at least 30 days")
