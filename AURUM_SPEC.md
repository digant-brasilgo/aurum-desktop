# AURUM — Complete Application Specification
### Jewellery Production Metal Tracking & Control System
### Brasilgo Jewels Private Limited

---

## 1. PURPOSE & OVERVIEW

AURUM is a desktop + LAN application for a jewellery manufacturer to track gold and silver metal as it moves through production — from raw purchase, through alloying and casting, into production bags, through workshops, quality control, and finally delivery to customers. Every gram is accounted for at every stage.

**Stack:** Electron (desktop host) + React (UI) + Express (embedded LAN server) + JSON file storage. No database. No internet required. One Windows PC acts as server; client PCs connect via browser on LAN port 3737.

**Users:** Admin, Central Office (CO), Production Manager (PM), Data Manager. Each has different access rights.

**Core philosophy:** Every metal movement must create a ledger entry. Nothing moves without a record. Loss is calculated and flagged if above threshold.

---

## 2. ARCHITECTURE

```
aurum-desktop/
  main.js          — Electron main process + embedded Express server
  preload.js       — Context bridge (IPC to renderer)
  auth.js          — bcryptjs password hashing + role definitions
  src/
    main.jsx       — React entry point
    AurumApp.jsx   — Top-level: auth gate, data loading, theme state
    MainApp.jsx    — All views, CSS design system, all business logic
    LiveTicker.jsx — Top bar: gold/silver prices, news, clock, user info, theme toggle
    LoginScreen.jsx — Login page
    UserManagement.jsx — User admin panel
    useAurumData.js — Data hook: load/save/sync JSON, LAN polling
    aurumSounds.js  — Subtle UI sounds (nav clicks etc)
```

**Data storage:** `%APPDATA%\AURUM\aurum-data.json` — single JSON object containing all collections. `aurum-users.json` — user accounts. `aurum-settings.json` — API keys, preferences.

**LAN mode:** Express serves `dist/index.html` to browser clients. REST API endpoints: `POST /api/login`, `GET /api/data`, `POST /api/data`, `GET /api/poll`. Poll endpoint returns `{ changed, lastChange }` — browsers poll every 3 seconds and reload data if changed. All endpoints except login require `x-aurum-token` header (base64 encoded userId:timestamp:role).

**Electron IPC channels:** `db:getAll`, `db:setAll`, `auth:login`, `auth:getUsers`, `auth:addUser`, `auth:updateUser`, `auth:deleteUser`, `auth:changePassword`, `auth:verifyPassword`, `file:exportJSON`, `file:importJSON`, `backup:now`, `backup:list`, `backup:restore`, `backup:toFlashDrive`, `backup:fromFlashDrive`, `fy:getCurrent`, `fy:getAll`, `prices:get`, `prices:refresh`, `lan:info`, `settings:get`, `settings:set`, `window:minimize`, `window:maximize`, `window:close`.

---

## 3. DATA SCHEMA

The entire database is one JSON object (`db`). All IDs are generated with `generateId()` (timestamp + random string). All dates are ISO strings from `now()`.

```js
db = {
  // ── Bags ──────────────────────────────────────────────────────
  bags: [{
    id,               // "BGG-R2" — auto-generated, see Bag Numbering
    designId,         // "RG049"
    metalType,        // "Gold" | "Silver"
    purity,           // "18K" | "22K" | "14K" | "Silver 925" etc
    categoryCode,     // "R" | "N" | "ER" etc
    categoryLabel,    // "Ring" | "Necklace" | "Earrings" etc
    unitCount,        // number of jewellery pieces
    partsPerUnit,     // parts per piece (1 for ring, 2 for earring pair)
    totalParts,       // unitCount × partsPerUnit
    issuedWeight,     // grams issued by CO to PM
    currentWeight,    // current weight (updates on each receipt)
    currentDept,      // current department name
    currentKarigarId, // karigar currently holding it
    status,           // "In Process" | "Completed" | "Returned Mid-Process" | "Cancelled"
    createdAt,
    targetDate,       // ISO date string
    orderNo,          // linked order
    customerId,
    customerName,
    notes,
    pendingIssue,     // true when PM needs to issue to next dept
    isBroken,         // true when split into groups
    hasStones,        // true when stones have been issued
    stoneWeightGrams, // total net stone weight
    netMetalWeight,   // metal-only weight (excluding stones)
    grossWeight,      // netMetalWeight + stoneWeightGrams
    qcPassedAt,       // timestamp when QC passed
    pmBookDeliveredToCO, // true when PM has soft-delivered to CO
  }],

  // ── Transactions (bag movement log) ───────────────────────────
  transactions: [{
    id,
    type,             // "INITIAL_ISSUE" | "TRANSFER" | "BREAK_ISSUE" |
                      // "PARTIAL_RECALL" | "QC_FAIL_RETURN" | "REUNION"
    bagNo,
    groupLabel,       // null for intact bags, "A"|"B" etc for split groups
    fromDept,
    toDept,
    issuedWeight,     // grams issued to this dept
    receivedWeight,   // grams received back (null = still in dept)
    lossWeight,       // issuedWeight - receivedWeight - recoveryWeight
    recoveryWeight,   // loose scrap returned separately
    purity,
    metalType,
    karigarId,
    timestamp,
    notes,
    isSettingReceipt, // true for Setting dept (gross includes stones)
    grossReceived,    // gross weight at Setting receipt
    stoneWeight,      // stone weight at Setting receipt
  }],

  // ── Groups (split bag parts) ───────────────────────────────────
  groups: [{
    id,
    bagId,            // parent bag
    label,            // "A" | "B" | "C"
    currentDept,
    currentKarigarId,
    currentWeight,
    issuedWeight,
    status,           // "In Process" | "Completed"
    pendingIssue,
    createdAt,
  }],

  // ── PM Book ───────────────────────────────────────────────────
  pmBook: [{
    id,
    type,             // "BAG_RECEIVED_FROM_CO" | "DEPT_ISSUE" | "DEPT_RETURN" |
                      // "COMPLETED_BAG" | "LOOSE_RETURN" | "RECALL" |
                      // "DELIVERED_TO_CO" | "EXTRA_METAL_REVERSAL" |
                      // "PM_DELIVERY_RECV" | "QC_FAIL_RETURN"
    direction,        // "IN" | "OUT"
    bagNo,
    purity,
    metalType,
    weight,
    pureEquiv,        // pure metal equivalent
    date,
    notes,
    status,           // "Ready for CO" | "Delivered to CO" | null
    visitNo,          // for stone-related entries
  }],

  // ── CO Alloyed Stock ──────────────────────────────────────────
  coAlloyedStock: [{
    id,
    type,             // "BAG_ISSUE" | "PM_DELIVERY_RECV" | "ALLOYED_PURCHASE" etc
    direction,        // "IN" | "OUT"
    metalType,
    purity,
    weight,
    pureEquiv,
    bagNo,
    source,
    date,
    notes,
  }],

  // ── CO Stone Stock & Ledger ────────────────────────────────────
  coStoneStock: [{
    id, type, direction, bagId, stoneType,
    pieces, carats, grams, date, notes,
  }],
  stoneLedger: [{           // per-bag stone visit records
    id, bagId, visitNo, visitLabel, date,
    stones: [{
      stoneType, pieces, carats, grams,
      returnedUnusedPieces, returnedUnusedCarats,
      returnedBrokenPieces, returnedBrokenCarats,
      netCarats, netGrams, isReturnOnly,
    }],
    totalNetCarats, totalNetGrams,
    karigarId, notes, returnNote,
  }],
  stoneLoss: [{
    id, bagId, dept, stoneType, pieces, carats,
    grams, lossType, notes, date,
  }],
  pmStoneBook: [{
    id, type, direction, bagId, stoneType,
    pieces, carats, grams, date, notes, visitNo, status,
  }],
  stoneStock: [{            // internal stone stock (returned unused/broken)
    id, type, stoneType, pieces, carats,
    bagId, visitNo, notes, date,
  }],

  // ── Pure Metal Stock ──────────────────────────────────────────
  pureMetalStock: [{
    id, type, metalType, purity,
    pureWeight, alloiedWeight,
    source, notes, date, bagNo, customerName,
  }],

  // ── Alloyed Stock (alloy calculator sessions) ─────────────────
  alloyedStock: [{
    id, type, direction, alloyType, metalType, purity,
    weight, pureEquiv, date, notes, sessionId,
  }],

  // ── Extra Metal Issues ────────────────────────────────────────
  extraMetalIssues: [{
    id, bagId, groupLabel, weight, reason, karigarId,
    purity, metalType, date, txId,
  }],

  // ── Free Metal (PM holds loose metal) ─────────────────────────
  pmFreeMetal: [{
    id, bagId, weight, purity, metalType,
    source, date, notes, status,
  }],

  // ── PM Metal Deliveries (PM receives metal from karigars) ─────
  pmMetalDeliveries: [{
    id, karigarId, weight, purity, metalType,
    bagNo, notes, date, status,
  }],

  // ── Designs ───────────────────────────────────────────────────
  designs: [{
    id,         // "RG049" — prefix + sequential number
    name,       // "Ladies Solitaire Ring"
    metalType,
    purity,
    category,   // matches category label
    cadNo,      // optional CAD drawing reference
    photo,      // base64 image (compressed to ~50KB)
    createdAt,
  }],

  // ── Categories ────────────────────────────────────────────────
  categories: [{
    id, code, label, prefix,
    partsDefault, pairLogic, isActive,
  }],

  // ── Departments ───────────────────────────────────────────────
  departments: [{
    id, name, order, isActive, isAdditionalJob,
  }],

  // ── Karigars (craftsmen) ──────────────────────────────────────
  karigars: [{
    id, name, dept, phone, isActive,
  }],

  // ── Customers ─────────────────────────────────────────────────
  customers: [{
    id, name, company, address, city, state, pin, country,
    phone, email, gstin, notes, isActive, createdAt,
  }],

  // ── Customer Gold Accounts ────────────────────────────────────
  customerGold: [{
    id, type, customerName, metalType,
    pureWeight, cashValue, notes, date, bagNo,
  }],
  // type: "RECEIVED" | "RECEIVED_CORRECTION" | "USED_IN_JEWELLERY" |
  //       "SURPLUS_RETURNED_PHYSICAL" | "SURPLUS_RETURNED_CASH" | "SURPLUS_KEPT_WITH_US"

  // ── Orders ────────────────────────────────────────────────────
  orders: [{
    id, orderNo, customerId, customerName,
    description, metalType, purity, estimatedWeight,
    targetDate, status, notes, createdAt,
  }],

  // ── CO Receipts (delivery memos from PM) ─────────────────────
  coReceipts: [{
    id, bagId, bagNo, designId, purity, metalType,
    issuedWeight, receivedWeight, lossWeight, recoveryWeight,
    stonesByType, custGoldPureGrams, metalPrice,
    makingCharges, transportCharges, additionalWorkItems,
    manualItems, stoneItems, surplusPhysical, surplusCashGrams,
    cashPaidRupees, surplusKept, noteType, noteRef,
    totalNetCarats, totalNetGrams,
    receiveType,    // "normal" | "midprocess"
    createdAt, ledgerRecorded,
  }],

  // ── Machine Dust ──────────────────────────────────────────────
  machineDust: [{
    id, dept, metalType, purity, weight,
    pureEquiv, notes, date, collectedBy,
  }],

  // ── Alloy Calculator Sessions ─────────────────────────────────
  alloySessions: [{
    id, date, metalType, targetPurity, targetWeight,
    components: [{ material, weight, purity, pureContrib }],
    totalWeight, achievedPurity, notes, transferredToCasting,
  }],

  // ── Casting ───────────────────────────────────────────────────
  castingJobs: [{
    id, date, metalType, purity, alloyWeight,
    waxWeight, spruWeight, castWeight,
    loss, lossPercent, notes, karigarId,
  }],

  // ── Accounts / Finance ────────────────────────────────────────
  financialTxns: [{
    id, date, partyId, partyName, type,
    amount, description, reference, balance,
  }],
  parties: [{
    id, name, type, phone, address, gstin,
    openingBalance, isActive,
  }],

  // ── Repair Jobs ───────────────────────────────────────────────
  repairJobs: [{
    id, customerId, customerName, itemDescription,
    issueDate, targetDate, metalType, receivedWeight,
    returnWeight, charges, status, notes,
  }],

  // ── Approval Stock ────────────────────────────────────────────
  approvalStock: [{
    id, customerId, customerName, designId, itemDescription,
    metalType, purity, weight, sentDate, returnDate,
    status, notes,
  }],

  // ── Bag Counters (auto-numbering) ─────────────────────────────
  bagCounters: {
    "Gold-R": 3,   // next Ring will be BGG-R4
    "Silver-R": 5, // next Silver Ring will be BGS-R6
    // etc
  },

  // ── Audit Logs ────────────────────────────────────────────────
  auditLogs: [{
    id, action, entityId, details, timestamp,
  }],

  // ── Financial Year ────────────────────────────────────────────
  currentFY: "2024-25",
}
```

---

## 4. BAG NUMBERING

Bags are numbered automatically: `{metalPrefix}{categoryCode}-{serial}`.

Metal prefix: Gold = "BGG", Silver = "BGS"

Category codes:
```
R=Ring, N=Necklace, P=Pendant, BR=Bracelet, BN=Bangle,
CL=Collet, ER=Earrings, CH=Chain, MS=Mangalsutra,
NR=Necklace Repair, etc (custom categories add their own code)
```

Example: Third gold ring = `BGG-R3`. Fifth silver earring = `BGS-ER5`.

Counter stored in `bagCounters["{metalType}-{categoryCode}"]`.

---

## 5. DESIGN NUMBERING

Design IDs use category prefix + sequential number.

Prefix lookup: `DESIGN_PREFIXES` object maps category name to prefix:
```
Ring→RG, Necklace→NK, Earrings→ER, Bracelet→BR, Bangle→BN,
Chain→CH, Mangalsutra→MS, Pendant→PN, Collet→CL,
Ring Repair→RGR, Necklace Repair→NKR, etc
```

If category has a custom prefix (stored in `db.categories[].prefix`), that takes priority.

`generateDesignNo(category, designs, db)` finds all existing IDs with same prefix, takes `max + 1`.

Design form behaviour:
- Opening the Add Design form auto-generates an ID for the first available category
- Changing the Category dropdown auto-regenerates the ID with the correct new prefix
- Duplicate ID check on save — alerts if ID already exists
- Cannot save without both ID and Name filled

---

## 6. ROLES & PERMISSIONS

```
admin          — full access, can create all user types
co             — full access, can create PM and data_manager
production_manager — limited: bags, movement, groups, karigars,
                     stones, pure metal, machine dust, reports
                     noEdit: true (some destructive actions blocked)
data_manager   — same as PM, noEdit: true
```

`can(permission)` function checks if user's role includes the permission string. Admin and CO always return true for all permissions.

`canCreateRole(creatorRole, targetRole)` — controls who can create which user type.

Password hashing: bcryptjs with salt rounds 10.

---

## 7. METAL FLOW — COMPLETE END TO END

### Stage 1: Purchase / Receipt of Raw Metal

CO records purchase in **Pure Metal Stock** tab:
- Type: PURCHASE, REFINING, CUSTOMER_ISSUE
- Fields: metalType, purity, pureWeight, alloiedWeight, source, date
- Creates `pureMetalStock` entry direction=IN

Pure Metal balance = SUM(PURCHASE + REFINING + CUSTOMER_ISSUE) - SUM(CASTING_ISSUE)

### Stage 2: Alloying

**Alloy Calculator** tab: CO enters target purity and target weight. Calculator shows how much pure gold + alloy metal needed. Creates `alloySessions` record. Can transfer to casting — creates CASTING_ISSUE entry in `alloyedStock`.

**Alloyed Metal** tab: tracks the stock of ready-alloyed metal per purity. Balance = all IN entries - all OUT entries from `alloyedStock`.

### Stage 3: Casting

**Casting** tab: PM records casting jobs — wax weight, alloy used, cast output weight, sprue weight, loss. Loss% flagged if above threshold. Alloy weight debits from alloyed stock.

### Stage 4: Bag Creation

CO creates a bag in **Bags** tab:
1. Selects: Metal type, Purity, Category, Design ID, Units, Parts per unit, Issued weight, Start dept, Karigar, Target date
2. System auto-generates bag number from counter
3. Creates `bags` record: `currentDept=PROD_MGR`, `pendingIssue=true`, `status="In Process"`
4. Creates `transactions` record: type=INITIAL_ISSUE, fromDept=CO, toDept=PM
5. Debits `coAlloyedStock`: direction=OUT, type=BAG_ISSUE
6. Creates `pmBook` entry: direction=IN, type=BAG_RECEIVED_FROM_CO, status=null

CO alloyed stock balance decreases by issued weight.

### Stage 5: PM Issues to Department

In **Movement** tab, PM selects bag (which shows "With Production Manager"):
- Action: Issue to Department
- Selects dept and karigar
- Creates `transactions` record: type=TRANSFER, fromDept=PM, toDept=selectedDept
- Updates `bags.currentDept`, `bags.currentKarigarId`, `bags.pendingIssue=false`
- Creates `pmBook` entry: direction=OUT, type=DEPT_ISSUE

### Stage 6: Department Work & Receipt

When work is done, bag returns to PM. PM records receipt in **Movement** tab:
- Enters: received weight, recovery weight (loose scrap if any), karigar
- Calculates: lossWeight = issuedWeight - receivedWeight - recoveryWeight
- Loss% = lossWeight / issuedWeight × 100
- Thresholds: Filing 3%, Pre-Polishing 2%, Final Polishing 1%, others 5%
- If loss% > threshold: warning shown (not blocked)
- Updates transaction: receivedWeight, lossWeight, recoveryWeight
- Updates `bags.currentWeight = receivedWeight`
- Updates `bags.currentDept = PROD_MGR`, `bags.pendingIssue = true`
- Creates `pmBook` entries: DEPT_RETURN IN (received back), plus if recovery: LOOSE_RETURN

**Special — Setting department:**
- When Setting dept receives bag, PM issues stones from CO stone stock
- Gross received = metal weight + stone weight
- netMetalReceived = grossReceived - stoneWeightGrams
- Loss calculated on metal only

### Stage 7: Extra Metal

If karigar needs more metal for a bag:
- PM records in Movement → Extra Metal button
- Creates `extraMetalIssues` record
- Updates transaction issuedWeight += extra amount
- Creates `pmBook` OUT entry: EXTRA_METAL

### Stage 8: Partial Recall

If CO needs some metal back mid-process:
- PM records partial recall
- Creates PARTIAL_RECALL transaction
- Reduces issuedWeight
- Creates pmBook IN entry: RECALL

### Stage 9: QC

When bag reaches Quality Control dept and PM receives it back:
- PM marks QC result in Movement
- **QC Pass:** `bag.qcPassedAt = now()`, `bag.pendingIssue = true`
  - Creates pmBook entry: COMPLETED_BAG, status="Ready for CO"
  - Bag shows "QC Passed — ready for soft delivery to CO"
- **QC Fail:** Bag returns to PM holding, `bag.pendingIssue = true`
  - Creates `pmBook` entry: QC_FAIL_RETURN IN
  - PM re-issues to suggested dept

### Stage 10: PM Delivers to CO

PM delivers bag to CO (soft delivery):
- In PM Book tab → Ready for CO section
- PM clicks deliver on the bag
- `bag.pmBookDeliveredToCO = true`
- Creates `pmBook` entry: DELIVERED_TO_CO, direction=OUT
- Creates `coAlloyedStock` entry: direction=IN, type=PM_DELIVERY_RECV
- Bag disappears from Movement dropdown (filtered out: qcPassedAt && pmBookDeliveredToCO = true)
- This prevents PM from accidentally re-issuing a completed bag

### Stage 11: CO Receives from PM (Delivery Memo)

In CO tab → Receive from PM:
- CO selects bag from PM-delivered list
- Enters: received weight, customer gold used, metal price, making charges, transport, stone details
- Calculates invoice automatically
- **Normal receipt:** `bag.status = "Completed"`
- **Mid-process return:** `bag.status = "Returned Mid-Process"`
- Creates `coReceipts` record
- `ledgerRecorded` flag — prevents double-posting
- Finalise button: posts all accounting entries to customerGold, pureMetalStock

---

## 8. SPLIT / MERGE (GROUPS)

When a bag needs to go to multiple departments simultaneously:

**Split:**
- Only allowed when bag is with PM (`isWithPM = true`)
- PM splits bag into 2+ groups (A, B, etc)
- Each group gets its own weight, dept, karigar
- `bag.isBroken = true`
- Creates `groups` records
- Creates BREAK_ISSUE transactions for each group
- Creates pmBook DEPT_ISSUE entries for each group

**Group movement** works identically to bag movement but on the group record.

**Merge:**
- All groups must return to PM before merging
- PM selects merge dept and karigar
- Groups reunited into parent bag
- `bag.isBroken = false`, bag.currentDept = merge dept
- REUNION transaction created

**Display:**
- Split bags show `[SPLIT — N groups]` in Movement dropdown
- Groups shown as `BGG-ER2-GRP-A — 5 pcs | Pre-Polishing | 8.620g`
- Action buttons hidden for split bags in Movement; only merge panel shows

---

## 9. STONES FLOW

### Issue Stones

In **Stones** tab, PM selects bag (only bags with hasStones or In Process shown, diamond 💎 marks bags with stones already):

- Enter new stones: stoneType, pieces, carats (grams = carats × 0.2)
- Optionally record returned unused stones (from previous setting)
- Optionally record returned broken stones
- Returned unused → go back to CO stone stock (IN)
- Returned broken → go back to CO stone stock (IN, flagged as damaged)
- New stones issued → CO stone stock OUT, PM stone book OUT

**Returns amend existing visit** — if only returning stones (no new issue), the latest `stoneLedger` visit record is updated in-place, not creating a new visit.

### Stone History

Each setting visit shown with full breakdown:
- Issued pcs/ct
- Returned unused pcs/ct
- Returned broken pcs/ct
- Net set pcs/ct
- Net weight

### Stone Loss

Separate from returns — for stones that fall out after setting (during polishing etc):
- Records to `stoneLoss`
- Reduces `bag.stoneWeightGrams` and `bag.grossWeight`
- CO stone stock: direction=OUT (lost)
- PM stone book: direction=OUT (lost)

---

## 10. PM BOOK

PM Book is PM's internal metal ledger — every gram in and out.

**Balance** = SUM(direction=IN weights) - SUM(direction=OUT weights), grouped by purity+metalType.

**Sections:**
- Ledger: full chronological list with running balance, filtered by purity/metal/direction
- Ready for CO: items with `status="Ready for CO"` — completed bags, loose returns
- In Transit: bags currently with PM (between depts)
- Stone Book: stone movements via pmStoneBook

**Direction filter:** IN only / OUT only / All
**IN rows:** green left border, green pill badge
**OUT rows:** red left border, red pill badge

**Running balance per purity** — balance can go negative if data entry errors exist (warning shown).

---

## 11. CO ALLOYED STOCK LEDGER

Tracks all alloyed metal at CO:
- IN: purchased alloyed stock, returns from PM, mid-process returns
- OUT: bags issued to PM

Balance per purity = SUM(IN) - SUM(OUT)

Shows: date, type, direction, purity, metal, weight, pure equiv, running balance, source, bag no.

---

## 12. PURE METAL STOCK

Tracks 24K pure gold/silver:
- IN: PURCHASE, REFINING, CUSTOMER_ISSUE (customer gives own gold)
- OUT: CASTING_ISSUE (sent for alloying)
- OUT: CUSTOMER_GOLD_RETURNED (surplus returned to customer)

Balance = SUM(IN) - SUM(OUT)

Customer gold accounts track: received pure, used in jewellery, surplus disposed (physical/cash/kept).

---

## 13. MACHINE DUST

Each department sweeps metal dust. PM records collection:
- Dept, metalType, purity, weight, date, collectedBy
- Goes to CO eventually for refining
- Shown in Machine Dust tab and Reports

---

## 14. VIEWS / TABS

### Dashboard
- Stats cards: Active bags, Completed bags, Overdue bags, Metal in PM
- Mini charts: production trend, metal by purity, dept load
- Recent activity
- Alerts: high loss transactions

### Bags Tab
- Full bag table with 12 columns: Bag No, Design, Customer, Metal/Purity, Category, Units, Issued Wt, Curr Dept, Karigar, Target Date, Status, Action
- Multi-filter: Metal (toggle), Purity (toggle), Category (dropdown), Status (toggle), Department (dropdown), Customer (text), plus search bar
- Bag number is a dotted-underlined hyperlink → opens Movement pre-selected to that bag, right panel shows bag's current stage immediately
- goToBagMovement(bagId) sets navToBagId state in AurumApp → openTab("movement") → MovementView receives initialBagId prop → useEffect pre-selects bag
- Due-date panel: fixed bottom-right corner, collapsed pill badge (⚠ 13 late | 1 due today), click to expand scrollable list, click any bag → opens Movement
- Overdue and due-today bags filterable with "Filter" button
- Create bag form with: metal, purity, category, design (filtered to category), units, parts per unit, start dept, karigar, issued weight, target date, order, customer
- Low alloyed stock warning if issued weight > available balance
- Sticker print button: prints bag label (1.5"×2.5", gold/silver colour coded)

### Movement Tab

**Intact Bag / Group toggle**

For Intact Bag:
- Dropdown: all In Process bags NOT delivered to CO (includes 💎 for stone bags, [SPLIT] marker)
- Bag card shows: bag no, design, dept, weight, karigar, target date, last tx info

Right panel changes by bag state:
- **Fresh bag (INITIAL_ISSUE, pendingIssue=true):** Shows "With Production Manager" holding card + Issue to Department button only. Receive form is hidden (bag hasn't been to any dept yet — nothing to receive). Status label reads "Pending — ready to issue to first dept" not "Awaiting receipt".
- **With PM (pendingIssue=true, was in dept before):** Shows PM holding card with last receipt info + Issue button
- **In department (pendingIssue=false):** Shows Receive from [Dept] form
- **QC passed:** Shows green "QC Passed — Issue to CO for Soft Delivery" banner
- **Already received:** Shows receipt summary + Update Receipt form

**Receive form fields:**
- Received Weight (g) — required
- Extra Metal Received (if any)
- Metal Loss (auto-calculated, shown in real-time)
- Karigar selector
- Loose Metal Returned by Karigar (optional — goes to PM Book as Ready for CO)
- For Setting dept: Gross weight input (stone weight auto-calculated)

**Issue to Department form:**
- Target dept selector (all active depts)
- Karigar selector (filtered to dept, shows all if none in dept)
- Notes

**Buttons:**
- Issue to Department (always visible when with PM)
- Extra Metal (when bag is in a dept, not with PM)
- Split (when bag is with PM, not already split)
- Merge (when bag is split, all groups back at PM)

**Choose Action display:**
- Smart contextual message: "QC Passed — Use Issue to send to CO", "Last issued: 5.048g ✓ Already received: 5.310g", etc

**Group mode:** same flow but on group records

### Groups Tab
- Lists all groups (split bag parts)
- Shows: bag no + design, group label, pieces, current dept, weight, karigar, status
- Reset Group to In Process button (Admin/CO only) — fixes accidentally completed groups
- Groups displayed: `BGG-ER2-GRP-A — 5 pcs | Pre-Polishing | 8.620g`

### Stones Tab
- Bag dropdown: only In Process bags + bags with stones, 💎 marks stone bags
- Stone issue form: stone type, pieces, carats, grams (auto)
- Return unused stones section (amends latest visit in-place)
- Return broken stones section
- Stone history: all visits with full breakdown table
- Stone loss form: dept, stone type, pieces, carats, loss type (Lost/Broken/Found & Returned)
- Current stone composition summary card

### PM Book Tab
Sections: Ledger | Ready for CO | In Transit | Stone Book

**Ledger:** Full metal ledger, filters: purity, metal type, direction (IN/OUT/All). Running balance. IN rows green-tinted, OUT rows normal. IN/OUT pill badge on each row. Totals row at bottom.

**Ready for CO:** All pmBook entries with status="Ready for CO". Deliver buttons (individual + deliver all by purity). Delivered items get OUT entry and credit coAlloyedStock.

**In Transit:** Bags currently between CO and departments.

**Stone Book:** pmStoneBook entries with IN/OUT, stone type, carats, bag reference.

### Karigars Tab
- List of all karigars with dept, phone, active status
- Performance view: transactions per karigar, loss%, recovery
- Add/edit/deactivate

### Central Office Tab
Sub-tabs: Receive Metal | CO Ledger | Stone Ledger | Invoice | Account

**Receive Jewellery (CO receives completed bags from PM):**
- Shows checkbox table of all PM-delivered bags (qcPassedAt + pmBookDeliveredToCO=true)
- Each row: bag no, design, purity, net weight, customer
- Tick individual rows or use ☑ Select All / ☐ Deselect All
- **Receive Selected (N)** — bulk receives all ticked bags in one click (Normal completion)
- **Receive + Memo** button per row — for individual receipt with full delivery memo generation
- Mid-process / on-hold bags listed separately with individual Receive button
- Creates coReceipt record per bag
- Bag status → Completed or Returned Mid-Process

**Receive Metal (CO receives loose metal returned by PM):**
- Shows checkbox table of all pending PM metal deliveries (status="Pending CO Receipt")
- Each row: date, metal, purity, weight, pure equiv, notes
- Tick individual rows or use ☑ Select All / ☐ Deselect All
- **Receive Selected (N)** — credits all selected deliveries to CO alloyed stock in one click
- Summary bar shows total weight and pure equiv of selected items
- Old single-dropdown approach replaced entirely

**CO Ledger:** coAlloyedStock entries with running balance, filters, IN/OUT pills

**Stone Ledger:** coStoneStock entries per bag/stone type

**Invoice (Delivery Memo):**
- Select receipt → auto-populated
- Fields: metal price per gram, making charges, transport, stone values, additional work items, manual items
- Customer gold deduction calculation
- Surplus options: Physical return / Cash settlement / Keep with us
- Note type: Sale Note / Delivery Challan / Invoice
- PDF print button → full formatted delivery memo
- Finalise button → posts all accounting entries

**Account:** Customer gold account statements per metal type

### Pure Metal Tab
- Purchases/refining entries
- Casting issues
- Customer gold accounts
- Balance card per purity

### Alloyed Metal Tab
- Balance per purity
- All entries with running balance
- Alloy Calculator sub-tab

### Machine Dust Tab
- Department-wise dust collection log
- Per-dept totals

### Customers Tab
- Customer cards with: name, company, city, state, country, phone
- Customer detail: orders, bags, gold account
- Add/edit with full address form

### Orders Tab
- Order list with status, customer, target date
- Link bags to orders
- Due-date tracking

### Reports Tab
Filters: date range, metal, purity, karigar, dept, bag no, design, FY

Reports:
- Production Report: bags, movements, loss by dept
- Karigar Report: per karigar loss%, recovery, bags handled
- Metal Stock Report: pure + alloyed stock snapshot
- Machine Dust Report
- Department-wise Loss Report
- Monthly Production Report
- Bag-by-bag detailed report

### Design Register Tab
- Gallery view (photos)
- List view: ID, name, CAD no, metal, purity, category, last used
- Add design: ID (auto-generated, updates when category changes), name, CAD no, metal, purity, category, photo
- Edit: name, CAD no, photo, category (changing category regenerates ID)
- Delete: blocked if active bags exist for that design

### Casting Tab
- Casting job entry: alloy weight, wax weight, cast weight, sprue weight
- Loss calculation and history
- Link to alloy calculator

### Accounts Tab
- Party ledger
- Outstanding (receivables/payables)
- Party list management

### Repair Jobs Tab
- Customer repair tracking
- Issue/return weights
- Charges

### Approval Stock Tab
- Items sent on approval to customers
- Return tracking

### Settings Tab (Admin/CO only)
Sub-tabs: Categories | Departments | Purities | Backup | Users | API Keys

**Categories:** Add/edit jewellery categories with code, prefix, parts default, pair logic. Deactivate/reactivate.

**Departments:** Add/edit/reorder. Mark as isAdditionalJob (for Beading, Enameling etc).

**Purities:** Add custom purities per metal type. Default Gold purities: 24K, 22K, 18K, 14K, 9K. Default Silver: Silver 999, Silver 925, Silver 800.

**Backup:** Manual backup, restore from backup list, backup to flash drive, restore from flash drive. Auto-backup at 22:00.

**Users:** Create/edit/deactivate users. Role selector. Password change. verifyPassword before destructive actions.

**API Keys:** Gold/silver price API keys for live price fetching.

---

## 15. LIVE TICKER (TOP BAR)

Full-width top bar, WebkitAppRegion=drag (draggable in Electron).

Left side:
- AURUM logo + shimmer animation
- Live gold price (22K, 18K) in ₹/g — fetched from API, cached, updates every 4h Electron / 5min LAN
- Live silver price
- Last saved indicator (●Saved HH:MM)
- Backup done notification

Right side:
- News ticker: scrolling jewellery industry news (fetched from API)
- User avatar (role-color circle with initial)
- User name + role label
- Theme toggle button (☀ dark → light, 🌙 light → dark)
- Logout button (⏻)
- Music player toggle button (♪)

**Window controls** (Electron only, absolutely positioned top-right, no-drag region):
- ─ Minimise, □ Maximise, ✕ Close

**Music Player:**
- Embedded audio player in bottom bar
- Plays background music (soothing/ambient)
- Play/pause, next track, volume
- Does not affect app functionality

---

## 16. THEME SYSTEM

**Dark theme (default):** Bloomberg Terminal inspired. Near-black backgrounds (`#08080e` page, `#0f0f18` cards), gold accent text (`#d4a843`), muted secondary text.

**Light theme:** Warm parchment (`#f0ebe0` page, `#ffffff` cards), dark charcoal text (`#1a1408`), darker gold accents (`#8a6010`).

**Implementation:**
- `theme` state in `AurumApp` (top-level) → entire tree re-renders on toggle
- `LiveTicker` receives `theme` and `toggleTheme` as props
- CSS: `:root` / `.theme-dark` for dark, `.theme-light` for light — all as CSS variable overrides
- Badge colors, button gradients, row hovers all have `.theme-light` overrides

**Variables:**
```css
--gold, --gold-light, --gold-bright, --gold-dim, --gold-muted
--silver
--dark, --dark2, --dark3, --dark4, --dark5
--text-primary, --text-secondary, --text-dim, --text-inverse
--loss, --recovery, --warning, --info
--input-bg, --card-shadow, --th-bg, --row-hover, --row-alt
--radius: 3px, --radius-lg: 5px
```

**Persistence:** localStorage key `aurum-theme`, per-browser.

---

## 17. FONT SIZES & UI SCALE

Base font: `'Courier New', monospace` throughout (terminal aesthetic).

| Element | Size |
|---------|------|
| Body / table cells | 13px |
| Form inputs | 13px |
| Buttons | 12px |
| Badges | 11px |
| Form labels | 11px |
| Table headers | 11px |
| Nav items | 13px |
| Nav group labels | 10px |
| Section titles | 12px |
| View headers | 12px |
| Tab bar | 12px |
| Small meta text | 11px |
| Sticker print | custom |

Designed for 1152×864 minimum resolution. Auto-zoom applied: `Math.min(1.0, screenWidth / 1280)`.

---

## 18. DESIGN THRESHOLDS

Loss thresholds per department (flag if exceeded):
```
Filing: 3%
Pre-Polishing: 2%
Final Polishing: 1%
All others: 5%
```

`getDeptThreshold(deptName)` returns the threshold.

---

## 19. PURE METAL CONVERSION

`toPureMetal(weight, purity)` converts alloyed weight to pure equivalent:
```
24K = weight × 1.0
22K = weight × (22/24)
18K = weight × (18/24)
14K = weight × (14/24)
9K  = weight × (9/24)
Silver 999 = weight × 0.999
Silver 925 = weight × 0.925
Silver 800 = weight × 0.800
```

---

## 20. KEY UI PATTERNS

**Cards:** `.card` + `.card-gold` (gold left border). Padding 18px, border-radius 5px.

**Tables:** Sticky headers, alternating row shading (very subtle), gold hover. Right-align numeric columns. Weight values in green (`.weight-text`), loss in red (`.loss-text`), recovery in teal (`.recovery-text`).

**Badges:** Small pill with colored border-left. Colors: gold, silver, green, red, blue, orange.

**Labels:** All caps, letter-spaced, 11px, above every input field.

**Section titles:** Left gold accent bar + uppercase spaced text.

**Info boxes:** Subtle background tint, left border, used for contextual messages.

**Toast notifications:** Brief inline toasts (success/error) — avoid `alert()` in Electron (causes focus loss).

**Modals:** backdrop blur, scale-in animation, click outside to close.

**Hyperlinks:** Bag numbers are dotted-underlined clickable links → open Movement pre-selected to that bag.

**Due-date pill:** Fixed bottom-right corner. Collapsed = small pill badge showing counts. Expanded = scrollable panel with bag list, clicking any bag opens Movement.

---

## 21. ERROR HANDLING

- `ErrorBoundary` wraps `MainApp` — shows friendly error with stack trace and "Try Again" button
- All `updateDB` calls are wrapped in the data hook's immer-like mutation pattern
- No network failures possible (all local JSON) — only file write errors handled
- Build errors: Vite esbuild strict about JSX — no nested function declarations, no duplicate object keys
- IPC failures logged to console, UI shows graceful fallback

---

## 22. FINANCIAL YEAR

FY runs April–March (Indian standard). `fy:getCurrent` IPC returns current FY string (e.g. "2024-25"). Order numbers prefixed with FY: `ORD-2024-25-001`.

---

## 23. BACKUP SYSTEM

- Auto-backup daily at 22:00 to `%APPDATA%\AURUM\backups\`
- Manual backup button in Settings
- Backup list with restore option
- Flash drive backup: copies to first detected USB drive
- Flash drive restore: reads from USB and replaces current data

---

## 24. BUILD & DEPLOYMENT

```
npm run build:vite    → Vite bundles src/ to dist/
npm run build:win     → electron-builder packages to release/
```

`package.json` build config:
- target: portable (single exe, no installer)
- icon: assets/aurum_icon.ico (multi-size ICO — 16,32,48,64,128,256px, programmatically generated from SVG mandala design)
- Mandala icon: gold Gothic arch petals, concentric rings, round brilliant-cut ruby at centre with facets
- extraFiles: node_modules/electron/dist/ffmpeg.dll (prevents dll error)
- compression: store (fast, no compression needed)

`build-aurum.bat` (run as Administrator — only bat file needed, Build_Installer.bat deleted):
1. Check admin rights — refuses if not admin, instructs user
2. Check icon file exists (assets/aurum_icon.ico)
3. Auto-install node_modules if missing
4. Kill running electron.exe and AURUM.exe, delete locked exe
5. Vite build
6. Copy ffmpeg.dll from node_modules/electron/dist/ (prevents dll crash)
7. electron-builder (CSC_IDENTITY_AUTO_DISCOVERY=false to skip signing)
8. Copy ffmpeg.dll again to win-unpacked/ (in case builder overwrote)
9. Add Windows Firewall rules for exe path and port 3737
10. Clear Windows icon cache (ie4uinit.exe -show)
11. Create desktop shortcut via temp PowerShell .ps1 file with correct icon path

---

## 25. KNOWN BUSINESS RULES

1. Bag cannot be moved to Movement dropdown if `qcPassedAt && pmBookDeliveredToCO` — it's been handed to CO
2. Returning stones without new stones → amends existing visit in-place, does NOT create new visit number
3. Broken stones go back to CO stock as IN (damaged but present), NOT OUT
4. Customer gold account debits when bag is finalised at CO, not at bag creation
5. `INITIAL_ISSUE` transactions are excluded from department loss calculations in Reports
6. `PARTIAL_RECALL` and `QC_FAIL_RETURN` excluded from open transfer filter in Movement
7. PM Book balance can go negative — indicates data entry errors
8. Split bags: action buttons (Receive, Issue, Extra Metal) are hidden; only merge panel shows
9. Groups must all be back at PM before merge is allowed
10. `pmFreeMetal` migration: on startup, checks for un-logged recalls and auto-creates pmBook entries
11. Setting dept receipt: receivedWeight = gross (metal + stones). Loss calculated on metal only.
12. Design ID auto-regenerates when category changes in the Add Design form
13. Cannot delete a design with active bags
14. Cannot delete a user who is currently logged in
15. Firewall rule must be set for port 3737 for LAN clients to connect
16. Fresh bag (only INITIAL_ISSUE transaction): Movement shows Issue to Department only — no "Receive from PM" form shown since bag has never been to a dept
17. Bulk receive (jewellery + metal): selectedBags and selectedDeliveries are Set() states in CentralOfficeView; cleared after each bulk receive operation
18. Theme toggle causes full React tree re-render because theme state is in AurumApp (top-level parent)


---

## 26. PLANNED FEATURES — ROUND 2

### 26.1 CO/Admin Alert System

**Trigger events:**
- Bag PM-delivered awaiting CO receipt
- Metal delivery pending CO receipt
- Bag passed QC not yet soft-delivered
- New message received

**Alert behaviour:**
- Chime plays once on trigger
- If no action in 15 minutes (configurable in Settings by CO/Admin only) — chime once more
- After second reminder — silent, badge remains
- If CO offline when event occurs — chime plays on next login
- Badge shows pending count, lives in top bar ONLY when CO tab is active
- Clicking badge jumps to relevant section

**Data:**
```js
db.alerts = [{
  id, type, bagId, bagNo, message,
  timestamp, resolvedAt, remindedAt,
  resolvedBy, isResolved,
}]
// type: "BAG_READY" | "METAL_PENDING" | "QC_PASSED" | "NEW_MESSAGE"
```

**Settings field:** `alertReminderMinutes` (default 15, editable by CO/Admin)

---

### 26.2 LAN Messaging

**Communication rules:**
- PM → CO, Admin only
- DM → CO, Admin only
- CO → PM, DM, Admin
- Admin → PM, DM, CO
- No PM↔DM, no lateral communication between same-level users

**Message types:** Bag-linked (attached to specific bag) or General

**Data:**
```js
db.messages = [{
  id, fromUserId, fromName, fromRole,
  toRole,       // "co" | "admin" | "pm" | "dm"
  bagId,        // null if general
  bagNo,
  text,
  timestamp,
  readBy: [],   // userIds who have read it
}]
```

**UI:**
- Message icon in top bar with unread count badge
- Sliding panel — inbox + compose
- Bag-linked messages appear inline on bag detail page
- Different sound from CO alert chime
- Reply button on each message

---

### 26.3 PM Daily To-Do Board

**Auto-appears on PM login** as a modal. Dismissable with "Start Day" button. Also accessible as a tab during the day.

**Auto-generated sections:**

| Section | Logic |
|---------|-------|
| 🔴 Overdue bags | targetDate < today, In Process |
| 🟡 Due today | targetDate = today |
| ⏳ Pending issue | bags with PM, pendingIssue=true |
| 📥 Receipts long pending | issued to dept > 3 days ago, not received back |
| 🪨 Needs metal from CO | PM has flagged OR auto-detected: bag issuedWeight < threshold and no extraMetal available |
| 💎 Needs stones from CO | PM has flagged OR bag has hasStones=false but has stoneLedger visits (stones expected) |
| ✅ Ready for CO delivery | qcPassedAt set, pmBookDeliveredToCO=false |

**"Needs metal/stones" detection:**
- PM can manually flag from Movement tab (flag stored on bag)
- Auto-check: if pmStoneBook balance for bag = 0 and bag is in Setting — flag needs stones
- CO must respond by issuing metal/stones; flag clears when issued

**Printable** — one clean page.

---

### 26.4 Bag Progress Timeline

**Per bag, on bag detail page.**

Visual horizontal timeline showing each department leg:
- Dept name, days spent, bar proportional to time
- Colour: green = within normal, amber = slightly long, red = significantly over
- Total days elapsed vs target date at top
- Each leg shows: fromDept → toDept, issued weight, received weight, loss%

---

### 26.5 Daily Production Digest

**On-demand or end-of-day, printable one page. Accessible to CO/Admin.**

Sections:
- Today's activity: bags created, completed, metal issued/returned, net in production
- Active production: bags by department
- Overdue list with days late
- Due tomorrow (heads up)
- QC results today
- Highest loss bags today

**PM To-Do for tomorrow** — same as PM board, included at bottom so CO sees it too.

---

### 26.6 Karigar Performance Dashboard

**Ranking formula:**
```
Score = (BagsCompleted × 10) + (GramsWorked × 0.5)
      - (AvgLossPercent × 5)
      - (OverdueDaysInHands × 2)
```

**OverdueDaysInHands** — days the bag was overdue ONLY while in that specific karigar's hands.
If a bag comes back to him for repair/rework — he is responsible for those days too.
Overall bag delay caused by other departments does NOT count against him.

**Ranked within department only** — Setting vs Setting, Filing vs Filing etc.

**Display:**
- 🥇🥈🥉 medals for top 3 per dept
- Each card: name, dept, bags completed, grams worked, avg loss%, overdue penalty days, score
- Month selector + custom date range
- Visible to all roles: PM, DM, Admin, CO

---

### 26.7 Data Migration Safety

On every startup:
- Check `db.schemaVersion` against current app version
- Run migration functions for any missing fields — add defaults, never delete
- Log migration in auditLogs
- Update schemaVersion after successful migration

---

### 26.8 Auto Backup to G: Drive

- Runs nightly at 22:00 after local backup
- Target: `G:\Aurum\backups\`
- If G: unavailable — skip silently, log in auditLogs
- Keep last 30 backups on G: (auto-delete older)
- Settings shows: last G: backup timestamp

---

### 26.9 Photo on Bag Receipt

- Camera/file input on CO receipt form
- Compressed to ~100KB
- Stored in coReceipts record
- Visible in receipt history and delivery memo print

---

### 26.10 Mandatory Karigar Assignment

- Karigar required when PM issues a bag to any department
- Clear override option with reason (e.g. "dept shared, no specific karigar")
- Ensures karigar reports are reliable

---

### 26.11 Weight Gain Validation

- If received weight > issued weight by more than 2% — show warning
- Likely data entry error
- Does not block save — just alerts CO/PM

---

## 27. FEATURE BACKLOG (future)

- **WhatsApp/SMS dispatch** — send customer notification when bag completed
- **Customer portal** — read-only order status page via token link
