# AURUM PROJECT — SESSION HANDOFF DOCUMENT
**For: Next Claude session (Aurum 5)**
**Written by: Claude (Aurum 4 session)**
**Date: 18 May 2026**
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
- **Tech:** Electron 29 + React 18 + Vite 5 + Express.js
- **Location:** `D:\Aurum\aurum-desktop\`
- **Data:** `%APPDATA%\aurum\data\[company]\aurum-data.json`
- **Build:** Right-click `build-aurum.bat` → Run as Administrator
- **LAN server:** Port 3737 (HTTP)
- **package.json name:** `"aurum"` (critical)
- **MainApp.jsx:** ~19,975 lines (as of Aurum 4 session end)

### B) AUB — AURUM Business
- **Tech:** Electron 28 + React 18 + Vite 5
- **Location:** `D:\Aurum\aurum-business\`
- **Data:** `%APPDATA%\aurum-business\aurum-business.dat` (AES-256-GCM encrypted)
- **Port:** 3738
- **App.jsx:** ~4,989 lines (as of Aurum 4 session end)

### C) AUL — AURUM Lite
- **Tech:** React Native + Expo SDK 54
- **Location:** `D:\Aurum\aurum-lite\`
- **Build:** `eas build -p android --profile preview`
- **Current APK version:** 1.0.4

---

## 3. SERVER & NETWORK SETUP

### Server PC
- **OS:** Windows 10 (Build 19045)
- **IP:** `192.168.1.7` (static)
- **AURUM data path:** `C:\Users\Server\AppData\Roaming\aurum\`

### Router
- **Brand:** ZTE (model F670LV9.0) — keep this router when moving office
- **Admin URL:** `192.168.1.1` · **Firewall Level:** Middle

### WiFi Networks
| SSID | Purpose | Internet |
|------|---------|---------|
| JGPL Connect (SSID1) | Main office WiFi | Yes |
| AURUM-FLOOR (SSID3) | PM/DM phones only | Blocked |

- **AURUM-FLOOR Password:** `aurum2026`
- **Parental Control: `Ban Internet Access`** ⚠️ Never URL Whitelist — blocks port 3737
- **PM Phone MAC:** `3c:a8:0a:03:d1:8d` · Fixed IP: `192.168.1.100`
- **Windows Firewall Rule:** AURUM, Direction=In, Protocol=Any, Action=Allow

### Moving Office
- Keep same ZTE router → no changes needed when moving to new city/ISP
- If router ever changed: reconfigure static IP (192.168.1.7), PM phone MAC binding, AURUM-FLOOR SSID + parental control

---

## 4. MULTI-COMPANY ARCHITECTURE

| ID | Name | Data File |
|----|------|-----------|
| brasilgo | Brasilgo Jewels Private Limited | `%APPDATA%\aurum\data\brasilgo\aurum-data.json` |
| nimbark | Nimbark Jewels | `%APPDATA%\aurum\data\nimbark\aurum-data.json` |

- Multiple PM users supported — each unique username/password, same role

---

## 5. KEY FILES

### AUD
```
D:\Aurum\aurum-desktop\
  main.js        ← Express server + IPC handlers + help/screenshot + aub-connect
  preload.js     ← Electron IPC bridge (exposes window.aurum incl. help.*)
  src\
    MainApp.jsx  ← ALL views (~19,975 lines)
    AurumApp.jsx ← Root, auth, theme
    UserManagement.jsx ← User admin + admin password reset
```

### AUB
```
D:\Aurum\aurum-business\
  electron.js    ← Auth + displayName support
  src\App.jsx    ← ALL views (~4,989 lines)
```

### GitHub
```
https://github.com/digant-brasilgo/aurum-desktop
Push: cd /d D:\Aurum\aurum-desktop && git add . && git commit -m "..." && git push
```

---

## 6. EXTERNAL APIs

| API | Purpose | Account needed |
|-----|---------|---------------|
| metalpriceapi.com | Live gold/silver (primary) | Yes — paid |
| metals.dev | Live gold/silver (fallback) | Yes — paid |
| fawazahmed0 CDN | Free metals/currency (fallback) | No |
| gold-api.com | Free gold price (fallback) | No |
| frankfurter.app | Free USD→INR rate | No |
| news.google.com RSS | Jewellery news ticker | No |
| SomaFM (ice2.somafm.com) | Background music — 5 channels | No — free, voluntary donation |

**SomaFM channels:** Groove Salad, Drone Zone, Cliqhop, DEF CON Radio, Suburbs of Goa (Desi/Indian beats)

---

## 7. CRITICAL TECHNICAL DETAILS

### DB Safety (AUD main.js — 5 checks on POST /api/data)
1. Incoming 0 bags, server 5+ → blocked
2. Incoming <75% bag count → blocked
3. Incoming <75% transaction count → blocked
4. Incoming fewer karigars → blocked
5. Incoming size <60% → blocked

### Alloyed Metal Stock — IMPORTANT
- `PM_DELIVERY_RECV` must NEVER be created for `COMPLETED_BAG` type — fixed in both individual + bulk delivery handlers
- Extra metal comes from CO Alloyed Stock directly — PM Book must NOT be debited for extra metal — fixed
- Data fix scripts were run to clean existing incorrect entries

### Split Bag (Group) Extra Metal
- `group.currentWeight` updated when extra metal issued
- Receive validation includes extra metal in maxReceivable
- `BREAK_ISSUE` included in karigar active bag count

---

## 8. WORK COMPLETED IN AURUM 4 SESSION (10–18 May 2026)

### AUD — MainApp.jsx

**Bag Journey Map** (Movement tab — 3rd column):
- Vertical timeline showing complete bag movement history
- 3-column layout: Bag selector | Action form | Journey timeline (240px)
- Each step: coloured dot, dept name, karigar, issued/received weights, loss
- Pulsing gold animation on current step
- Pending CO delivery shows "→ CO / Awaiting receipt" not "CO ✓"
- Green connector line between completed steps
- `BagJourneyMap` component added before MovementView

**Print Sheets** (Production sidebar menu):
- "⎙ Print Sheets" tab visible to all roles (admin, CO, PM, DM)
- Prints double-sided A4 Bag Movement Record sheets
- Sheet numbers in red Courier New — auto-increments, remembers last session via localStorage
- Left margin = punch hole binding space (Side A left, Side B right)
- `PrintSheetsView` component + embedded HTML sheet
- Standalone HTML also saved at `D:\Aurum\AURUM_BagMovementSheet.html`

**Stone settlement issued pieces fix:**
- Was reading `netPieces` — fixed to read `netPieces||pieces||issuedPcs`
- Carats also fixed: `netCarats||carats`

**Split bag fixes:**
- Extra metal display: `group.currentWeight` now updated on extra metal issue
- Receive validation: `extraForThisLeg` added to maxReceivable
- Karigar count: `BREAK_ISSUE` + `db.groups` now included
- `g is not defined` crash fixed (scope bug in filter)

**Alloyed metal double credit fix:**
- `PM_DELIVERY_RECV` blocked for `COMPLETED_BAG` — both individual + bulk delivery
- PM Book extra metal debit removed (was incorrectly debiting PM Book for extra metal)
- Data fix scripts run: `fix-alloyed-double-credit.js` (v2), `fix-pmbook-extra-metal.js`

**Batch Pre-Processing:**
- PM and DM can now create batches (was admin/CO only — fixed `canEdit`)

**Help / Report Issue** (sidebar button):
- Screenshot captured + saved to Windows Desktop as PNG
- Opens WhatsApp Web with pre-filled message
- Phone number in `main.js` → search `919XXXXXXXXX` to update
- `help:captureScreen`, `help:saveScreenshot`, `help:openWhatsApp` in main.js + preload.js

**Live Ticker** (tab bar):
- Rotating quotes + SVG hexagon tile background
- Hexagons pulse via CSS `nth-child` animation

**Production Strip** (Dashboard bottom):
- Scrolling marquee of in-process bags with photos
- Click → Bags tab with bag highlighted via `navToBagId`

**SomaFM music:**
- 5th channel added: Suburbs of Goa (`ice2.somafm.com/suburbsofgoa-128-mp3`) — Desi/Indian beats
- All SomaFM channels are free (voluntary donation model, no paywall)

**AUB Connection in AUD:**
- AUD sidebar shows "⚡ AUB CONNECTED — [name]" when AUB is synced
- `aubUser` state + `aub:connected` IPC event listener in MainApp.jsx
- `/api/aub-connect` POST endpoint in main.js

### AUD — UserManagement.jsx
- 🔑 Reset Pw button (admin only) — no old password needed
- `React` import added, `onMouseDown` fix

### AUD — preload.js
- Added: `adminResetPassword`, `help.captureScreen`, `help.saveScreenshot`, `help.openWhatsApp`

### AUD — main.js
- Added: `auth:adminResetPassword`, help IPC handlers, `/api/aub-connect`, `/api/admin-reset-password`
- Fixed: `PM_DELIVERY_RECV` not created for COMPLETED_BAG
- WhatsApp phone: search `919XXXXXXXXX` to update

### AUB — App.jsx
- Design thumbnails in Sales → From Desktop (By Order + By Bag views)
- Cancelled invoice receipts reappear in From Desktop for re-invoicing
- "⚠ Invoice Cancelled — Redo" badge on affected rows
- Party delete: `deletedInAUB` flag — deleted parties hidden from list + dropdowns, never re-imported
- Auto-import on login + Sync: skips `deletedInAUB` parties, updates details of existing ones
- Party count excludes `deletedInAUB` parties
- Delete party uses `splice` (in-place mutation for proper save)
- Display name shown in top bar (from `db.settings.displayName`)
- Settings: "Your Display Name" field — sent to AUD on every sync

### AUB — electron.js
- `displayName` added to auth file
- `auth:login` returns `displayName`
- `auth:setDisplayName` IPC handler added

---

## 9. IMPORTANT WARNINGS

- **vite.config.js** — keep MINIMAL. `manualChunks` BREAKS Electron
- **MainApp.jsx.bak** — ALWAYS backup before replacing
- **G: drive xcopy** — only AFTER successful build
- **AUL Parental Control** — must be "Ban Internet Access" not URL Whitelist
- **WhatsApp phone number** — in `main.js` as `919XXXXXXXXX` — must be updated
- **Alloyed stock** — never create `PM_DELIVERY_RECV` for `COMPLETED_BAG` type
- **PM Book** — never debit for extra metal issues (extra metal comes from CO Alloyed Stock)

---

## 10. PENDING / FUTURE WORK

- **Jewellery tag printing** — TSC TTP-244, TSPL, barcode, scan-to-invoice. Deferred.
- **AUB order invoice status** — Pending/Partial/Invoiced per order. Not built.
- **AUL company logo** — still null in `/api/status`
- **AUL DM phone** — add when ready (IP .101)
- **`db.designs` cleanup** — old data, can wipe manually
- **External help web page** — for customers who can't open app (QR code)
- **Commercialisation** — see `AURUM_Commercialisation_Roadmap.md` in `D:\Aurum\`

---

## 11. HOW TO START A NEW SESSION

*"I am Digant Toshniwal from Delhi. Please read my previous AURUM conversation transcripts — look for 'AURUM' sessions. I am pasting my session handoff document. We are continuing work on AUD (AURUM Desktop/Electron), AUB (AURUM Business/Electron), and AUL (AURUM Lite/React Native Android). Latest MainApp.jsx or App.jsx will be provided when needed."*

Then paste this document.

---

## 12. REBUILD & BACKUP COMMANDS

```cmd
:: Backup MainApp FIRST
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

:: Verify server
curl http://192.168.1.7:3737/api/status
```

---

*Aurum 1 + Aurum 2 + Aurum 3 + Aurum 4 sessions complete. Next: Aurum 5*
