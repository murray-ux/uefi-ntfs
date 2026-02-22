# Case 6183-2025 - Financial Relief Engine

## Structure

```
6183-2025/
├── README.md                 # This file
├── ingest_financial.py       # Document ingestion script
└── financial/
    ├── raw/                  # Drop original documents here
    │   └── (PDF, MD files)
    └── processed/
        ├── index_financial.csv           # Hash-anchored document index
        └── relief_options_considered.yaml # Relief options tracker
```

## Usage

### 1. Add Documents

Copy financial documents to `financial/raw/` with naming convention:
```
YYYY-MM-DD_Description_Type.ext
```

Examples:
- `2025-11-10_Form13_MABembrick.pdf`
- `2026-02-10_Request_PatersonDowding_ClientFile.md`
- `2026-02-15_LegalAid_Application.pdf`

### 2. Run Ingestion

```sh
cd evidence/cases/6183-2025
python ingest_financial.py
```

This will:
- Calculate SHA256 hash for each document
- Auto-detect document type from filename
- Update `index_financial.csv` with metadata
- Preserve existing entries

### 3. Document Types Detected

| Pattern in Filename | Type | Court Relevance |
|---------------------|------|-----------------|
| `Form13` | Form 13 | Core financial disclosure |
| `Request_PatersonDowding` | Solicitor correspondence | Trust account records |
| `CDL_Letter` | CDL correspondence | Costs/financial strain |
| `LegalAid` | Legal Aid | Financial relief options |
| `PaymentArrangement` | Payment arrangement | Good faith efforts |
| `Invoice` | Legal invoice | Financial burden |
| `TrustAccount` | Trust account statement | Financial accountability |

### 4. View in Genesis

The Financial Relief Tracker is integrated into the Genesis Control Panel at:
```
static/genesis-control.html
```

## Index Fields

| Field | Description |
|-------|-------------|
| `Item_ID` | Unique identifier (FIN-DATE-HASH) |
| `Filename` | Document filename |
| `Date` | Document date (from filename) |
| `Type` | Document type |
| `Source` | Archive source |
| `SHA256` | Full hash for integrity verification |
| `court_relevance` | Why this matters for the case |
| `cross_refs` | Links to related documents |

## Relief Options YAML

The `relief_options_considered.yaml` tracks:
- All financial relief options explored
- Status (completed, pending, not_started)
- Court relevance for each option
- Linked documents

This demonstrates diligence and good faith in exploring all available options.
