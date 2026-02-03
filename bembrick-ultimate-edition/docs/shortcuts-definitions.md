# GENESIS Document Automation — Shortcuts Definitions

> Import Guide for iOS/macOS Shortcuts App
>
> These definitions describe each shortcut's logic.
> Create each shortcut manually in the Shortcuts app using these specifications.

**Author:** Murray Bembrick
**Version:** 1.0.0
**Date:** 2026-01-30

---

## SHORTCUT 1: "Finish the Job"

**Siri Trigger:** "Finish the job"
**Description:** Master orchestrator for complete document processing pipeline

### ACTIONS:

1. Run Shortcut "Intake — Collect"
2. Run Shortcut "Classifier — Route (Pro)"
3. Choose from Menu:
   - Title: "Generate Pack?"
   - Options:
     - "Legal Binder" → Run Shortcut "Binder — Legal Pack"
     - "Finance Pack" → Run Shortcut "Finance — Pack"
     - "ATO Pack" → Run Shortcut "ATO — Pack"
     - "Trust Pack" → Run Shortcut "Trust — Pack"
     - "Health Pack" → Run Shortcut "Health — Pack"
     - "Done" → Nothing (exit)
4. Show Result: "Processing complete."

---

## SHORTCUT 2: "Intake — Collect"

**Description:** Collects files from iPhone apps, standardises naming, moves to Vault

### ACTIONS:

1. **Find Files:**
   - Location: "On My iPhone"
   - Include Subfolders: Yes
   - Sort by: Date Modified
   - Order: Latest First
   - Limit: No limit

2. **Repeat with Each Item:**

   a. Get Details of File:
      - Name
      - Extension
      - Date Modified
      - File Size

   b. Format Date (Date Modified):
      - Format: "yyyy-MM-dd_HH-mm-ss"
      - Save to variable: FormattedDate

   c. Text:
      - Content: "[FormattedDate]_[File Size]-[Name].[Extension]"
      - Save to variable: NewName

   d. Rename File:
      - Name: [NewName]
      - If Exists: Replace

   e. Move File:
      - To: "iCloud Drive/Shortcuts/Vault/Intake/From-iPhone"

3. **Show Notification:**
   - Title: "Intake Complete"
   - Body: "Moved [Repeat Count] files to Intake"

---

## SHORTCUT 3: "Classifier — Route (Pro)"

**Description:** Routes documents using rules, keywords, and AI fallback

### ACTIONS:

1. Get File: "iCloud Drive/Shortcuts/Config/routes.json"
2. Get Dictionary from Input → Save as "Routes"
3. Get File: "iCloud Drive/Shortcuts/Config/keywords.json"
4. Get Dictionary from Input → Save as "Keywords"
5. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/Intake/From-iPhone"
   - Include Subfolders: Yes

6. **Repeat with Each File:**

   a. Make Text from Input (OCR / Extract Text)
      - Save to variable: DocText

   b. Set Variable: Category = "unsorted"

   c. Set Variable: Matched = "No"

   **STEP 1: Check Rules (highest priority)**

   d. Repeat with Each item in Routes["rules"]:
      - If DocText contains item["contains"][0]:
        - Set Variable: Category = item["dest"]
        - Set Variable: Matched = "Yes"
        - Exit Repeat

   **STEP 2: Check Keywords (if no rule matched)**

   e. If Matched = "No":
      - Repeat with Each item in Keywords["priority_order"]:
        - Get Dictionary Value: Keywords["keywords"][item]
        - Repeat with Each keyword:
          - If DocText contains keyword:
            - Set Variable: Category = Keywords["folder_structure"]["categories"][item]
            - Set Variable: Matched = "Yes"
            - Exit Repeat (both loops)

   **STEP 3: AI Fallback (if still unsorted)**

   f. If Category = "unsorted":
      - Run Script over SSH:
        - Host: "mac-local" (configure in Settings)
        - User: Your Mac username
        - Command: `echo '[DocText base64 encoded]' | base64 -d | ~/bin/booster.sh`
      - Get Dictionary from Input → AIResult
      - If AIResult["confidence"] > 0.7:
        - Set Variable: Category = AIResult["category"]
        - Get Dictionary Value: Routes["folder_structure"]["categories"][Category]
        - Set Variable: Category = Result

   **STEP 4: Move File**

   g. Move File:
      - To: "iCloud Drive/Shortcuts/Vault/[Category]"
      - If Exists: Keep Both

   **STEP 5: Log**

   h. Get Current Date (Format: "yyyy-MM-dd")

   i. Append to File:
      - File: "iCloud Drive/Shortcuts/Vault/Logs/Classifier-[Date].log"
      - Text: "[Time] file=\"[Filename]\" category=[Category]"

7. **Show Notification:**
   - Title: "Classification Complete"
   - Body: "Processed [Repeat Count] files"

---

## SHORTCUT 4: "Binder — Legal Pack"

**Description:** Generates court-ready PDF bundle with table of contents

### ACTIONS:

1. Ask for Input:
   - Prompt: "Case name?"
   - Default: "Family-PTW6183-2025"
   - Save to variable: CaseName

2. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/Legal/[CaseName]"
   - Include Subfolders: Yes
   - Filter: Extension is "pdf"
   - Sort by: Name
   - Save to variable: Files

3. Set Variable: TOC_Lines = ""

4. Repeat with Each File in Files:
   - Text: "[Repeat Index]. [File Name]"
   - Add to Variable: TOC_Lines (with newline)

5. Combine Text: TOC_Lines
   - Separator: Newline

6. Make PDF from Text → Save as TOC.pdf

7. Combine PDFs:
   - Input: [TOC.pdf, then all Files in order]

8. Get Current Date (Format: "yyyy-MM-dd")

9. Save File:
   - To: "iCloud Drive/Shortcuts/Vault/Legal/[CaseName]/Binder/[Date] – [CaseName] – Binder.pdf"

10. Quick Look: Combined PDF

11. Share Sheet (optional)

---

## SHORTCUT 5: "Finance — Pack"

**Description:** Bundles recent financial documents

### ACTIONS:

1. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/Finance/BankStatements"
   - Filter: Date Modified is in the last 90 days

2. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/Finance/Invoices"
   - Filter: Date Modified is in the last 90 days

3. Combine both lists

4. Get Current Date (Format: "yyyy-MM")

5. Make Archive:
   - Format: ZIP
   - Name: "Finance-Pack-[Date].zip"

6. Share Sheet

---

## SHORTCUT 6: "ATO — Pack"

**Description:** Bundles ATO documents for a specific period

### ACTIONS:

1. Ask for Input:
   - Prompt: "Period (e.g., 2024-25 or Q2-2025)"
   - Save to variable: Period

2. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/ATO/Notices"

3. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/ATO/BAS"

4. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/ATO/IAS"

5. Combine all lists

6. Make Archive:
   - Format: ZIP
   - Name: "ATO-Pack-[Period].zip"

7. Share Sheet

---

## SHORTCUT 7: "Trust — Pack"

**Description:** Bundles trust documentation

### ACTIONS:

1. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/Trust/Deeds"
   - Limit: Most recent 1

2. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/Trust/Distributions"
   - Filter: Date Modified is in the last 365 days

3. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/Trust/BembrickFamilyTrust"

4. Combine all lists

5. Get Current Date (Format: "yyyy")
   - Calculate: Current FY (July to June)

6. Make Archive:
   - Format: ZIP
   - Name: "Trust-Pack-FY[Year].zip"

7. Share Sheet

---

## SHORTCUT 8: "Health — Pack"

**Description:** Bundles health documents for a date range

### ACTIONS:

1. Ask for Input:
   - Prompt: "From date (YYYY-MM-DD)"
   - Save to variable: FromDate

2. Ask for Input:
   - Prompt: "To date (YYYY-MM-DD)"
   - Save to variable: ToDate

3. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/Health/Referrals"
   - Filter: Date Modified between FromDate and ToDate

4. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/Health/Results"
   - Filter: Date Modified between FromDate and ToDate

5. Get Contents of Folder:
   - Path: "iCloud Drive/Shortcuts/Vault/Health/Claims"
   - Filter: Date Modified between FromDate and ToDate

6. Combine all lists

7. Make Archive:
   - Format: ZIP
   - Name: "Health-Pack-[FromDate]_[ToDate].zip"

8. Share Sheet

---

## SSH Configuration Note

For the AI Fallback in "Classifier — Route (Pro)" to work:

### On your Mac:

1. System Settings → General → Sharing → Remote Login: **ON**
2. Note your Mac's local IP or hostname

### On your iPhone:

1. Settings → Shortcuts → Advanced → **Allow Running Scripts**
2. The SSH host in the shortcut should be your Mac's IP/hostname

### First Connection:

First-time SSH will require password; subsequent uses key-based auth.

---

## Vault Folder Structure

```
iCloud Drive/
└── Shortcuts/
    ├── Config/
    │   ├── routes.json
    │   └── keywords.json
    └── Vault/
        ├── Intake/
        │   └── From-iPhone/
        ├── Legal/
        │   └── [CaseName]/
        │       └── Binder/
        ├── Finance/
        │   ├── BankStatements/
        │   └── Invoices/
        ├── ATO/
        │   ├── Notices/
        │   ├── BAS/
        │   └── IAS/
        ├── Trust/
        │   ├── Deeds/
        │   ├── Distributions/
        │   └── BembrickFamilyTrust/
        ├── Health/
        │   ├── Referrals/
        │   ├── Results/
        │   └── Claims/
        ├── Logs/
        └── unsorted/
```
