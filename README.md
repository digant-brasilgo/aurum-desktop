# AURUM Desktop — Setup & Deployment Guide
## Brasilgo Jewels Private Limited

---

## WHAT'S IN THIS FOLDER

```
aurum-desktop/
├── main.js              — Electron window and app controller
├── preload.js           — Secure bridge (Electron ↔ React)
├── server.js            — LAN server (for multi-user setup)
├── database.js          — SQLite data layer
├── auth.js              — User login and roles
├── backup.js            — Auto-backup scheduler
├── package.json         — Project dependencies
├── vite.config.js       — Build configuration
├── index.html           — App entry point
├── src/
│   ├── main.jsx         — React entry
│   ├── AurumApp.jsx     — Root app with auth
│   ├── MainApp.jsx      — Your full jewellery tracker
│   ├── LoginScreen.jsx  — Login UI
│   ├── LiveTicker.jsx   — Header with clock, prices, user
│   ├── useAurumData.js  — Universal data layer
│   └── UserManagement.jsx — User admin panel
├── setup.bat            ← Run this FIRST on every PC
├── start-standalone.bat ← Single PC mode
├── start-server.bat     ← LAN server mode
├── start-client.bat     ← LAN client mode
└── build-installer.bat  ← Create .exe installer
```

---

## STEP 1 — INSTALL NODE.JS (one-time, every PC)

1. Go to **https://nodejs.org**
2. Download the **LTS** version (e.g. v20.x or v22.x)
3. Install with all defaults
4. Restart your PC after installation

---

## STEP 2 — SETUP AURUM (one-time, every PC)

1. Copy the entire `aurum-desktop` folder to the PC
   - Recommended: `C:\AURUM\` or `C:\Users\YourName\Documents\AURUM\`
2. Double-click **`setup.bat`**
3. Wait for it to finish (5–10 minutes first time, downloads dependencies)
4. If any error appears, check your internet connection and try again

---

## STEP 3 — CHOOSE YOUR MODE

### MODE A: Standalone (Single PC)
- All data stored only on this PC
- Good for: testing, single operator, offline use
- Double-click **`start-standalone.bat`**

### MODE B: LAN Server + Clients (Multi-user)
- One PC runs the server, others connect to it
- Good for: multiple operators, production use

**On the SERVER PC:**
1. Double-click **`start-server.bat`**
2. Note the Network URL shown (e.g. `http://192.168.1.100:3737`)
3. Keep this window open while working

**On each CLIENT PC:**
1. Run `setup.bat` on that PC too (one-time)
2. Double-click **`start-client.bat`**
3. Enter the server URL when asked
4. It remembers the URL next time

---

## STEP 4 — FIRST LOGIN

- Username: `admin`
- Password: `admin123`
- **Change the admin password immediately** from Settings → User Management

---

## STEP 5 — ADD USERS

In AURUM → Settings → User Management → + Add User

| Role | Who uses it | Access |
|------|-------------|--------|
| Administrator | Owner / IT | Everything |
| Supervisor | Senior manager | All operations, no user management |
| Central Office | CO staff | CO receipts, invoices, pure metal |
| Floor Operator | Production staff | Movement, bags, stones |
| View Only | Accountant / auditor | Read only |

---

## STEP 6 — MIGRATE EXISTING DATA

If you have data in the browser version:

1. In the browser, click **↓ Export Backup**
2. In AURUM Desktop, go to **Data menu → Import JSON**
3. Select the exported file
4. All data migrates automatically

---

## DAILY USE

- AURUM auto-saves every 500ms
- Auto-backup runs every night at 10:00 PM to the Backups folder
- Manual backup: **Data menu → Backup Now** (or Ctrl+S)
- View backups: **Data menu → Open Backup Folder**
- Restore: **Data menu → Restore from Backup**

---

## DATA LOCATIONS

| Item | Location |
|------|----------|
| Database | `C:\Users\YourName\AppData\Roaming\AURUM\aurum.db` |
| Backups | `C:\Users\YourName\AppData\Roaming\AURUM\backups\` |
| Config | `C:\Users\YourName\AppData\Roaming\AURUM\config.json` |

To find your AppData folder: Open File Explorer, type `%appdata%\AURUM` in the address bar.

---

## BUILDING THE .EXE INSTALLER

To create a distributable installer:
1. Double-click **`build-installer.bat`**
2. Wait ~5 minutes
3. Find `AURUM-Setup-1.0.0.exe` in the `release` folder
4. Copy this .exe to any PC and install — no Node.js needed on client PCs

---

## LAN NETWORK REQUIREMENTS

- All PCs must be on the **same local network** (wired Ethernet recommended)
- Server PC should have a **static local IP** (set in your router)
- Port **3737** must not be blocked by Windows Firewall
  - When prompted by Windows Firewall, click **Allow Access**
- No internet required for operation (only for live gold/silver prices)

---

## GOLD/SILVER LIVE PRICES

Prices are fetched from a free public API and displayed in the header.
- Updates every 5 minutes
- Shows in INR per gram (converted from USD spot price)
- If no internet: shows dashes (—), all other features work normally
- For exact MCX prices: configure your preferred API in `src/LiveTicker.jsx`

---

## MAKING CODE UPDATES

After receiving updated code files:

1. Stop AURUM if running
2. Replace the changed files in the `aurum-desktop` folder
3. Run `setup.bat` again (only if `package.json` changed)
4. Otherwise just start AURUM normally — changes take effect immediately

---

## TROUBLESHOOTING

**"node is not recognized"** → Node.js not installed. See Step 1.

**"npm install failed"** → Check internet connection. Try again.

**Clients can't connect to server** → 
- Check server is running (window must be open)
- Check the IP address is correct
- Allow port 3737 through Windows Firewall

**Data seems lost** → 
- Data is in `%appdata%\AURUM\aurum.db`, never deleted automatically
- Restore from `%appdata%\AURUM\backups\` if needed

**App won't start** →
- Delete `node_modules` folder
- Run `setup.bat` again

---

## SUPPORT

This is custom software for Brasilgo Jewels Private Limited.
No licence required. No subscription. The code belongs to you entirely.
For updates and changes, contact your system administrator.

---
*AURUM v1.0 · Brasilgo Jewels Pvt. Ltd. · New Delhi*
