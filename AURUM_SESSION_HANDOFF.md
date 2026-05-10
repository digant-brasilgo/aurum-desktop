# AURUM PROJECT — SESSION HANDOFF DOCUMENT
**For: Next Claude session (Aurum 4)**
**Written by: Claude (Aurum 3 session)**
**Date: 10 May 2026**
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
- **GitHub:** digant-brasilgo (repo: aurum-desktop, pushed and synced)

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
- **MainApp.jsx:** ~19,035 lines (cleaned in Aurum 3)

### B) AUB — AURUM Business
- **What:** Financial management companion to AUD (invoicing, ledger, payments)
- **Tech:** Electron 28 + React 18 + Vite 5
- **Location:** `D:\Aurum\aurum-business\`
- **Data:** `%APPDATA%\aurum-business\aurum-business.dat` (AES-256-GCM encrypted)
- **Auth:** `%APPDATA%\aurum-business\aurum-business-auth.json`
- **Port:** 3738
- **Users:** Admin and CO only
- **AUB App.jsx:** ~4,909 lines

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
  main.js                ← Express server + safety checks + price fetching
  preload.js             ← Electron IPC bridge (exposes window.aurum)
  vite.config.js         ← Minimal safe config (base: './', outDir: 'dist')
  src\
    MainApp.jsx          ← ALL views (~19,035 lines)
    AurumApp.jsx         ← Root, auth, theme, company switching
    UserManagement.jsx   ← User admin with admin password reset
```

### AUB
```
D:\Aurum\aurum-business\
  electron.js            ← Encrypted data handling
  src\App.jsx            ← ALL views (~4,909 lines)
```

### AUL
```
D:\Aurum\aurum-lite\
  app.json               ← version 1.0.4, versionCode 4
  assets\icon.png        ← AURUM Lite logo 1024x1024
  src\utils\api.js       ← 3000ms timeout, isCheckingRef guard
  src\screens\LoginScreen.js
```

### Backups
```
%APPDATA%\aurum\data\brasilgo\backups\   ← Hourly, keep 30
G:\Aurum\backups\brasilgo\
G:\Aurum\aurum-desktop\                  ← Source backup (xcopy)
G:\Aurum\aurum-lite\
G:\Aurum\aurum-business\
D:\Aurum\aurum-desktop\src\MainApp.jsx.bak  ← Always keep before replacing!
```

### GitHub
```
https://github.com/digant-brasilgo/aurum-desktop
Push command: cd /d D:\Aurum\aurum-desktop && git add . && git commit -m "..." && git push
```

---

## 6. EXTERNAL APIs USED IN AUD

All keys stored in AUD Settings (not hardcoded):

| API | Purpose | Account needed | Key field in Settings |
|-----|---------|---------------|----------------------|
| metalpriceapi.com | Live gold/silver prices (primary) | Yes — paid | `metalPriceApiKey` |
| metals.dev | Live gold/silver prices (fallback) | Yes — paid | `metalsDevApiKey` |
| fawazahmed0 CDN (jsdelivr) | Free metals/currency (fallback) | No | — |
| gold-api.com | Free gold price (fallback) | No | — |
| frankfurter.app | Free USD→INR rate | No | — |
| news.google.com RSS | Jewellery news ticker | No | — |

⚠️ App works without paid API keys — falls back to free sources automatically.

---

## 7. CRITICAL TECHNICAL DETAILS

### DB Safety (AUD main.js — 5 checks on POST /api/data)
1. Incoming has 0 bags, server has 5+ → blocked
2. Incoming has <75% of current bag count → blocked
3. Incoming has <75% of current transaction count → blocked
4. Incoming has fewer karigars → blocked
5. Incoming size <60% of current → blocked

### Weight Precision
- `round3(n)` = `Math.round(n * 1000) / 1000`
- Applied at all weight storage points — prevents floating point drift

### Key Data Concepts
- **Bag:** 1 bag = 1 design in production. No `itemId` (removed). Bag No. is the identifier.
- **Order:** Multiple bags, same `orderNo`. Items store qty, metalType, purity, partsPerUnit.
- **Qty ×2:** Stored as single entry with qty=2, shown as ×2 badge.
- **Unbagged items:** Decrement as bags created, disappear when all done.
- **Design Master:** `db.designMaster` = active. `db.designs` = old (ignored).
- **Batch Filing:** `db.batchFilings` = unnumbered casting batches before bags are created.

### AUB ↔ AUD
- AUB syncs via `http://localhost:3737/api/data`
- CO receipts → AUB Sales → From Desktop
- By Order view: groups by orderNo, checkboxes, one invoice per order
- By Bag view: individual receipts

### AUL Connection
- Timeout: 3000ms, isCheckingRef guard prevents race condition
- Works on AURUM-FLOOR WiFi only
- Parental Control must be "Ban Internet Access" (not URL Whitelist)

---

## 8. WORK COMPLETED IN AURUM 3 SESSION (10 May 2026)

### AUD — New Features (MainApp.jsx)

**Batch Pre-Processing tab** (inside Bags tab):
- New sub-tab "⬡ Batch Pre-Processing" for unnumbered casting batches
- Create batch: name, metal, purity, issued weight, dept, karigar
- Receive back: enter received weight → loss auto-posted to karigar ledger + PM Book
- Edit batch (locked fields after receiving)
- Reverse batch (Issued: full delete / Received: removes loss entry, resets to Issued)
- Mark Settled manually
- "Create Bags from Batch" button → switches to Bags tab
- `db.batchFilings[]` new collection added to initDB

**Automations:**
1. **Auto-complete Order** — when last bag delivered to CO, order status → Completed automatically
2. **QC Pass → Auto-deliver** — after QC Pass, prompt "Deliver to CO now?" Y/N
3. **Karigar Loss Auto-alert** — after receiving, if loss% > dept threshold → alert with month-to-date cumulative
4. **PM Book Reconciliation** — ⚖ Reconcile button, proper modal with table (Ledger High / Physical High / Ledger Deficit)
5. **Customer Gold Auto-settlement** — after CO receipt finalise, if customer pure gold balance = 0 → prompt to mark settled (uses PURITY_FACTORS conversion)
6. **Stone Settlement Modal** — auto-triggered when receiving bag from Setting dept — enter set/returned/broken stones inline

**Other fixes:**
- Sticker print gap removed (fixed height removed from sticker cells)
- Cosmetic improvements: darker theme, better shadows, smoother transitions, gold gradient accents, nav hover glow, badge padding

**Code cleanup:**
- Removed 8 dead functions (191 lines): `isRepairItem`, `generateItemId`, `generateDesignNo`, `loadFromStorage`, `saveToStorage`, `DesignGalleryTab`, `compressImage`, `DesignThumb`

### AUD — UserManagement.jsx
- Added **🔑 Reset Pw** button (admin only) — reset any user's password without knowing old password
- Added `React` import (was missing)
- Uses `onMouseDown` to avoid focus-blur click issue

### AUD — preload.js
- Added `adminResetPassword` to `window.aurum.auth` bridge

### AUD — main.js
- Added `auth:adminResetPassword` IPC handler
- Added `/api/admin-reset-password` HTTP route (admin only)
- Added two safe background throttling flags
- ⚠️ vite.config.js must stay minimal (base: './', outDir: 'dist') — chunk splitting breaks Electron

### GitHub
- First push to digant-brasilgo/aurum-desktop
- `.gitignore` excludes: node_modules/, dist/, release/

---

## 9. IMPORTANT WARNINGS

- **vite.config.js** — keep MINIMAL. Any `manualChunks` or chunk splitting BREAKS the app (Electron can't load split chunks via file://)
- **MainApp.jsx.bak** — ALWAYS backup before replacing: `copy "D:\Aurum\aurum-desktop\src\MainApp.jsx" "D:\Aurum\aurum-desktop\src\MainApp.jsx.bak"`
- **G: drive xcopy** — only run AFTER a successful build, not before
- **AUL Parental Control** — must be "Ban Internet Access". URL Whitelist blocks port 3737.

---

## 10. PENDING / FUTURE WORK

- **Jewellery tag printing** — TSC TTP-244, TSPL, barcode, scan-to-invoice. Deferred.
- **AUB order invoice status** — Pending/Partial/Invoiced per order. Not built.
- **AUL company logo** — still null in `/api/status`
- **AUL DM phone** — add when ready (IP .101, same router setup)
- **`db.designs` cleanup** — old Item Register data in DB, can wipe manually
- **Commercialisation** — see `AURUM_Commercialisation_Roadmap.md` in D:\Aurum\

---

## 11. HOW TO START A NEW SESSION

*"I am Digant Toshniwal from Delhi. Please read my previous AURUM conversation transcripts — look for 'AURUM' sessions. I am pasting my session handoff document. We are continuing work on AUD (AURUM Desktop/Electron), AUB (AURUM Business/Electron), and AUL (AURUM Lite/React Native Android). Latest MainApp.jsx or App.jsx will be provided when needed."*

Then paste this document.

---

## 12. REBUILD & BACKUP COMMANDS

```cmd
:: Backup MainApp FIRST before replacing
copy "D:\Aurum\aurum-desktop\src\MainApp.jsx" "D:\Aurum\aurum-desktop\src\MainApp.jsx.bak"

:: AUD rebuild
Right-click D:\Aurum\aurum-desktop\build-aurum.bat → Run as Administrator

:: AUB rebuild
cd /d D:\Aurum\aurum-business && npm run build && npx electron-builder --win --x64

:: AUL rebuild
cd /d D:\Aurum\aurum-lite && eas build -p android --profile preview

:: G: drive backup (after successful build only)
xcopy "D:\Aurum\aurum-desktop" "G:\Aurum\aurum-desktop" /E /I /H /Y
xcopy "D:\Aurum\aurum-lite" "G:\Aurum\aurum-lite" /E /I /H /Y
xcopy "D:\Aurum\aurum-business" "G:\Aurum\aurum-business" /E /I /H /Y

:: GitHub push
cd /d D:\Aurum\aurum-desktop
git add .
git commit -m "Describe changes"
git push

:: Verify server running
curl http://192.168.1.7:3737/api/status

:: Verify firewall rule
netsh advfirewall firewall show rule name="AURUM"

:: PM Book reconcile test
Open AUD → PM Book → ⚖ Reconcile button
```

---

*Aurum 1 + Aurum 2 + Aurum 3 sessions complete. Next: Aurum 4*
