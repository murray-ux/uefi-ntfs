#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""
CanonKit - Evidence Ingestion Pipeline

Reads a file, computes hash, generates EvidenceObject + Events JSON,
appends to event log, and re-signs manifest under DER-canonical trust chain.
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent.resolve()
CANON_ROOT = SCRIPT_DIR.parent
KEYS_DIR = CANON_ROOT / "keys"
CANON_DIR = CANON_ROOT / "canon"

# Canon subdirectories
OBJECTS_DIR = CANON_DIR / "objects"
EVIDENCE_DIR = CANON_DIR / "evidence"
EVENTS_DIR = CANON_DIR / "events"
MANIFEST_DIR = CANON_DIR / "manifest"

# Key paths
ENV_KEY = KEYS_DIR / "env" / "env.key"
ENV_PUB = KEYS_DIR / "env" / "env.pub.pem"
ROOT_PUB = KEYS_DIR / "root" / "canon_root.pub.pem"
ENV_SIG = KEYS_DIR / "env" / "env.pub.der.sig"
ENV_DER = KEYS_DIR / "env" / "env.pub.der"


def sha256_file(filepath: Path) -> str:
    """Compute SHA256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_bytes(data: bytes) -> str:
    """Compute SHA256 hash of bytes."""
    return hashlib.sha256(data).hexdigest()


def generate_uuid() -> str:
    """Generate a UUID4."""
    return str(uuid.uuid4())


def timestamp_iso() -> str:
    """Generate ISO8601 UTC timestamp."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def detect_document_type(filename: str, content_hash: str) -> str:
    """Auto-detect document type based on filename patterns."""
    name_lower = filename.lower()

    patterns = {
        "FORM_13": ["form 13", "form13", "financial disclosure"],
        "SOLICITOR_CORRESPONDENCE": ["solicitor", "trust account", "legal"],
        "CDL_LETTER": ["cdl", "costs documentation"],
        "LEGAL_AID_APPLICATION": ["legal aid", "aid application"],
        "PAYMENT_ARRANGEMENT": ["payment arrangement", "payment plan"],
        "INVOICE": ["invoice", "inv-", "inv_"],
        "TRUST_STATEMENT": ["trust statement", "trust account statement"],
        "COURT_DOCUMENT": ["court", "affidavit", "order", "judgment"],
        "EMAIL": ["email", "correspondence", ".eml"],
        "REPORT": ["report", "assessment"],
    }

    for doc_type, keywords in patterns.items():
        for keyword in keywords:
            if keyword in name_lower:
                return doc_type

    # Detect by extension
    ext = Path(filename).suffix.lower()
    ext_types = {
        ".pdf": "PDF_DOCUMENT",
        ".doc": "WORD_DOCUMENT",
        ".docx": "WORD_DOCUMENT",
        ".xls": "SPREADSHEET",
        ".xlsx": "SPREADSHEET",
        ".csv": "DATA_FILE",
        ".json": "DATA_FILE",
        ".txt": "TEXT_DOCUMENT",
        ".md": "TEXT_DOCUMENT",
        ".png": "IMAGE",
        ".jpg": "IMAGE",
        ".jpeg": "IMAGE",
    }

    return ext_types.get(ext, "UNKNOWN")


def verify_lineage() -> bool:
    """Verify ROOT→ENV lineage before signing."""
    if not all(p.exists() for p in [ROOT_PUB, ENV_DER, ENV_SIG]):
        print("ERROR: Lineage files not found. Run seal-lineage-max.sh first.", file=sys.stderr)
        return False

    try:
        result = subprocess.run(
            [
                "openssl", "pkeyutl", "-verify",
                "-pubin", "-inkey", str(ROOT_PUB),
                "-rawin",
                "-in", str(ENV_DER),
                "-sigfile", str(ENV_SIG)
            ],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print("ERROR: ROOT→ENV lineage invalid (cannot trust env key)", file=sys.stderr)
            return False
        return True
    except Exception as e:
        print(f"ERROR: Lineage verification failed: {e}", file=sys.stderr)
        return False


def sign_manifest(manifest_path: Path) -> Path:
    """Sign manifest with ENV key, return signature path."""
    sig_path = manifest_path.with_suffix(".sig")

    try:
        subprocess.run(
            [
                "openssl", "pkeyutl", "-sign",
                "-inkey", str(ENV_KEY),
                "-rawin",
                "-in", str(manifest_path),
                "-out", str(sig_path)
            ],
            check=True,
            capture_output=True
        )
        return sig_path
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Failed to sign manifest: {e.stderr.decode()}", file=sys.stderr)
        sys.exit(1)


def create_manifest_hash(manifest_path: Path) -> Path:
    """Create SHA256 hash file for manifest."""
    hash_path = manifest_path.with_suffix(".sha256")
    manifest_hash = sha256_file(manifest_path)
    hash_path.write_text(manifest_hash + "\n")
    return hash_path


def ingest_evidence(
    filepath: Path,
    label: str,
    source: str = "Manual",
    court_relevance: str = "",
    tags: list = None
) -> dict:
    """
    Main ingestion pipeline:
    1. Read file and compute hash
    2. Store raw bytes in content-addressed store
    3. Create EvidenceObject JSON
    4. Create Event JSON
    5. Append to event log
    6. Update and sign manifest
    """

    # Verify lineage first
    if not verify_lineage():
        sys.exit(1)

    # ─────────────────────────────────────────────────────────────────────
    # 1. Read and hash the file
    # ─────────────────────────────────────────────────────────────────────
    if not filepath.exists():
        print(f"ERROR: File not found: {filepath}", file=sys.stderr)
        sys.exit(1)

    content_hash = sha256_file(filepath)
    file_size = filepath.stat().st_size
    original_name = filepath.name

    # ─────────────────────────────────────────────────────────────────────
    # 2. Store raw bytes in content-addressed store
    # ─────────────────────────────────────────────────────────────────────
    OBJECTS_DIR.mkdir(parents=True, exist_ok=True)
    object_path = OBJECTS_DIR / content_hash

    if not object_path.exists():
        shutil.copy2(filepath, object_path)
        object_status = "CREATED"
    else:
        object_status = "EXISTS"

    # ─────────────────────────────────────────────────────────────────────
    # 3. Create EvidenceObject JSON
    # ─────────────────────────────────────────────────────────────────────
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

    evidence_id = generate_uuid()
    timestamp = timestamp_iso()
    doc_type = detect_document_type(original_name, content_hash)

    evidence_obj = {
        "schema_version": "1.0",
        "id": evidence_id,
        "type": "EvidenceObject",
        "created_at": timestamp,
        "content_hash": content_hash,
        "content_hash_algorithm": "SHA256",
        "object_path": f"objects/{content_hash}",
        "original_filename": original_name,
        "file_size_bytes": file_size,
        "label": label,
        "source": source,
        "document_type": doc_type,
        "court_relevance": court_relevance,
        "tags": tags or [],
        "custody_chain": [
            {
                "action": "INGESTED",
                "timestamp": timestamp,
                "actor": "CanonKit/ingest_evidence.py",
                "note": f"Initial ingestion from {source}"
            }
        ]
    }

    evidence_path = EVIDENCE_DIR / f"{evidence_id}.json"
    evidence_path.write_text(json.dumps(evidence_obj, indent=2, sort_keys=True))

    # ─────────────────────────────────────────────────────────────────────
    # 4. Create Event JSON
    # ─────────────────────────────────────────────────────────────────────
    EVENTS_DIR.mkdir(parents=True, exist_ok=True)

    event_data = {
        "schema_version": "1.0",
        "type": "Event",
        "event_type": "EVIDENCE_INGESTED",
        "timestamp": timestamp,
        "evidence_id": evidence_id,
        "content_hash": content_hash,
        "label": label,
        "source": source,
        "document_type": doc_type,
        "object_status": object_status
    }

    # Event hash is SHA256 of canonical JSON
    event_json = json.dumps(event_data, sort_keys=True, separators=(',', ':'))
    event_hash = sha256_bytes(event_json.encode('utf-8'))

    event_data["event_hash"] = event_hash

    event_path = EVENTS_DIR / f"{event_hash}.json"
    event_path.write_text(json.dumps(event_data, indent=2, sort_keys=True))

    # ─────────────────────────────────────────────────────────────────────
    # 5. Append to event log
    # ─────────────────────────────────────────────────────────────────────
    eventlog_path = EVENTS_DIR / "eventlog.txt"
    with open(eventlog_path, "a") as f:
        f.write(f"{event_hash}\n")

    # ─────────────────────────────────────────────────────────────────────
    # 6. Update and sign manifest
    # ─────────────────────────────────────────────────────────────────────
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = MANIFEST_DIR / "EVIDENCE_MANIFEST.json"

    # Load or create manifest
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        manifest["last_updated"] = timestamp
        manifest["evidence_count"] = manifest.get("evidence_count", 0) + 1
        manifest["evidence_ids"].append(evidence_id)
        manifest["event_hashes"].append(event_hash)
    else:
        manifest = {
            "schema_version": "1.0",
            "type": "EvidenceManifest",
            "created_at": timestamp,
            "last_updated": timestamp,
            "evidence_count": 1,
            "evidence_ids": [evidence_id],
            "event_hashes": [event_hash],
            "signing_key": "env.pub.pem",
            "lineage": "ROOT→ENV (DER-canonical)"
        }

    # Compute eventlog hash
    eventlog_hash = sha256_file(eventlog_path)
    manifest["eventlog_hash"] = eventlog_hash

    # Write manifest
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True))

    # Create hash file
    hash_path = create_manifest_hash(manifest_path)

    # Sign manifest
    sig_path = sign_manifest(manifest_path)

    # ─────────────────────────────────────────────────────────────────────
    # Return result
    # ─────────────────────────────────────────────────────────────────────
    result = {
        "status": "EVIDENCE_INGESTED",
        "evidence_id": evidence_id,
        "content_hash": content_hash,
        "event_hash": event_hash,
        "document_type": doc_type,
        "object_status": object_status,
        "artifacts": {
            "object": str(object_path.relative_to(CANON_ROOT)),
            "evidence": str(evidence_path.relative_to(CANON_ROOT)),
            "event": str(event_path.relative_to(CANON_ROOT)),
            "manifest": str(manifest_path.relative_to(CANON_ROOT)),
            "manifest_hash": str(hash_path.relative_to(CANON_ROOT)),
            "manifest_sig": str(sig_path.relative_to(CANON_ROOT))
        }
    }

    return result


def main():
    parser = argparse.ArgumentParser(
        description="CanonKit Evidence Ingestion Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s /path/to/document.pdf --label "Training Progress Report"
  %(prog)s invoice.pdf --label "CDL Invoice #123" --source "Email"
  %(prog)s court_order.pdf --label "Court Order" --court-relevance "Case 6183-2025"
        """
    )

    parser.add_argument("filepath", type=Path, help="Path to file to ingest")
    parser.add_argument("--label", "-l", required=True, help="Human-readable label/description")
    parser.add_argument("--source", "-s", default="Manual", help="Source of evidence (default: Manual)")
    parser.add_argument("--court-relevance", "-c", default="", help="Court case relevance")
    parser.add_argument("--tags", "-t", nargs="*", default=[], help="Tags for categorization")
    parser.add_argument("--json", "-j", action="store_true", help="Output only JSON (for scripting)")

    args = parser.parse_args()

    # Resolve filepath
    filepath = args.filepath.resolve()

    # Run ingestion
    result = ingest_evidence(
        filepath=filepath,
        label=args.label,
        source=args.source,
        court_relevance=args.court_relevance,
        tags=args.tags
    )

    # Output
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print()
        print("╔════════════════════════════════════════════════════════════════╗")
        print("║                    EVIDENCE_INGESTED                           ║")
        print("╚════════════════════════════════════════════════════════════════╝")
        print()
        print(json.dumps(result, indent=2))
        print()
        print("Verification command:")
        print("  ./orchestration/verify_evidence_manifest.sh")


if __name__ == "__main__":
    main()
