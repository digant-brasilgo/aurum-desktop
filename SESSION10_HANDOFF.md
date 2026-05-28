# AURUM SESSION 10 — HANDOFF DOCUMENT
**Date:** 28 May 2026
**Client:** Digant Toshniwal | **Company:** Brasilgo Jewels Private Limited
**Server:** 192.168.1.7 | AUD :3737 | AUB :3738

---

## SYSTEM STATE
- schemaVersion: 3
- MainApp.jsx: ~18,880 lines
- AUD: `D:\Aurum\aurum-desktop\`
- AUB: `D:\Aurum Business\aurum-business\`
- Data: `%APPDATA%\aurum\data\brasilgo\aurum-data.json`
- AUD uses `main.js` (NOT electron.js) | AUB uses `electron.js`
- AUB folder has SPACE: `D:\Aurum Business\`
- WiFi: AURUM-FLOOR / aurum2026 | Help WhatsApp: 919311564850

---

## SESSION 10 WORK COMPLETED

### ✅ AUL Connection Fixed
- **Root cause:** ZTE router Parental Controls "Ban Internet Access" was blocking ALL traffic including LAN
- **Fix applied:**
  - Parental Controls → OFF for PM phone
  - IP Filter rule added: `BlockPMInternet` — blocks 192.168.1.100 from WAN (internet) but allows LAN
  - DHCP Binding: PMPhneBlck → 192.168.1.100 (PM phone always gets same IP)
  - SSID Isolation → On (works fine with AUL)
- **Result:** AUL connects to server, PM has no internet access ✅

### ✅ Stone Settlement Dialog Fix (MainApp.jsx)
- **Bug:** Dialog not appearing after receiving bag from Setting dept
- **Fix 1:** `deptWasBeforeRecv` — dept captured at START of `handleReceive` before `updateDB` fires
- **Fix 2:** `triggerStoneSettle` — removed `stoneLedgerEntries.length === 0` early exit; always shows dialog when receiving from Setting
- **Fix 3:** Fixed stone totals to use raw `carats/pieces` not `netCarats/netPieces`
- **Fix 4:** Modal handles empty `byType` (no stones issued) gracefully with message

### ✅ Print Job Sheets — Set in Jwlry Carats Column (AurumPrintSheet.html)
- Added `Set in Jwlry Cts` column in Stone Record — Setting Department table
- Position: after `Set in Jwlry Pcs`, before `Returned Pcs`
- Applied to all 7 data rows + totals row

### ✅ QC Pass/Fail Flow Fix (MainApp.jsx)
- **Bug:** After receiving bag from QC, Pass/Fail buttons not appearing — bag jumped straight past QC
- **Fix 1:** After receiving from QC, mode switches to `"qc_decision"` so Choose Action panel (with Pass/Fail) becomes visible
- **Fix 2:** Cancel in QC Pass confirm screen returns to `qc_decision` (not receive form)
- **Fix 3:** After QC Pass — PM now sees **📦 Deliver to Central Office** button directly on bag panel (no need to go to PM Book tab)
- **Fix 4:** After delivery — shows "✅ Delivered to CO — awaiting CO receipt & approval."

### ✅ Print Job Sheets — Bag-Specific Sheets (MainApp.jsx)
- Two-panel layout: Generic Blank Sheets (left) + Bag-Specific Sheets (right)
- Bag list with checkboxes, Active Only / All Bags toggle
- Design photo thumbnails in bag list rows
- Sheet pre-filled with: Bag No., Design ID, Category, Customer Name, Metal Type, Purity, Issued Weight, No. of Pieces, Created Date
- Design photo printed on sheet (32×32mm box, fetched from Design Master)
- Sheet number = sequential from Starting Sheet Number (same as generic)
- Sheet numbers remembered for next session
- JOB SHEET NO. correctly shown (not SHEET NO. or JOB JOB SHEET NO.)

### ✅ AurumPrintSheet.html Updates
- `SHEET NO.` → `JOB SHEET NO.` in Side A, Side B, and JS replace pattern
- Design Photo box added to Side A BAG IDENTITY section (32×32mm)
- `Set in Jwlry Cts` column added to Stone Record table

---

## FILES DEPLOYED THIS SESSION
| File | Location |
|------|----------|
| `MainApp.jsx` | `D:\Aurum\aurum-desktop\src\` |
| `AurumPrintSheet.html` | `D:\Aurum\aurum-desktop\public\` |

---

## ROUTER SETTINGS (ZTE — 192.168.1.1)
| Setting | Value |
|---------|-------|
| SSID Isolation (AURUM-FLOOR) | ON |
| Parental Controls (PMPhneBlck) | OFF |
| IP Filter: BlockPMInternet | ON — Source 192.168.1.100/32, Egress WAN, Discard |
| DHCP Binding: PMPhneBlck | 192.168.1.100 (MAC: 3c:a8:0a:03:d1:8d) |

---

## CURRENT CORRECT BALANCES
| Metal | Balance |
|-------|---------|
| CO Alloyed Gold 18K | 12.848g |
| CO Alloyed Gold 14K | 74.682g |
| CO Alloyed Silver 925 | 1,311.405g |

---

## CRITICAL RULES (never violate)
- AUD uses `main.js` (NOT electron.js) | AUB uses `electron.js`
- AUB folder has SPACE: `D:\Aurum Business\`
- No manualChunks in vite.config.js
- `====` causes esbuild failure — check after every edit
- React hooks cannot be inside IIFE — must be at component top level
- No regex with `<` inside JSX files — use indexOf/slice instead
- `ReceiptApprovalsView` is standalone component (not IIFE)
- कारीगर (correct) not करीगर
- AUL is PM mobile app (not karigar app)
- **Deploy = copy files → run build-aurum.bat as Administrator → reopen AUD**
- **Never Ctrl+Shift+R for production builds**

---

## PENDING ITEMS

### App Features Still Pending
- Verify Print Job Sheets bag-specific photo injection working correctly after build
- Any other app-level updates before manuals

### Manuals (waiting until all app updates done)
1. Admin/CO Manual — needs full rebuild (many changes this session + previous)
2. PM Manual
3. DM Manual
4. Metal Issuer Manual
5. Stone Issuer Manual
6. Billing Executive Manual (AUB)
7. AUL Manual

---

## SESSION 10 BUILD COMMANDS
```
cd D:\Aurum\aurum-desktop
git add .
git commit -m "Session 10 - Stone settle fix, QC pass/fail flow, Print Job Sheets bag-specific with photos"
git push

copy "%APPDATA%\aurum\data\brasilgo\aurum-data.json" "%APPDATA%\aurum\data\brasilgo\aurum-data_backup_session10.json"

build-aurum.bat (as Administrator)
```
