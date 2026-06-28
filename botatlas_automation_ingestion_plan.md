# BotAtlas — Auto-Ingestion & Intelligent Parsing Plan
## Reducing Manual Data Entry to Near Zero

> **Core Problem:** Manually documenting each bot's steps, dependencies, and metadata requires an analyst to open every bot, understand it, and type everything in. With 50+ bots this is weeks of work.  
> **Goal:** Auto-extract 80–90% of data from artifacts that already exist (PAD exports, scripts, BRDs, emails).

---

## 🏗️ Architecture Overview

```
Existing Artifacts                   Auto-Ingestion Layer              BotAtlas DB
─────────────────────               ────────────────────────          ────────────
PAD Solution (.zip)   ──►  PAD Parser ──────────────────────►
Robin Script (.robin) ──►  Robin Lexer ───────────────────────►  Bot + Steps +
Excel/CSV Intake      ──►  Smart Mapper ──────────────────────►  Dependencies +
BRD / SOP (Word/PDF)  ──►  Doc Parser + AI ──────────────────►  Findings +
Power Platform API    ──►  Live Sync Connector ───────────────►  Components
Email Intake          ──►  Email Parser ───────────────────────►
Natural Language      ──►  AI Intake Chat ──────────────────►
```

---

## Feature A1 — PAD Solution ZIP Parser ⭐ (Highest Priority)

### What is a PAD Export?
When you export a PAD solution, you get a `.zip` file containing:
```
MySolution.zip
├── Flows/
│   ├── MainFlow/
│   │   ├── flow.json        ← Full action graph with all steps
│   │   └── metadata.json    ← Flow name, version, created date
│   └── SubFlow_SFTP/
│       ├── flow.json
│       └── metadata.json
├── Assets/
│   └── UIElements/          ← All captured UI selectors
│       └── ui_elements.json
└── manifest.json            ← Solution-level metadata
```

### What PAD `flow.json` Contains
Each action in PAD's flow.json looks like:
```json
{
  "id": "uuid-1234",
  "module": "WebBrowser",
  "action": "LaunchBrowser",
  "parameters": {
    "URL": "https://npci.org.in/portal",
    "BrowserType": "Chrome"
  },
  "errorHandling": { "enabled": true, "retries": 3 },
  "label": "Open NPCI Portal"
}
```

### Automatic Extraction Mapping

| PAD Module / Action | → BotAtlas `ActionType` | → Dependency Type |
|---------------------|------------------------|------------------|
| `WebBrowser.LaunchBrowser` | `PORTAL_LOGIN` | `PORTAL` |
| `WebBrowser.NavigateTo` | `BROWSER_NAVIGATION` | `BROWSER` |
| `FTP.DownloadFiles` | `SFTP_DOWNLOAD` | `SFTP` |
| `FTP.UploadFiles` | `SFTP_UPLOAD` | `SFTP` |
| `Excel.OpenSpreadsheet` | `EXCEL_READ` | — |
| `Excel.WriteToCell` | `EXCEL_WRITE` | — |
| `Database.ExecuteStatement` | `DATABASE_QUERY` | `DATABASE` |
| `Email.SendEmail` | `EMAIL_SEND` | — |
| `MicrosoftTeams.*` | `TEAMS_NOTIFICATION` | — |
| `HTTP.InvokeWebService` | `API_CALL` | `API` |
| `Compression.ZipFiles` | `FILE_ARCHIVE` | — |
| `Scripting.RunPowerShell` | `OTHER` | — |
| `UIAutomation.*` | `BROWSER_NAVIGATION` | `APPLICATION` |
| Any `Try/Catch` block | → auto-set checklist `errorHandlingPresent: YES` |
| Any retry loop | → auto-set checklist `retryLogicPresent: YES` |
| Any hardcoded path literal | → auto-flag `hardcodedFilePaths: YES` |

### What Gets Auto-Populated
After parsing one PAD `.zip`:

| BotAtlas Field | Source | Confidence |
|---------------|--------|------------|
| `bot.name` | `manifest.json > solutionName` | 🟢 Exact |
| `bot.technology` | Always `PAD` | 🟢 Exact |
| `BotStep[]` (all steps) | `flow.json > actions[]` | 🟢 ~90% |
| `BotStep.actionType` | Module→ActionType map | 🟢 ~85% |
| `BotStep.systemName` | Extracted from URL/parameter | 🟡 ~70% |
| `BotStep.description` | Action `label` field | 🟢 ~95% |
| `Dependency[]` (PORTAL, SFTP, DB) | URL/path parameters | 🟡 ~75% |
| `checklist.errorHandlingPresent` | Try/Catch detection | 🟢 Exact |
| `checklist.retryLogicPresent` | Loop/retry detection | 🟢 Exact |
| `checklist.hardcodedFilePaths` | String literal path scan | 🟢 ~90% |
| `checklist.usesUISelectors` | UIAutomation actions present | 🟢 Exact |
| `checklist.usesReusableSubflows` | Subflow count > 0 | 🟢 Exact |
| `Component[]` candidates | Subflows used in multiple flows | 🟡 ~80% |

### Implementation Plan

**New API Route:** `POST /api/bots/import/pad`  
**New UI:** Upload tab on Bot Registry page — "Import from PAD Solution (.zip)"

```
Step 1: Upload .zip → server
Step 2: Extract zip in memory (Node.js built-in 'zlib' + stream)
Step 3: Parse manifest.json → bot metadata
Step 4: For each flow.json → parse action array
Step 5: Map each action to ActionType via lookup table
Step 6: Extract URLs from Browser actions → Dependency(PORTAL)
Step 7: Extract FTP hosts from FTP actions → Dependency(SFTP)
Step 8: Scan string literals for file paths → flag checklist
Step 9: Detect Try/Catch, retry loops → set checklist values
Step 10: Create bot + steps + dependencies in transaction
Step 11: Return preview before committing (user confirms)
```

**Key library:** Node.js built-in `zlib` + `stream` (zero new deps)  
Or: `adm-zip` (tiny, 50KB) for easier API

---

## Feature A2 — Robin Script (.robin) Lexer/Parser

### What is Robin?
Power Automate Desktop uses the **Robin scripting language** — a readable text format. You can copy the entire flow as Robin from PAD's "Edit flow" → "View code".

Example Robin script:
```robin
WebBrowser.LaunchBrowser.Chrome Url: $'''https://npci.org.in''' BrowserInstance=> BrowserInstance
WebBrowser.Click BrowserInstance: BrowserInstance Control: appcredential['Button_Login']
File.Download Url: $'''https://npci.org.in/report.xlsx''' Destination: $'''C:\Reports\'''
Excel.LaunchExcel.AndOpenDocument DocumentPath: $'''C:\Reports\report.xlsx''' ExcelInstance=> ExcelInstance
FTP.UploadFiles.ToDirectory FTPConnection: FTPConnection LocalFiles: $'''C:\Reports\report.xlsx'''
Email.Send.Mail SMTPServer: $'''smtp.mybank.com''' To: $'''ops@mybank.com'''
```

### Parser Logic
A simple line-by-line lexer (no external parser needed):
```
For each line:
  1. Extract module name (before first dot)
  2. Extract action name (between dots)
  3. Extract key parameters (named: value format)
  4. Map to ActionType via lookup table
  5. Extract URL/path string literals → Dependencies
  6. Detect error handling keywords (ON BLOCK ERROR, Retry)
```

**New UI:** Dedicated "Paste Robin Script" textarea in the import dialog  
**New API Route:** `POST /api/bots/import/robin`

**Advantage over ZIP:** Much faster — no file export needed; user just copies code from PAD editor directly.

---

## Feature A3 — Power Platform REST API Live Sync

### What This Enables
Instead of exporting and uploading, BotAtlas connects **directly to the Power Platform environment** and pulls flow data automatically.

### How It Works
```
1. Admin inputs Power Platform tenant ID + environment ID + service principal credentials
2. BotAtlas calls: GET https://api.powerautomate.com/providers/Microsoft.ProcessSimple/
                          environments/{env}/flows?api-version=2016-11-01
3. Gets list of all PAD flows with metadata
4. For each flow: GET /flows/{flowId}/versions/latest  → full definition JSON
5. Parse and create/update bot records
6. Run on schedule (daily sync) or on-demand
```

### What the API Returns
- Flow name, description, created/modified dates
- Trigger type (scheduled, manual, automated)
- Last run time → `bot.lastKnownRunAt`
- Run history → failure detection → `bot.currentStatus: FAILED`
- Full action definition (same as flow.json in zip)
- Creator → `bot.technicalOwner`

### Implementation
**New Settings Page:** `/dashboard/admin/integrations`  
```
[ Power Platform Integration ]
Tenant ID: _________________
Environment ID: _____________
Client ID: _________________
Client Secret: _______________ (stored encrypted)
[Test Connection] [Save] [Sync Now]
Auto-sync: Daily at 2:00 AM [✓]
```

**New API Route:** `POST /api/integrations/power-platform/sync`  
**New Schema Fields:**
```prisma
model Bot {
  // ... existing fields
  externalId        String?    // Power Platform flow ID
  externalSource    String?    // "POWER_PLATFORM", "UIPATH", "BLUE_PRISM"
  lastSyncedAt      DateTime?
  syncStatus        String?    // "SYNCED", "DRIFT_DETECTED", "ERROR"
}
```

**Drift Detection:** If a flow is updated in Power Platform after it was reviewed in BotAtlas, flag it as `DRIFT_DETECTED` → trigger re-review workflow.

---

## Feature A4 — BRD / SOP Document Auto-Parser

### Problem
Most bots were built from a BRD (Business Requirements Document) or SOP. These documents describe the process in plain English — which is exactly what `BotStep.description` needs.

### Implementation Options

#### Option A: Word Document (.docx) Parser
Parse numbered lists and tables from `.docx` files:
```
Input (from BRD):
"Step 1: Login to NPCI portal using service account credentials
 Step 2: Navigate to Reports > Daily Reconciliation
 Step 3: Download the T-1 reconciliation file (XLSX format)
 Step 4: Validate file: check row count > 0 and date matches T-1"

Output:
Step 1 → actionType: PORTAL_LOGIN, description: "Login to NPCI portal", systemName: "NPCI Portal"
Step 2 → actionType: BROWSER_NAVIGATION, description: "Navigate to Reports > Daily Reconciliation"
Step 3 → actionType: FILE_DOWNLOAD, description: "Download T-1 reconciliation file"
Step 4 → actionType: FILE_VALIDATION, description: "Validate file row count and date"
```

**Library:** `mammoth` (converts .docx to plain text, tiny, no native deps)

#### Option B: AI-Powered Extraction (with any LLM API)
Send the document text to an LLM with a structured prompt:
```
Prompt: "Extract the process steps from this BRD as JSON array with fields:
stepOrder, description, actionType (from: PORTAL_LOGIN, BROWSER_NAVIGATION, 
FILE_DOWNLOAD, ...), systemName, inputType, outputType"

BRD text: [pasted or uploaded content]
```

Returns a ready-to-import JSON that user reviews before committing.

**Supported inputs:** `.docx`, `.pdf` (via `pdf-parse`), plain text paste

---

## Feature A5 — AI Natural Language Bot Intake

### "Describe Your Bot" → Structured Record

A guided chat interface inside the "Add Bot" flow:

```
BotAtlas AI: Tell me about this bot. What does it do?

User: It logs into the NPCI portal every morning at 6 AM, downloads the 
daily reconciliation file, validates it, runs a macro on the Excel file,
uploads the output to the bank SFTP, and sends a Teams notification.

BotAtlas AI: Got it. I've identified:
  ✅ 6 process steps
  ✅ 3 dependencies: NPCI Portal (PORTAL), Bank SFTP (SFTP), Excel (APPLICATION)
  ✅ Schedule: Daily 6:00 AM
  ✅ Technology: PAD (assumed)
  
  Do you want to review and save this?
  [ Preview & Edit ] [ Save Directly ]
```

**Implementation:**
- Use OpenAI / Azure OpenAI / Google Gemini API (user provides their own key)
- Structured output mode (JSON response with schema enforcement)
- Falls back gracefully if no API key configured
- Preview modal lets user edit before committing

**New Setting:** API key input in `/dashboard/admin/settings`

---

## Feature A6 — Standardized Excel Intake Template

### Enhanced Version of Current Excel Import

The current import is basic. This enhancement adds:

1. **Downloadable Template:** "Download Template" button generates a pre-formatted `.xlsx` with:
   - Sheet 1: `Bots` — all bot metadata columns with dropdown validation
   - Sheet 2: `Steps` — step columns with ActionType dropdown list
   - Sheet 3: `Dependencies` — dependency columns with DependencyType dropdown
   - Sheet 4: `Findings` — pre-populate known findings
   - Sheet 5: `Instructions` — field-by-field guide with examples

2. **Smart Column Mapper:** When uploading a non-template Excel, show a visual drag-and-drop column mapper:
   ```
   Your columns:      Maps to:
   "Bot Name"    →   [ name          ▼ ]
   "Owner"       →   [ businessOwner ▼ ]
   "Status"      →   [ currentStatus ▼ ]
   "Team"        →   [ department    ▼ ]
   "Criticality" →   [ criticality   ▼ ] ✅ auto-detected
   ```

3. **Validation Preview:** Before import, show a table of what will be created with any warnings highlighted (e.g., unknown status value, duplicate name).

---

## Feature A7 — UiPath / Blue Prism / Automation Anywhere Parsers

### UiPath (.xaml / Package)
UiPath exports packages as `.nupkg` (which is a zip) containing `.xaml` files.  
`.xaml` is XML — easy to parse:
```xml
<Activity DisplayName="Click Login Button" sap:VirtualizedContainerService.HintSize="...">
  <uiaut:Click DisplayName="Click 'Login'" Selector="..." />
</Activity>
```
Extract: `DisplayName` → step description, activity type → ActionType mapping.

### Blue Prism (.bprelease)
Blue Prism releases are XML-based. Parse `<stage type="Action">` blocks.

### Automation Anywhere (.bot)
AA exports are JSON-based. Parse `"commandType"` and `"label"` fields.

**Architecture:** Plugin-based parser system:
```typescript
interface BotParser {
  name: string;
  accepts: (filename: string) => boolean;  // file extension check
  parse: (buffer: Buffer) => ParsedBot;    // returns standardized format
}

const parsers: BotParser[] = [
  PADParser,        // .zip with flow.json
  RobinParser,      // .robin text
  UiPathParser,     // .nupkg / .xaml
  BluePrismParser,  // .bprelease
  AAParser,         // .bot JSON
  ExcelParser,      // .xlsx template
  JsonParser,       // generic JSON
];
```

A single `POST /api/bots/import/auto` endpoint that auto-detects the parser.

---

## Feature A8 — Import Preview & Diff UI

### The Problem with Silent Imports
Current import just creates records. Users can't see what's being created, catch errors, or selectively import parts.

### Import Preview Modal

After parsing any file format, show a rich preview **before** any DB write:

```
┌─────────────────────────────────────────────────────────┐
│  Import Preview — NPCI_Reconciliation.zip               │
│  Detected: PAD Solution · 1 bot · 12 steps · 3 deps     │
├─────────────────────────────────────────────────────────┤
│  🤖 Bot Details                                          │
│  Name: NPCI Daily Reconciliation        [Edit]           │
│  Technology: PAD  Status: UNKNOWN       [Edit]           │
│  Department: ___________                [Edit]           │
├─────────────────────────────────────────────────────────┤
│  📋 12 Process Steps                    [View All]       │
│  ✅ Step 1: Launch Chrome - NPCI Portal                  │
│  ✅ Step 2: Login with service account                   │
│  ✅ Step 3: Navigate to Reports section                  │
│  ⚠️  Step 4: (no label found) — HTTP Action  [Edit]     │
│  ...                                                     │
├─────────────────────────────────────────────────────────┤
│  🔗 3 Dependencies (Auto-detected)                       │
│  ✅ NPCI Portal (PORTAL) — https://npci.org.in           │
│  ✅ Bank SFTP (SFTP) — sftp.mybank.com                   │
│  ⚠️  C:\Reports\ (FOLDER) — hardcoded path detected!    │
├─────────────────────────────────────────────────────────┤
│  ✅ Checklist Auto-Fills                                  │
│  errorHandlingPresent: YES (3 try/catch blocks found)    │
│  retryLogicPresent: YES (retry loop on step 7)           │
│  hardcodedFilePaths: YES ⚠️ (C:\Reports\ literal)       │
│  usesUISelectors: YES (UIAutomation actions detected)    │
├─────────────────────────────────────────────────────────┤
│  ⚠️  2 Auto-Generated Findings                           │
│  🔴 CRITICAL: Hardcoded file path detected (C:\Reports\) │
│  🟠 HIGH: No logging actions found in flow               │
├─────────────────────────────────────────────────────────┤
│  [ Cancel ]              [ Edit & Import ] [ Import ✓ ] │
└─────────────────────────────────────────────────────────┘
```

---

## Feature A9 — Auto-Generate Findings from Parse Results

When parsing any bot source (PAD zip, Robin, XAML, etc.), automatically flag known issues as draft findings:

| Detected Pattern | Auto-Generated Finding |
|-----------------|----------------------|
| Hardcoded `C:\` or `D:\` path | 🔴 CRITICAL · SECURITY — "Hardcoded file path detected" |
| Hardcoded URL with credentials | 🔴 CRITICAL · SECURITY — "Credentials in URL detected" |
| No Try/Catch block | 🟠 HIGH · ERROR_HANDLING — "No error handling found" |
| No logging action | 🟡 MEDIUM · GOVERNANCE — "No logging mechanism found" |
| Flow with no subflows (>20 steps) | 🟡 MEDIUM · MAINTAINABILITY — "Monolithic flow, no reuse" |
| Screen coordinate actions | 🟡 MEDIUM · MAINTAINABILITY — "Uses fragile screen coordinates" |
| No output validation | 🟡 MEDIUM · DATA — "No output validation found" |
| Hardcoded credentials string | 🔴 CRITICAL · SECURITY — "Possible hardcoded credentials" |

These appear in the Import Preview as **draft findings** — user approves/dismisses before import.

---

## Feature A10 — Subflow-to-Component Auto-Registration

### The Insight
PAD subflows = exactly what our `Component` model represents.  
If the same subflow exists in 3+ different PAD solutions → it's a reusable component.

### Automatic Detection
During PAD ZIP import:
1. Extract each subflow with its canonical signature (action types + structure)
2. Check if a matching component signature already exists in `Component` table
3. If yes → create `StepComponentMap` linking to existing component
4. If no → create a new `Component` record with status `CANDIDATE`
5. After importing multiple solutions → run cross-solution subflow clustering
6. Show in Component Catalog's "Auto-Discovery" tab (already exists!)

This feeds directly into the existing **Component Catalog → Auto-Discovery** feature.

---

## Feature A11 — Bot "Refresh" / Re-Sync on Re-Upload

### Problem
When a bot is updated in PAD (new steps added, steps removed), the BotAtlas record goes stale.

### Solution
When a PAD file is uploaded and BotAtlas detects an **existing bot** with the same name:

```
┌───────────────────────────────────────────────────────┐
│  ⚠️  Bot Already Exists: NPCI Reconciliation (BOT-007) │
│                                                        │
│  DIFF DETECTED:                                        │
│  + Step 13: NEW — Send failure alert to Teams          │
│  ~ Step 4:  CHANGED — "Download file" label updated    │
│  - Step 11: REMOVED — "Manual validation step"         │
│                                                        │
│  Other data (findings, checklist) will be preserved.   │
│  Review status will be reset to IN_PROGRESS.           │
│                                                        │
│  [ Cancel ] [ Import as New Bot ] [ Update Existing ✓ ]│
└───────────────────────────────────────────────────────┘
```

This creates an **automatic changelog** and resets the review status — ensuring reviewed bots don't go stale silently.

---

## Feature A12 — Email-Based Bot Intake

### For Non-Technical Team Members
Operations team members who manage bots but don't use the UI can submit via email:

```
To: botatlas-intake@yourorg.com
Subject: [NEW BOT] NPCI Daily Reconciliation

Bot Name: NPCI Daily Reconciliation
Department: Treasury Operations  
Owner: Priya Sharma
Vendor: TCS
Technology: PAD
Criticality: HIGH
Description: Downloads daily reconciliation file from NPCI portal,
             validates data, uploads to bank SFTP, sends notification.

[Attachment: NPCI_Recon.zip]  ← optional PAD export
```

BotAtlas polls the mailbox (via IMAP or Microsoft Graph API), parses the email, and:
1. Creates the bot record from email body fields
2. If ZIP attached → runs PAD parser
3. Sends confirmation reply with the new BOT code

---

## Feature A13 — Chrome Extension / Browser Companion

### For Bots That Involve Web Portals
A lightweight Chrome extension that:
1. Records which URLs the user visits during a bot execution
2. Captures page titles and actions
3. Exports a simplified step log:
   ```json
   [
     { "action": "navigate", "url": "https://npci.org.in", "title": "NPCI Portal" },
     { "action": "click", "element": "Login Button" },
     { "action": "download", "filename": "recon_20260628.xlsx" }
   ]
   ```
4. "Send to BotAtlas" button → auto-creates steps from the recording

---

## Feature A14 — Version Control for Bot Definitions

### Track Changes Over Time
Every time a bot's steps change (re-import, manual edit), create a version snapshot:

```prisma
model BotVersion {
  id          String   @id @default(cuid())
  botId       String
  version     String   // "1.0", "1.1", "2.0"
  snapshot    Json     // full bot+steps at that moment
  changeLog   String?  // what changed
  createdBy   String?
  createdAt   DateTime @default(now())
  
  bot         Bot      @relation(fields: [botId], references: [id])
}
```

UI: "Version History" tab on bot detail — see step diffs between versions, roll back to a previous version.

---

## 🗺️ Combined Roadmap (Existing + New)

### Phase 1 — Foundation (Weeks 1–4)
**From existing plan:** Toast, Sorting, Pagination, Export Excel  
**From new plan:** Robin script paste parser (A2) · Intake template download (A6) · Import Preview UI (A8)

### Phase 2 — Core Automation (Weeks 5–8)
**New:** PAD ZIP Parser (A1) · Auto-generate findings from parse (A9) · Subflow→Component auto-registration (A10)  
**Existing:** Evidence upload, Bot cloning, Audit log

### Phase 3 — Intelligence (Weeks 9–12)
**New:** AI Natural Language Intake (A5) · BRD document parser (A4) · Bot refresh / diff on re-upload (A11)  
**Existing:** Command palette, Health score, Notification center

### Phase 4 — Integrations (Weeks 13–16)
**New:** Power Platform API Live Sync (A3) · UiPath/Blue Prism parsers (A7) · Version control (A14)  
**Existing:** User management, Kanban remediation

### Phase 5 — Advanced (Weeks 17–20)
**New:** Email intake (A12) · Chrome extension (A13)  
**Existing:** Bot comparison view, Dependency graph

---

## ⚡ Implementation Priority for New Features

| Feature | Impact | Effort | Priority |
|---------|--------|--------|---------|
| A2 — Robin script paste parser | 🔴 Very High | 🟢 Low | **P0** |
| A8 — Import preview modal | 🔴 Very High | 🟡 Medium | **P0** |
| A6 — Excel template + mapper | 🔴 High | 🟢 Low | **P0** |
| A1 — PAD ZIP parser | 🔴 Very High | 🟡 Medium | **P1** |
| A9 — Auto-generate findings | 🔴 High | 🟢 Low | **P1** |
| A10 — Subflow→Component | 🟠 Medium | 🟡 Medium | **P1** |
| A11 — Bot refresh / diff | 🔴 High | 🟡 Medium | **P1** |
| A5 — AI NL intake | 🟠 Medium | 🟡 Medium | **P2** |
| A4 — BRD document parser | 🟠 Medium | 🟡 Medium | **P2** |
| A3 — Power Platform API sync | 🔴 High | 🔴 High | **P2** |
| A7 — UiPath/BP parsers | 🟠 Medium | 🟡 Medium | **P2** |
| A14 — Version control | 🟠 Medium | 🔴 High | **P3** |
| A12 — Email intake | 🟡 Low | 🔴 High | **P3** |
| A13 — Chrome extension | 🟡 Low | 🔴 High | **P4** |

---

## 🚀 Quickest Win: Robin Script Paste Parser (A2)

This can be done in ~1 day and gives the most immediate value:

1. Add "Paste Robin Script" tab to the Import dialog  
2. Write a 100-line lexer that scans line by line  
3. Map modules/actions to ActionType enum using a lookup table  
4. Extract URLs/paths → Dependencies  
5. Show import preview → user confirms → bot created

**No new dependencies. No file parsing complexity. Just string processing.**

This alone eliminates the need to manually type steps for any PAD bot — just copy-paste the Robin code.
