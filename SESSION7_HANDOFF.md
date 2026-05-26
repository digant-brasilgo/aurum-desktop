# AURUM SESSION 7 HANDOFF — 26 May 2026

## FILES TO DEPLOY
| File | Location |
|------|----------|
| MainApp.jsx | D:\Aurum\aurum-desktop\src\ |
| main.js | D:\Aurum\aurum-desktop\ |
| preload.js | D:\Aurum\aurum-desktop\ |
| App.jsx | D:\Aurum Business\aurum-business\src\ |
| AurumJobSheet.html → rename AurumPrintSheet.html | D:\Aurum\aurum-desktop\public\ |

## COMPLETED TODAY

### Bug Fixes
- Receipt Approval black screen — fixed by extracting IIFE into proper ReceiptApprovalsView component
- Inter-dept receipts restored to immediate (no CO approval for Filing→PM→Setting etc.)
- user not defined crash in CentralOfficeView — added user to props
- ==== (quadruple equals) build errors — fixed

### Major Feature Changes
- **Receipt Approvals tab** — now handles final jewellery + loose metal from PM. Shows two sections: pending jewellery (pmBookDeliveredToCO) and pending metal deliveries. "✅ Approve & Receive" credits coAlloyedStock directly
- **Receive Jewellery + Receive Metal tabs** — removed from CO menu (merged into Receipt Approvals)
- **Mark Delivered** — now available directly in Receipt History without Finalise first
- **Customer Delivery Memo → Delivery Memo** — renamed. Removed Invoice No and GSTIN fields. Light background for legibility
- **View Memo → View Production Sheet** — renamed. AURUM branding moved to top-left small. "PRODUCTION SHEET" as main heading
- **Generate Invoice → Delivery Memo** button in Receipt History
- **Print Sheets → Print Job Sheets** — renamed. SHEET NO. → JOB SHEET NO.
- **Design photos** — added in Receipt History cards, Production Sheet, Delivery Memo data entry
- **A4 print** — both Production Sheet and Delivery Memo now print via clean new window with proper @page margins
- **Help & Support button** — bottom of sidebar. Takes screenshot + opens WhatsApp to 919311564850
- **Desktop notifications** — 5 alert types. Electron IPC handler added to main.js
- **Standalone Karigar Metal Return** — PM Book → ↩ Receive from Karigar
- **CO Receive Metal actual weight** — CO can enter different weight from PM's submission
- **Bag-specific Print Sheets** — with design photo from Design Master

### Data Fix
- Duplicate coAlloyedStock entries found: BGS-CH1 (42.072g Silver) + BGG-ER3 (2.938g 14K Gold)
- Fix script: fix-duplicate-receipts.js — run with `node fix-duplicate-receipts.js` from AUD folder
- After fix: Silver 925 → 1311.405g, Gold 14K → 74.682g

### AUB Changes (App.jsx)
- Customer gold deduction line auto-added in AUB invoice when custGoldDeduction exists in savedInvoiceData
- savedInvoiceData now includes full customer gold reconciliation fields

## SYSTEM STATE
- schemaVersion: 3 (was v2 in old backups — ignore old bak files)
- MainApp.jsx: ~21,140 lines
- App.jsx: ~5,737 lines
- AUD: D:\Aurum\aurum-desktop\ | Port 3737
- AUB: D:\Aurum Business\aurum-business\ | Port 3738
- Data: %APPDATA%\aurum\data\brasilgo\aurum-data.json
- Server: 192.168.1.7 | WiFi: AURUM-FLOOR / aurum2026
- Help WhatsApp: 919311564850

## BALANCES VERIFIED (26 May 2026)
- CO Alloyed Gold 18K: 12.848g ✓
- CO Alloyed Gold 14K: 77.620g ✓ (74.682g after duplicate fix)
- CO Alloyed Silver 925: 1353.477g ✓ (1311.405g after duplicate fix)
- PM Book Silver: 173.214g ✓
- PM Book Gold 18K: 129.408g ✓
- PM Book Gold 14K: 15.979g ✓

## PENDING NEXT SESSION
1. Run fix-duplicate-receipts.js (if not done)
2. Rebuild Admin/CO manual — many changes today affect it
3. Build 6 remaining manuals:
   - PM — Production Manager
   - DM — Data Manager
   - Metal Issuer
   - Stone Issuer
   - Billing Executive (AUB)
   - AUL — AURUM Lite (PM mobile)

## CRITICAL RULES
- AUD uses main.js (NOT electron.js). AUB uses electron.js
- AUB folder has SPACE: D:\Aurum Business\
- No manualChunks in vite.config.js
- ==== causes esbuild failure — check after every edit
- React hooks cannot be inside IIFE — must be at component top level
- कारीगर (correct) not करीगर
- AUL is PM mobile app (not karigar app)
