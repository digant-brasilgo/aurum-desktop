# AURUM PROJECT — SESSION HANDOFF DOCUMENT
**For: Next Claude session (Aurum 6)**
**Written by: Claude (Aurum 5 session)**
**Date: 22 May 2026**
**Client: Digant Toshniwal, Delhi**
**Company: Brasilgo Jewels Private Limited & Nimbark Jewels**

---

## 0. APP ABBREVIATIONS
- **AUD** = AURUM Desktop (Electron)
- **AUB** = AURUM Business (Electron)
- **AUL** = AURUM Lite (React Native Android)

---

## 1. WHO IS THE CLIENT

- **Name:** Digant Toshniwal
- **City:** Delhi, India
- **Companies:** Brasilgo Jewels Private Limited + Nimbark Jewels
- **Role:** Owner/Admin
- **Server PC username:** Server
- **GitHub:** digant-brasilgo (repo: aurum-desktop)

---

## 2. THE THREE APPS

### A) AUD — AURUM Desktop
- **Tech:** Electron 29 + React 18 + Vite 5 + Express.js
- **Location:** `D:\Aurum\aurum-desktop\`
- **Data:** `%APPDATA%\aurum\data\[company]\aurum-data.json`
- **Build:** Right-click `build-aurum.bat` → Run as Administrator
- **LAN server:** Port 3737 (HTTP)
- **package.json name:** `"aurum"` (critical)
- **MainApp.jsx:** ~18,720 lines (after CSS extraction)
- **NEW FILES in src\:** `aurum.css` (30KB extracted CSS) + `AurumPrintSheet.html` (18KB print sheet)

### B) AUB — AURUM Business
- **Tech:** Electron 28 + React 18 + Vite 5
- **Location:** `D:\Aurum Business\aurum-business\` ⚠️ NOTE SPACE in "Aurum Business"
- **Data:** `%APPDATA%\aurum-business\aurum-business.dat` (AES-256-GCM encrypted)
- **Auth:** `%APPDATA%\aurum-business\aurum-business-auth.json`
- **Port:** 3738
- **App.jsx:** ~320KB

### C) AUL — AURUM Lite
- **Tech:** React Native + Expo SDK 54
- **Location:** `D:\Aurum\aurum-lite\`
- **Current APK:** 1.0.4

---

## 3. SERVER & NETWORK

- **Server IP:** `192.168.1.7` (static)
- **Router:** ZTE F670LV9.0 — keep when moving office
- **AURUM-FLOOR WiFi password:** `aurum2026`
- **Parental Control:** `Ban Internet Access` ⚠️ Never URL Whitelist
- **PM Phone MAC:** `3c:a8:0a:03:d1:8d` · Fixed IP: `192.168.1.100`
- **Windows Firewall Rule:** AURUM, Direction=In, Protocol=Any, Action=Allow

---

## 4. G: DRIVE BACKUP STRUCTURE
```
G:\Aurum\aurum-desktop\           ← AUD source backup
G:\Aurum Business\aurum-business\ ← AUB source backup
```
⚠️ Note: `G:\Aurum Business\` (with space) — not `G:\Aurum\`

---

## 5. KEY FILES

### AUD
```
D:\Aurum\aurum-desktop\
  main.js          ← Express + IPC + aub-connect endpoint
  preload.js       ← IPC bridge (help.*, adminResetPassword)
  src\
    MainApp.jsx    ← ALL views (~18,720 lines)
    AurumApp.jsx   ← Root, auth, theme
    aurum.css      ← 30KB design system CSS (extracted from MainApp)
    AurumPrintSheet.html ← Print sheet HTML (loaded on demand)
                          ⚠️ MUST ALSO BE IN public\ folder for Vite build
    main.jsx       ← Entry point (imports aurum.css)
    UserManagement.jsx
```

### AUB
```
D:\Aurum Business\aurum-business\
  electron.js      ← Auth + displayName
  src\App.jsx      ← ALL views (~320KB)
  preload-biz.js   ← IPC bridge for AUB
```

---

## 6. CRITICAL TECHNICAL WARNINGS

- **vite.config.js** — keep MINIMAL. No manualChunks — breaks Electron file:// loading
- **MainApp.jsx.bak** — ALWAYS backup before replacing
- **G: drive xcopy** — only AFTER successful build
- **AUL Parental Control** — must be "Ban Internet Access" not URL Whitelist
- **PM_DELIVERY_RECV** — must NEVER be created for COMPLETED_BAG type (fixed)
- **PM Book** — never debit for extra metal (fixed)
- **aurum.css + AurumPrintSheet.html** — both must be present in src\ AND AurumPrintSheet.html must ALSO be in public\ for Vite to include in dist
- **WhatsApp help phone** — in main.js, search `919XXXXXXXXX` to update
- **AUB path has SPACE** — `D:\Aurum Business\aurum-business` NOT `D:\Aurum\aurum-business`

---

## 7. BACKUP COMMANDS (CORRECTED)

```cmd
:: Backup MainApp FIRST
copy "D:\Aurum\aurum-desktop\src\MainApp.jsx" "D:\Aurum\aurum-desktop\src\MainApp.jsx.bak"

:: AUD rebuild
Right-click D:\Aurum\aurum-desktop\build-aurum.bat → Run as Administrator

:: AUB rebuild
cd /d "D:\Aurum Business\aurum-business" && npm run build && npx electron-builder --win --x64

:: G: drive backup (after successful build)
xcopy "D:\Aurum\aurum-desktop" "G:\Aurum\aurum-desktop" /E /I /H /Y
xcopy "D:\Aurum Business\aurum-business" "G:\Aurum Business\aurum-business\" /E /I /H /Y
                                                                              ^ trailing backslash required

:: GitHub
cd /d D:\Aurum\aurum-desktop
git add .
git commit -m "Describe changes"
git push

:: Verify server
curl http://192.168.1.7:3737/api/status

:: Fix print sheet (PENDING — do before next build)
copy "D:\Aurum\aurum-desktop\src\AurumPrintSheet.html" "D:\Aurum\aurum-desktop\public\AurumPrintSheet.html"
```

---

## 8. WORK COMPLETED IN AURUM 4 SESSION (10–19 May 2026)

### AUD — MainApp.jsx

**Bag Journey Map** (Movement tab — 3rd column, 240px wide):
- Vertical timeline of complete bag movement history
- 3-column grid: `1fr 0.85fr 240px`
- Each step: coloured dot, dept name, karigar, issued/received weights, loss
- Pulsing gold animation (`jPulse`) on current step
- Pending CO delivery shows "→ CO / Awaiting receipt"
- Green connector line between completed steps

**Print Sheets** (Production sidebar — all roles):
- "⎙ Print Sheets" tab visible to ALL roles (fixed visibleTabs)
- Double-sided A4 Bag Movement Record sheets
- Sheet numbers in red Courier New — auto-increments via localStorage
- ⚠️ PENDING: AurumPrintSheet.html must be copied to public\ folder then rebuild

**Performance optimisation:**
- Extracted 30KB inline CSS → `src/aurum.css`
- Extracted 18KB Print Sheet HTML → `src/AurumPrintSheet.html`
- MainApp.jsx reduced from ~19,974 to ~18,720 lines

**Bug fixes:**
- `pmMetalDeliveries` NOT created for `COMPLETED_BAG` type
- PM Book never debited for extra metal
- Stone settlement `issuedPcs` showing 0 fixed
- Split bag extra metal display fixed
- Karigar count includes BREAK_ISSUE + db.groups
- `g is not defined` crash fixed
- Batch Pre-Processing canEdit: PM + DM can now create/receive/mark settled

**SomaFM — 5th channel:** Suburbs of Goa added

**AUB Connection in AUD:** Sidebar shows "⚡ AUB CONNECTED — [displayName]"

**Help / Report Issue:** Screenshot → Desktop PNG → WhatsApp Web

### AUB — App.jsx
- Design thumbnails in Sales → From Desktop
- Cancelled invoices reappear for re-invoicing
- Party delete: `deletedInAUB` flag
- Display name in top bar
- Settings: "Your Display Name" field

### AUB — electron.js
- `displayName` in auth file + IPC handler

---

## 9. AURUM 5 SESSION (22 May 2026) — DESIGN COMPLETE, NO CODE WRITTEN YET

A complete **Metal & Stone Demand Approval System** was fully designed.
No code has been written. Phase 1 coding is the immediate next task.

---

## 10. METAL & STONE DEMAND APPROVAL SYSTEM — FULL SPEC

### BACKGROUND
Currently PM/DM can self-issue extra metal and stones directly from alloyed stock
without CO approval. This is being locked down. All metal and stone movements now
require CO approval. Two new physical issuer roles are being introduced.

---

### TWO NEW ROLES

| Role | Description |
|------|-------------|
| Metal Issuer | Physically holds & issues alloyed metal stock. One shared device/login. Multiple people share. |
| Stone Issuer | Physically holds & issues stone stock. Same setup. Two separate people/departments. |

⚠️ **Critical:** Metal Issuer's physical stock IS the alloyed metal stock.
No separate issuer ledger needed. Same for Stone Issuer and stone stock.
One single source of truth — no duplication anywhere.

---

### ROLE-BASED UI IN AUD (same app, same LAN, different login)

| Role | What they see |
|------|--------------|
| CO/Admin | Everything as now + Demands dashboard + Approve & Issue / Approve Only buttons + Pre-auth code generation |
| PM | Everything as now EXCEPT self-issue replaced by Raise Demand + My Demands section |
| DM | Same as PM |
| Metal Issuer | Live rates + Ticker + Their issuance queue + Raise Stock Demand to CO only |
| Stone Issuer | Same as Metal Issuer but for stones |

---

### DEMAND TYPES

| Type | Triggered by | When |
|------|-------------|------|
| New Bag Metal | PM (auto at bag creation) | Bag created, needs initial metal |
| Extra Metal | PM/DM (manual, mid-process) | Bag in dept, needs more metal |
| Stone Demand | PM/DM (manual) | When bag reaches Setting dept |

---

### COMPLETE DEMAND LIFECYCLE

```
RAISED (by PM/DM)
     ↓
PENDING (CO sees: sidebar badge + yellow dot on bag)
     ↓
CO ACTION:
  → Approve & Issue    (immediate, CO acts as issuer, ledgers update now)
  → Approve Only       (green dot, appears on issuer screen)
  → Reject             (with note, PM can re-raise fresh demand — no locking)
  → [CO absent]        PM enters pre-auth code → auto Approve & Issue
     ↓
[If Approve Only selected]
WAITING ISSUE (Metal/Stone Issuer sees it, confirms physical handover)
     ↓
ISSUED
     ↓
ATOMIC LEDGER UPDATE (all at once, no duplication):
  - Alloyed Metal Stock → OUT
  - PM Book → IN
  - Karigar Balance → updated
  - Bag record → weight updated
  - Demand status → ISSUED
  - Flag → cleared
  - Dot → cleared
```

---

### BAG CREATION FLOW CHANGE

**Current flow:**
```
PM creates bag → metal immediately deducted from alloyed stock
              → PM Book credited → Karigar balance updated → Bag ACTIVE
```

**New flow:**
```
PM creates bag → demand auto-raised
              → Bag status = PENDING_METAL
              → Bag CANNOT be issued to any department
              → CO sees demand (badge + yellow dot)
              → CO approves & issues (or issuer confirms)
              → THEN ledgers update atomically
              → Bag becomes ACTIVE
```

---

### EXTRA METAL FLOW CHANGE
- **Old:** "+ Extra Metal" button → directly issues from alloyed stock
- **New:** "+ Extra Metal" button → opens Raise Demand form → full approval flow

### STONE DEMAND FLOW
- Manual — PM/DM raises when bag reaches Setting dept
- System does NOT auto-suggest (keeps it clean, workflow discipline)
- Same approval flow as metal
- Stone Issuer confirms physical handover
- Stone settlement proceeds after issuance

---

### VISUAL INDICATORS

**Bag dot in Bags tab:**
- 🟡 Yellow dot = demand pending CO approval
- 🟢 Green dot = demand approved, awaiting physical issue by issuer
- No dot = no pending demand
- Auto-clears when ISSUED

**CO Sidebar badge:**
- Always visible count of all pending demands
- Format: `⚠ Metal: 2 | Stones: 1`
- Clicking jumps to Demands dashboard

**PM/DM — My Demands section:**
- All demands raised by them
- Status: Pending / Approved / Rejected / Issued
- CO rejection note visible if rejected
- Issued demands show date/time of physical handover
- Can re-raise fresh demand after rejection (no locking)

**Metal/Stone Issuer screen:**
- Current stock balance (prominent, top of screen)
- List of approved demands awaiting issue (oldest first)
- Each card: Bag no., Karigar, Dept, details, CO approval time
- "✓ Confirm Physical Issue" button
- "⚠ Alert CO — Stock Low" button (notification only, no transaction)

---

### LEDGER IMPACTS — SINGLE SOURCE, NO DUPLICATION

**Metal issuance (atomic):**
```
Alloyed Metal Stock  → OUT (quantity, purity, date, bag, demand ref)
PM Book              → IN (metal received for bag)
Karigar Balance      → updated (bag weight increases)
Bag record           → issued weight updated
```

**Stone issuance (atomic):**
```
CO Stone Register    → OUT (type, pieces, carats, date, bag)
Stone Settlement     → entry created for bag
Bag record           → stone weight updated
```

---

### THE DEMAND OBJECT (stored in db.demands)

```javascript
{
  id: "DMD-001",
  type: "METAL" | "STONE",
  demandType: "NEW_BAG" | "EXTRA_METAL" | "STONE_SETTING",
  bagId: "BGG-PS2",
  bagNo: "PS-25-05-016",
  dept: "Filing",
  karigarId: "...",
  raisedBy: "PM_USER",
  raisedAt: timestamp,

  // Metal specific
  metalType: "18K Gold",
  purity: 750,
  quantityRequested: 2.500,

  // Stone specific
  stoneType: "Diamond",
  piecesRequested: 12,
  caratsRequested: 0.480,

  note: "...",

  status: "PENDING" | "APPROVED" | "REJECTED" | "ISSUED",

  coActionBy: "CO_USER",
  coActionAt: timestamp,
  coNote: "...",
  approvedQuantity: 2.500,  // CO can change quantity from requested

  issuedBy: "METAL_ISSUER" | "STONE_ISSUER" | "CO_USER",
  issuedAt: timestamp,

  // Links to ledger entries (traceability only, not duplication)
  pmBookEntryId: "...",
  alloydStockEntryId: "...",

  // Pre-auth code (if used)
  preAuthCodeId: "...",
  preAuthCodeUsedAt: timestamp
}
```

---

### PRE-AUTHORIZED CODE SYSTEM (for CO absence)

**Purpose:** CO can approve+issue demands remotely when absent from factory.
Works entirely on LAN — no internet dependency.

**Two series:**
```
Metal codes:  AUR-M-XXXX-XXXX
Stone codes:  AUR-S-XXXX-XXXX
```

**How it works:**
1. CO generates a batch of codes (CO sets batch size) from within AUD
2. CO writes them down / keeps them safe outside factory
3. When absent and PM raises a demand, PM calls CO
4. CO reads out one code to PM over phone
5. PM enters code on the demand screen
6. System validates:
   - Code is unused
   - Code not expired (10 min window starts when PM enters it, not when generated)
   - Code matches correct series (metal/stone)
   - Demand quantity matches what CO was told on phone
7. If valid → Approve & Issue happens automatically
8. Code permanently consumed, cannot be reused

**Security features:**
- Only CO/Admin can generate or revoke codes (hidden from all other roles)
- Each code is single use only — permanently dead after use
- 10 minute window from time of entry by PM
- Approves exactly the demanded quantity — no more, no less
- CO can revoke all unused codes anytime
- Full audit trail: code ID, demand ID, bag, weight, time, who entered
- Batch size set by CO/Admin (no fixed limit)
- Two separate series — metal codes cannot be used for stone demands

**CO code management screen:**
```
PRE-AUTHORIZED DEMAND CODES
─────────────────────────────────────────────
METAL CODES                STONE CODES
Batch size: [  ]           Batch size: [  ]
Window: 10 min             Window: 10 min

[Generate Metal Codes]     [Generate Stone Codes]
[Revoke All Unused]        [Revoke All Unused]

AUR-M-7X4K-9M2P  ○ Unused
AUR-M-3R8J-2NQ1  ○ Unused
AUR-M-9KL2-5TP7  ✓ Used — BGG-PS2 — 2.500g — 10:42am
AUR-M-4MX9-7BW3  ✗ Revoked
```

---

### ISSUER STOCK REPLENISHMENT

When issuer needs more stock they press "Alert CO — Stock Low" in their screen.
CO sees the alert. CO physically gives stock and updates alloyed metal ledger as now.
No separate replenishment transaction needed — the alloyed stock IS their stock.

---

### WHAT MUST NOT BREAK
- PM Book balance calculations
- Karigar balance calculations
- Alloyed metal stock calculations
- Stone settlement logic
- Split bag metal tracking
- Extra metal tracking on groups
- Bag journey map
- All existing movement receipts and issues
- Group bag metal calculations
- All existing data and balances (untouched)

### EXISTING DATA
All existing bags, balances, PM Book entries, karigar balances remain exactly as-is.
New demand flow applies ONLY to new issuances going forward.
No migration needed. No existing data touched.

---

### CODING PHASES — START WITH PHASE 1

**Phase 1 — Demand Infrastructure** ← START HERE
- `db.demands` collection structure
- Demand creation (auto on bag creation + manual for extra metal/stones)
- Bag status `PENDING_METAL`
- Bag blocked from department issuance if `PENDING_METAL`
- Intercept bag creation to separate bag creation from metal issuance

**Phase 2 — CO Interface**
- Sidebar badge with demand counts
- Demands dashboard (approve & issue / approve only / reject)
- Bag dot indicators in Bags tab (yellow / green)

**Phase 3 — PM/DM Interface**
- Remove self-issuance buttons
- My Demands section with status tracking
- Re-raise after rejection

**Phase 4 — Metal/Stone Issuer Role**
- New role setup in AUD
- Issuer screen (queue + confirm + alert CO)
- Role-based sidebar (only relevant sections active)

**Phase 5 — Pre-Auth Code System**
- Code generation screen (CO/Admin only, very discreet)
- Code entry field on demand screen for PM/DM
- Validation + auto approve & issue
- Audit trail

---

### FIRST THING TO DO IN NEW CHAT

Search in `MainApp.jsx` for these terms and paste results with 40 lines context each.
**Do not write any code until these are reviewed.**

1. `createBag` or `handleCreateBag` or `newBag`
2. `pureMetalStock` or `alloydStock` (metal deduction at bag creation)
3. `PENDING_METAL` or `bagStatus` (confirm doesn't exist yet)
4. `pmMetalDeliveries` (PM Book entry at bag creation)
5. `extraMetal` or `handleExtraMetal` (current extra metal flow)

---

## 11. PENDING ITEMS (not yet built)

- **Print Sheet fetch error** — copy AurumPrintSheet.html to public\ then rebuild:
  ```cmd
  copy "D:\Aurum\aurum-desktop\src\AurumPrintSheet.html" "D:\Aurum\aurum-desktop\public\AurumPrintSheet.html"
  ```
- **Jewellery tag printing** — TSC TTP-244, TSPL, barcode, scan-to-invoice. Deferred.
- **AUB order invoice status** — Pending/Partial/Invoiced per order. Not built.
- **AUL company logo** — still null in `/api/status`
- **AUL DM phone** — add when ready (IP .101)
- **`db.designs` cleanup** — old data, safe to wipe manually
- **External help web page** — QR code for customers
- **Commercialisation** — see `AURUM_Commercialisation_Roadmap.md`

---

## 12. HOW TO START NEW SESSION

Paste this document and say:

*"I am Digant Toshniwal from Delhi. This is my Aurum 5 session handoff.
We are starting Aurum 6. The immediate task is Phase 1 of the Metal & Stone
Demand Approval System. Please read the full spec in this document and then
ask me to search MainApp.jsx for the 5 terms listed at the bottom of Section 10."*

---

*Aurum 1 + 2 + 3 + 4 sessions complete.*
*Aurum 5 — Metal & Stone Demand Approval System fully designed. Coding starts Aurum 6.*

**Jai Shri Ram! 🙏**
