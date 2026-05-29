# AURUM SESSION 11 — HANDOFF DOCUMENT
**Date:** 29 May 2026
**Client:** Digant Toshniwal | **Company:** Brasilgo Jewels Private Limited
**Server PC:** 192.168.1.7 | AUD :3737 | AUB :3738 | Print Agent :3739
**PM PC:** 192.168.1.9

---

## SYSTEM STATE
- schemaVersion: 3
- MainApp.jsx: ~19,455 lines
- AUD: `D:\Aurum\aurum-desktop\` | main.js (NOT electron.js)
- AUB: `D:\Aurum Business\aurum-business\` | electron.js | folder has SPACE
- Data: `%APPDATA%\aurum\data\brasilgo\aurum-data.json`
- WiFi: AURUM-FLOOR / aurum2026 | Help WhatsApp: 919311564850
- Print Agent: `C:\Aurum-Print\` on PM's PC (192.168.1.9:3739)

---

## SESSION 11 WORK COMPLETED

### ✅ Ready Stock Register — Metal Accounting Fixed
- "🏷 → Ready Stock" button now correctly **debits coAlloyedStock** (READY_STOCK_TRANSFER OUT) when moving bag to Ready Stock
- Gemstone Ledger (coStoneStock) stays untouched when moving to Ready Stock ✅
- Stones only leave Gemstone Ledger when delivered/sold to customer ✅

### ✅ Ready Stock Register — Return to Alloyed Stock
- **↩ Return to Alloyed** button added to each stock item
- Reason selector: Melted/Broken | Data Entry Mistake | Other
- Credits coAlloyedStock back (READY_STOCK_RETURN IN) for net metal weight
- Removes item from Ready Stock Register
- Gemstone Ledger untouched ✅
- Audit log entry created ✅

### ✅ Full Metal + Stone Accounting Flow (Confirmed Correct)
| Event | Alloyed Metal Register | Gemstone Ledger |
|-------|----------------------|-----------------|
| CO receives from PM | IN (net metal) | IN (stones set in jewellery) |
| Move to Ready Stock | OUT (net metal) | No change |
| Return to Alloyed Stock | IN (net metal) | No change |
| Deliver/Sell to customer | OUT (net metal) | OUT (stones) |

### ✅ Direct TSPL Printing — Print Agent Built
- `aurum-print-agent.js` v1.1 — runs on PM's PC (192.168.1.9:3739)
- Sends TSPL to TSC TTP-244 Pro via **USB001** directly
- `START_PRINT_AGENT.bat` — startup script for PM's PC
- Both files in `C:\Aurum-Print\` on PM's PC
- Agent running and confirmed connected from AUD ✅
- TSPL being sent and received by printer (USB001 copy success) ✅

### ⚠️ TSC Printer Not Printing — PENDING
- TSPL reaches printer (log shows "1 file(s) copied" to USB001) ✅
- But nothing prints — printer receives data but doesn't output
- Manual test.prn also copied but nothing printed
- **Next session:** Check TSC Console settings, verify label size config, test self-print (hold button 3 sec)
- May need TSC Console software installed on PM's PC to configure printer
- Download: https://www.tscprinters.com/cms/en/support/download

---

## READY STOCK REGISTER — FULL FEATURE STATE
- Tab: CO → 🏷 Ready Stock
- Summary cards: Available Pieces, Total Stock Value, Total Items
- Views: Available / Sold / All
- Per item: Design photo, Bag ID, Design ID, Category, Metal/Purity, Gross/Net/Stone weights, Units, Price (editable), Unit barcodes
- Actions: ✏ Price | 🏷 Print Tag | ↩ Return to Alloyed
- Print Tag modal: Agent status, Printer selector, Face 1/2 preview, Unit selector, Direct TSPL print button
- "🏷 → Ready Stock" in Receipt History: inline price input, creates stock entry + debits alloyed metal
- "🏷 In Ready Stock" badge shows on receipts already in stock

### Tag Design (100×15mm × 2 faces + tail)
- **Face 1:** Barcode (Code128: BGG-R5-U1) | Design ID | Purity + Metal | Category + Unit | Price (large)
- **Face 2:** Gross weight | Net metal weight | Stone weight + Carats (if hasStones) | BRASILGO AURUM
- Tail: goes inside jewellery loop, two faces paste outward face-to-face
- TSPL uses `String.fromCharCode(34)` for quotes to avoid JSX parse issues
- Label size: 100mm × 57mm (15mm face1 + 1mm fold + 15mm face2 + 26mm tail)

### Barcode Scan Listener (Global — AUD)
- Detects rapid keystrokes (scanner < 80ms/char, min 5 chars + Enter)
- Extracts bagId: BGG-R5-U1 → BGG-R5
- Shows popup bottom-right: photo + weights + price + "→ Open in Movement"

---

## PRINT AGENT — TECHNICAL DETAILS
- Location on PM's PC: `C:\Aurum-Print\aurum-print-agent.js`
- Startup: `C:\Aurum-Print\START_PRINT_AGENT.bat`
- Port: 3739
- USB Port: USB001 (TSC TTP-244 Pro)
- Printer name: `TSC TTP-244 Pro`
- PM PC hostname: DESKTOP-G2TJ6G7
- Log: `C:\Users\user\Desktop\aurum-print-agent.log`
- Endpoints: GET /status | GET /printers | POST /print (body: {tspl, printer?})

---

## ROUTER SETTINGS (ZTE — 192.168.1.1)
| Setting | Value |
|---------|-------|
| SSID Isolation (AURUM-FLOOR) | ON |
| Parental Controls (PMPhneBlck) | OFF |
| IP Filter: BlockPMInternet | ON — 192.168.1.100 → WAN blocked |
| DHCP Binding: PMPhneBlck | 192.168.1.100 (MAC: 3c:a8:0a:03:d1:8d) |

---

## CURRENT CORRECT BALANCES
| Metal | Balance |
|-------|---------|
| CO Alloyed Gold 18K | 12.848g (minus any moved to Ready Stock) |
| CO Alloyed Gold 14K | 74.682g (minus any moved to Ready Stock) |
| CO Alloyed Silver 925 | 1,311.405g (minus any moved to Ready Stock) |

*Note: 2 test items were moved to Ready Stock for printing test — use ↩ Return to Alloyed to restore*

---

## PENDING — SESSION 12

### Priority 1 — Fix TSC Printing
1. Install TSC Console on PM's PC (tscprinters.com)
2. Configure label size: 100mm × 57mm, Gap 2mm
3. Test self-print (hold button 3 sec on printer)
4. Verify TSPL commands are correct for this printer model
5. May need to adjust TSPL SIZE/GAP commands

### Priority 2 — AUB Barcode Scan Integration
- Scan in AUB → auto-fill billing line item
- Price editable per customer
- On sale: POST to AUD API → update bag stockSoldAt, stockSoldTo

### Priority 3 — Manuals (waiting for all app updates)
Admin/CO, PM, DM, Metal Issuer, Stone Issuer, Billing Executive, AUL

---

## CRITICAL RULES (never violate)
- AUD uses `main.js` (NOT electron.js) | AUB uses `electron.js`
- AUB folder has SPACE: `D:\Aurum Business\`
- No manualChunks in vite.config.js
- No `====` in JSX/JS (outside comments)
- No regex with `<` inside JSX — use indexOf/slice
- No IIFE `{(()=>{})()}` inside `.map()` — use `arr.map(item=>{ const x=...; return(...); })`
- No React hooks inside IIFE — must be proper standalone components
- `prompt()` blocked in Electron — use inline forms
- No `String` template literals with `<` in JSX — use String.fromCharCode(34) for quotes in TSPL
- **Deploy = copy files → run `build-aurum.bat` as Administrator → reopen AUD**
- **No Ctrl+Shift+R for production**
- **No Secure_Aurum.bat — use manual CMD xcopy commands**

---

## DAILY BACKUP PROCEDURE
1. Generate SESSION handoff (Claude generates, download it)
2. Copy MainApp.jsx.bak: `copy /Y "D:\Aurum\aurum-desktop\src\MainApp.jsx" "D:\Aurum\aurum-desktop\src\MainApp.jsx.bak"`
3. xcopy AUD: `xcopy "D:\Aurum" "G:\Aurum" /E /H /C /I /Y`
4. xcopy AUB: `xcopy "D:\Aurum Business" "G:\Aurum Business" /E /H /C /I /Y`
5. GitHub: `cd D:\Aurum\aurum-desktop && git add . && git commit -m "Session 11" && git push`
