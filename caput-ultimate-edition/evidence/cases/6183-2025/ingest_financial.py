#!/usr/bin/env python3
"""
GENESIS Financial Document Ingestion Script
Case: 6183-2025 Bembrick
Purpose: Hash-anchor financial documents with court_relevance metadata

Usage:
    python ingest_financial.py

Outputs:
    - Updates financial/processed/index_financial.csv with SHA256 hashes
    - Preserves existing entries, adds new files from raw/
"""

import os
import csv
import hashlib
import datetime
from pathlib import Path

# Paths relative to this script's location
SCRIPT_DIR = Path(__file__).parent
RAW_DIR = SCRIPT_DIR / "financial" / "raw"
INDEX_CSV = SCRIPT_DIR / "financial" / "processed" / "index_financial.csv"

# Document type detection patterns
DOC_PATTERNS = {
    "Form13": {
        "type": "Form 13",
        "court_relevance": "Core financial disclosure to Court. Shows full financial position (income, assets, liabilities, superannuation)."
    },
    "Request_PatersonDowding": {
        "type": "Solicitor correspondence",
        "court_relevance": "Request to former solicitors for full client file and trust account records. Demonstrates diligence in financial accountability."
    },
    "CDL_Letter": {
        "type": "CDL correspondence",
        "court_relevance": "Correspondence from Child Dispute Lodge. Relevant to costs/financial strain context."
    },
    "LegalAid": {
        "type": "Legal Aid",
        "court_relevance": "Legal Aid application or correspondence. Shows exploration of financial relief options."
    },
    "PaymentArrangement": {
        "type": "Payment arrangement",
        "court_relevance": "Court fee payment arrangement. Demonstrates good faith efforts despite financial constraints."
    },
    "Invoice": {
        "type": "Legal invoice",
        "court_relevance": "Legal costs documentation. Relevant to financial burden and relief considerations."
    },
    "TrustAccount": {
        "type": "Trust account statement",
        "court_relevance": "Solicitor trust account records. Critical for financial accountability."
    }
}


def sha256_file(path: Path) -> str:
    """Calculate SHA256 hash of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def extract_date(filename: str) -> str:
    """Extract date from filename prefix (YYYY-MM-DD_...)."""
    parts = filename.split("_", 1)
    if parts:
        date_str = parts[0]
        try:
            datetime.date.fromisoformat(date_str)
            return date_str
        except ValueError:
            pass
    return ""


def detect_doc_type(filename: str) -> tuple[str, str]:
    """Detect document type and court relevance from filename."""
    for pattern, info in DOC_PATTERNS.items():
        if pattern in filename:
            return info["type"], info["court_relevance"]
    return "Financial document", "Financial context for relief/settlement considerations."


def load_existing_index() -> dict:
    """Load existing index entries by filename."""
    existing = {}
    if INDEX_CSV.exists():
        with open(INDEX_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                existing[row["Filename"]] = row
    return existing


def main():
    """Main ingestion routine."""
    fieldnames = [
        "Item_ID", "Filename", "Date", "Type", "Source",
        "SHA256", "court_relevance", "cross_refs"
    ]

    # Ensure directories exist
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_CSV.parent.mkdir(parents=True, exist_ok=True)

    # Load existing entries
    existing = load_existing_index()
    rows = []
    new_count = 0
    updated_count = 0

    # Process files in raw directory
    if RAW_DIR.exists():
        for name in sorted(os.listdir(RAW_DIR)):
            path = RAW_DIR / name
            if not path.is_file():
                continue

            # Calculate hash
            sha = sha256_file(path)

            if name in existing:
                # Update hash if file changed
                row = existing[name]
                if row.get("SHA256") != sha:
                    row["SHA256"] = sha
                    updated_count += 1
                    print(f"  [UPDATED] {name}")
                rows.append(row)
                continue

            # New file - extract metadata
            date_str = extract_date(name)
            doc_type, court_rel = detect_doc_type(name)
            item_id = f"FIN-{date_str}-{sha[:8]}" if date_str else f"FIN-{sha[:8]}"

            rows.append({
                "Item_ID": item_id,
                "Filename": name,
                "Date": date_str,
                "Type": doc_type,
                "Source": "MAB local archive",
                "SHA256": sha,
                "court_relevance": court_rel,
                "cross_refs": ""
            })
            new_count += 1
            print(f"  [NEW] {name} -> {item_id}")

    # Also preserve entries for files not yet in raw/ (placeholders)
    for name, row in existing.items():
        if name not in [r["Filename"] for r in rows]:
            rows.append(row)

    # Sort by date
    rows.sort(key=lambda r: r.get("Date", "") or "9999")

    # Write updated index
    with open(INDEX_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    print(f"\n  Financial Index: {INDEX_CSV}")
    print(f"  Total entries: {len(rows)}")
    print(f"  New files: {new_count}")
    print(f"  Updated: {updated_count}")
    print(f"  Hash-anchored and ready for Claude.")


if __name__ == "__main__":
    print("\n  GENESIS Financial Document Ingestion")
    print("  " + "=" * 40)
    main()
