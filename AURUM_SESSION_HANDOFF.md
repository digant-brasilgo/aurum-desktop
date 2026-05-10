# AURUM PROJECT — SESSION HANDOFF DOCUMENT
**For: Next Claude session (Aurum 3)**
**Written by: Claude (Aurum 2 session)**
**Date: 5 May 2026**
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
- **GitHub:** digant-brasilgo

---

## 2. THE THREE APPS

### A) AUD — AURUM Desktop
- **What:** Full jewellery production management system
- **Tech:** Electron 29 + React 18 + Vite 5 + Express.js
- **Location:** `D:\Aurum\aurum-desktop\`
- **Data:** `%APPDATA%\aurum\data\[company]\aurum-data.json`
- **Build:** Right-click `build-aurum.bat` → Run as Administrator
- **Runs on:** Server PC (Windows 10)
- **LAN server:** Port 3737 (HTTP)
- **package.json name:** `"aurum"` (critical — determines userData path)

### B) AUB — AURUM Business
- **What:** Financial management companion to AUD (invoicing, ledger, payments)
- **Tech:** Electron 28 + React 18 + Vite 5
- **Location:** `D:\Aurum\aurum-business\`
- **Data:** `%APPDATA%\aurum-business\aurum-business.dat` (AES-256-GCM encrypted)
- **Auth:** `%APPDATA%\aurum-business\aurum-business-auth.json`
- **Port:** 3738
- **Users:** Admin and CO only

### C) AUL — AURUM Lite
- **What:** Android mobile app for PM/DM on shop floor
- **Tech:** React Native + Expo SDK 54
- **Location:** `D:\Aurum\aurum-lite\`
- **Build:** `eas build -p android --profile preview`
- **Expo account:** digant-brasilgo (Google login)
- **Current APK version:** 1.0.4 (icon + connection fix)

---

## 3. SERVER & NETWORK SETUP

### Server PC
- **OS:** Windows 10 (Build 19045)
- **IP:** `192.168.1.7` (static)
- **AURUM data path:** `C:\Users\Server\AppData\Roaming\aurum\`

### Router
- **Brand:** ZTE (model F670LV9.0)
- **Admin URL:** `192.168.1.1`
- **Firewall Level:** Middle

### WiFi Networks
| SSID | Purpose | Internet |
|------|---------|---------|
| JGPL Connect (SSID1) | Main office WiFi | Yes |
| AURUM-FLOOR (SSID3) | PM/DM phones only | Blocked |

### AURUM-FLOOR Setup
- SSID Isolation: On (fine — does not block phone→server LAN)
- **Password: `aurum2026`**
- **Parental Control: `Ban Internet Access`** ⚠️ Never change to URL Whitelist — blocks port 3737

### PM Phone
- **MAC:** `3c:a8:0a:03:d1:8d`
- **Fixed IP:** `192.168.1.100`
- When reconnecting: forget → reconnect → Advanced → Device MAC → "Stay Connected"

### Windows Firewall
- Rule name: AURUM, Direction=In, Protocol=Any, Action=Allow

---

## 4. MULTI-COMPANY ARCHITECTURE

| ID | Name | Data File |
|----|------|-----------|
| brasilgo | Brasilgo Jewels Private Limited | `%APPDATA%\aurum\data\brasilgo\aurum-data.json` |
| nimbark | Nimbark Jewels | `%APPDATA%\aurum\data\nimbark\aurum-data.json` |

- Company registry: `%APPDATA%\aurum\aurum-companies.json`
- Users: `%APPDATA%\aurum\aurum-users.json`
- Roles: admin, co, production_manager, data_manager

---

## 5. KEY FILES

### AUD
```
D:\Aurum\aurum-desktop\
  main.js              ← Express server + safety checks
  src\MainApp.jsx      ← ALL views (~18,436 lines)
  src\AurumApp.jsx     ← Root, auth, theme
```

### AUB
```
D:\Aurum\aurum-business\
  electron.js          ← Encrypted data handling
  src\App.jsx          ← ALL views (~4,909 lines)
```

### AUL
```
D:\Aurum\aurum-lite\
  app.json             ← version 1.0.4, versionCode 4
  assets\icon.png      ← AURUM Lite logo 1024x1024
  src\utils\api.js     ← 3000ms timeout, isCheckingRef guard
  src\screens\LoginScreen.js
```

### Backups
```
%APPDATA%\aurum\data\brasilgo\backups\   ← Hourly, keep 30
G:\Aurum\backups\brasilgo\
G:\Aurum\aurum-desktop\                  ← Source backup
G:\Aurum\aurum-lite\
G:\Aurum\aurum-business\
```

---

## 6. CRITICAL TECHNICAL DETAILS

### DB Safety (AUD main.js — 5 checks on POST /api/data)
1. Incoming has 0 bags, server has 5+ → blocked
2. Incoming has <75% of current bag count → blocked
3. Incoming has <75% of current transaction count → blocked
4. Incoming has fewer karigars → blocked
5. Incoming size <60% of current → blocked

### Weight Precision
- `round3(n)` = `Math.round(n * 1000) / 1000`
- Applied at all weight storage points — prevents floating point drift

### Data Concepts
- **Bag:** 1 bag = 1 design in production. No `itemId` (removed). Bag No. is the identifier.
- **Order:** Multiple bags, same `orderNo`. Items store qty, metalType, purity, partsPerUnit.
- **Qty ×2:** Stored as single entry with qty=2, shown as ×2 badge. Not duplicated.
- **Unbagged items:** Decrement as bags created, disappear when all done.
- **Design Master:** `db.designMaster` = active system. `db.designs` = old (ignored).

### AUB ↔ AUD
- AUB syncs via `http://localhost:3737/api/data`
- CO receipts → AUB Sales → From Desktop
- **By Order view:** Groups receipts by orderNo, checkboxes, one invoice per order
- **By Bag view:** Individual receipts, original behaviour

---

## 7. WORK COMPLETED IN AURUM 2 SESSION (5 May 2026)

### AUD (MainApp.jsx)
- Design Master category dropdown — reads from `db.categories`
- Design Prefix removed from categories (redundant)
- Bags tab — grid/list toggle with photo cards
- Item Register tab removed
- Edit Bag — photo upload added
- `round3()` — weight precision fixed (PM weight drift bug)
- Customer edit — fixed as modal (was never working)
- Order form — Metal, Purity, Qty, Parts/Unit per item
- `itemId` removed completely (bags, orders, UI, matching logic)
- Qty shown as ×2 badge — no duplication
- Unbagged items decrement per bag created
- Cancel Order — blocks if bags exist
- Delete Cancelled Order
- Order status badge — Cancelled in red

### AUD (main.js)
- Safety checks: 2 → 5 blocks
- Fixed duplicate `currentSize` syntax error

### AUB (App.jsx)
- `handleImportFromDesktopMulti()` — multi-receipt order invoice
- `PendingReceiptsPanel` — By Order / By Bag toggle
- By Order — grouping, checkboxes, order-level invoice
- By Bag — original view preserved
- Order No. badge shown on bag rows

### AUL
- Timeout 5000→3000ms
- `isCheckingRef` race condition fix
- App icon added (AURUM Lite logo)
- APK v1.0.4 built and installed

### Network
- Parental Control: URL Whitelist → Ban Internet Access (was blocking port 3737)

---

## 8. PENDING / FUTURE WORK

- **Jewellery tag printing** — TSC TTP-244, TSPL commands, barcode, scan-to-invoice. Discussed, deferred.
- **AUB order invoice status** — Pending/Partial/Invoiced tracking per order. Not yet built.
- **AUL company logo** — still null in `/api/status`
- **AUL DM phone** — add when ready (IP .101, same router setup)
- **`db.designs` cleanup** — old data still in DB, can be wiped manually

---

## 9. HOW TO START A NEW SESSION

*"I am Digant Toshniwal from Delhi. Please read my previous AURUM conversation transcripts — look for 'AURUM' sessions. I am pasting my session handoff document. We are continuing work on AUD (AURUM Desktop/Electron), AUB (AURUM Business/Electron), and AUL (AURUM Lite/React Native Android). Latest MainApp.jsx or App.jsx will be provided when needed."*

Then paste this document.

---

## 10. REBUILD COMMANDS

```cmd
:: AUD
Right-click D:\Aurum\aurum-desktop\build-aurum.bat → Run as Administrator

:: AUB
cd D:\Aurum\aurum-business && npm run build && npx electron-builder --win --x64

:: AUL
cd D:\Aurum\aurum-lite && eas build -p android --profile preview

:: Tests
cd D:\Aurum\aurum-tests && npm test

:: G: drive backup
xcopy "D:\Aurum\aurum-desktop" "G:\Aurum\aurum-desktop" /E /I /H /Y
xcopy "D:\Aurum\aurum-lite" "G:\Aurum\aurum-lite" /E /I /H /Y
xcopy "D:\Aurum\aurum-business" "G:\Aurum\aurum-business" /E /I /H /Y

:: Verify server
curl http://192.168.1.7:3737/api/status
```

---

*Aurum 1 + Aurum 2 sessions complete. Next: Aurum 3*
