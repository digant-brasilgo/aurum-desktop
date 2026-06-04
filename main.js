const { app, BrowserWindow, ipcMain, Menu, dialog, shell, Tray, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ── Print Agent auto-start ─────────────────────────────────────
let printAgentProcess = null;
const PRINT_AGENT_PATH = 'D:\\Aurum\\aurum-print\\aurum-print-agent.js';

function startPrintAgent() {
  if (!fs.existsSync(PRINT_AGENT_PATH)) {
    console.log('[PrintAgent] Not found at', PRINT_AGENT_PATH, '— skipping');
    return;
  }
  try {
    const { spawn } = require('child_process');
    printAgentProcess = spawn('node', [PRINT_AGENT_PATH], {
      cwd: path.dirname(PRINT_AGENT_PATH),
      detached: false,
      stdio: 'ignore',
      windowsHide: true,
    });
    printAgentProcess.on('error', (e) => { console.log('[PrintAgent] Error:', e.message); printAgentProcess = null; });
    printAgentProcess.on('exit', (code) => { console.log('[PrintAgent] Exited:', code); printAgentProcess = null; });
    console.log('[PrintAgent] Started PID:', printAgentProcess.pid);
  } catch(e) { console.log('[PrintAgent] Failed to start:', e.message); }
}

function stopPrintAgent() {
  if (printAgentProcess) {
    try { process.kill(printAgentProcess.pid, 'SIGTERM'); } catch(e) {}
    printAgentProcess = null;
    console.log('[PrintAgent] Stopped');
  }
}

// Performance: prevent background throttling
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

let mainWindow, tray;
const userDataPath  = app.getPath('userData');
const usersFile     = path.join(userDataPath, 'aurum-users.json');
const settingsFile  = path.join(userDataPath, 'aurum-settings.json');
const companiesFile = path.join(userDataPath, 'aurum-companies.json');
const dataDir       = path.join(userDataPath, 'data');

// ── Active company (set at login) ─────────────────────────────
let activeCompanyId = null;

function getCompanyDataFile(companyId) {
  return path.join(dataDir, companyId, 'aurum-data.json');
}
function getCompanyBackupDir(companyId) {
  return path.join(dataDir, companyId, 'backups');
}

// Legacy support: if old flat file exists, point to it
const legacyDataFile = path.join(userDataPath, 'aurum-data.json');
function getDataFile() {
  if (activeCompanyId) return getCompanyDataFile(activeCompanyId);
  return legacyDataFile; // fallback during startup
}
function getBackupDir() {
  if (activeCompanyId) return getCompanyBackupDir(activeCompanyId);
  return path.join(userDataPath, 'backups');
}

function readSettings() {
  try { if (fs.existsSync(settingsFile)) return JSON.parse(fs.readFileSync(settingsFile,'utf8')); } catch(e) {}
  return {};
}
function writeSettings(s) { fs.writeFileSync(settingsFile, JSON.stringify(s), 'utf8'); }

// ── Company registry helpers ──────────────────────────────────
function readCompanies() {
  try {
    if (fs.existsSync(companiesFile)) return JSON.parse(fs.readFileSync(companiesFile,'utf8'));
  } catch(e) {}
  // Default: Brasilgo as first company
  return [{
    id: 'brasilgo',
    name: 'Brasilgo Jewels Private Limited',
    shortName: 'Brasilgo',
    logo: null,
    address: '',
    gstin: '',
    phone: '',
    copyright: '© 2026 Brasilgo Jewels Private Limited. All rights reserved.',
    createdAt: new Date().toISOString(),
    isActive: true,
  }];
}
function writeCompanies(companies) {
  fs.writeFileSync(companiesFile, JSON.stringify(companies, null, 2), 'utf8');
}
function ensureCompanyDir(companyId) {
  const dir      = path.join(dataDir, companyId);
  const backups  = path.join(dir, 'backups');
  const dataFile = path.join(dir, 'aurum-data.json');
  if (!fs.existsSync(dir))      fs.mkdirSync(dir,     { recursive: true });
  if (!fs.existsSync(backups))  fs.mkdirSync(backups, { recursive: true });
  // Auto-create empty database if not exists
  if (!fs.existsSync(dataFile)) {
    const emptyDB = {
      designs:[], bags:[], units:[], parts:[], transactions:[],
      groups:[], karigars:[],
      departments:[
        {id:'d1',name:'Sprue Grinding',  order:1,isActive:true},
        {id:'d2',name:'Filing',           order:2,isActive:true,hasDust:true},
        {id:'d3',name:'Pre-Polishing',    order:3,isActive:true,hasDust:true},
        {id:'d4',name:'Setting',          order:4,isActive:true},
        {id:'d5',name:'Final Polishing',  order:5,isActive:true,hasDust:true},
        {id:'d6',name:'Rhodium / Plating',order:6,isActive:true},
        {id:'d7',name:'Quality Control',  order:7,isActive:true,isQC:true},
      ],
      bagCounters:{}, itemCounters:{}, designMaster:[],
      pureMetalStock:[],machineDust:[],customerGold:[],
      coReceipts:[],stoneIssuances:[],stoneLosses:[],stoneStock:[],
      metalReturns:[],pmMetalDeliveries:[],
      customers:[],orders:[],auditLogs:[],pmLedger:[],
      coAlloyedStock:[],pmBook:[],extraMetalIssues:[],
      schemaVersion: 2,
    };
    fs.writeFileSync(dataFile, JSON.stringify(emptyDB), 'utf8');
    console.log('Created empty database for company:', companyId);
  }
}

// Ensure data dir exists
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
// Ensure default Brasilgo company dir
ensureCompanyDir('brasilgo');
// Write companies file if missing
if (!fs.existsSync(companiesFile)) writeCompanies(readCompanies());

// ── Get LAN IP ────────────────────────────────────────────────
function getLanIP() {
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const a of iface) {
      if (a.family === 'IPv4' && !a.internal) return a.address;
    }
  }
  return 'localhost';
}

// ── Embedded LAN Server ───────────────────────────────────────
const LAN_PORT = 3737;
let lanServer  = null;
let lanIP      = getLanIP();

function startLanServer() {
  try {
    const express  = require('express');
    const cors     = require('cors');
    const http     = require('http');
    const httpsLib = require('https');
    const Auth     = require('./auth');

    const appExpress = express();
    appExpress.use(cors({ origin: '*' }));
    appExpress.use(express.json({ limit: '50mb' }));

    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) appExpress.use(express.static(distPath));

    function authMiddleware(req, res, next) {
      const token = req.headers['x-aurum-token'];
      if (!token) return res.status(401).json({ error: 'No token' });
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const [userId] = decoded.split(':');
        const users = readUsers();
        const user  = users.find(u => u.id === userId && u.isActive);
        if (!user) return res.status(401).json({ error: 'Invalid session' });
        req.user = user;
        next();
      } catch { res.status(401).json({ error: 'Invalid token' }); }
    }

    function makeToken(user) {
      return Buffer.from(`${user.id}:${Date.now()}:${user.role}`).toString('base64');
    }

    appExpress.get('/api/status', (req, res) => {
      const co = readCompanies().find(c=>c.id===activeCompanyId) || readCompanies()[0] || {};
      res.json({ ok: true, server: 'AURUM', version: '1.0.0', time: new Date().toISOString(),
        company: { id: co.id, name: co.name, shortName: co.shortName, logo: co.logo||null, copyright: co.copyright||'' },
        aubConnected: global.aubConnectedUser || null,
      });
    });

    // AUB connection ping — AUB sends its user info when syncing
    appExpress.post('/api/aub-connect', authMiddleware, (req, res) => {
      const { displayName, role } = req.body || {};
      global.aubConnectedUser = { displayName: displayName||'AUB User', role, connectedAt: new Date().toISOString() };
      // Notify renderer
      if(mainWindow) mainWindow.webContents.send('aub:connected', global.aubConnectedUser);
      res.json({ ok: true });
    });

    appExpress.post('/api/login', (req, res) => {
      const users = readUsers();
      const result = Auth.login(users, req.body.username, req.body.password);
      if (!result.success) return res.status(401).json(result);
      writeUsers(users);
      res.json({ ...result, token: makeToken(result.user) });
    });

    let lastChange = Date.now();
    ipcMain.on('db:changed', () => { lastChange = Date.now(); });

    appExpress.get('/api/poll', authMiddleware, (req, res) => {
      const since = parseInt(req.query.since || '0');
      res.json({ changed: lastChange > since, lastChange });
    });

    // Prices — served from main process cache
    appExpress.get('/api/prices', authMiddleware, (req, res) => {
      res.json(cachedPrices || null);
    });

    // News — served from main process cache (fetched server-side, no CORS)
    appExpress.get('/api/news', authMiddleware, (req, res) => {
      res.json(cachedNews || []);
    });

    appExpress.get('/api/data', authMiddleware, (req, res) => {
      res.json(readData());
    });

    appExpress.post('/api/data', authMiddleware, (req, res) => {
      try {
        const incoming = req.body;
        const current  = readData();
        // Safety check — never overwrite with significantly smaller data
        const currentBags  = (current.bags  || []).length;
        const incomingBags = (incoming.bags || []).length;
        const currentSize  = JSON.stringify(current).length;
        const incomingSize = JSON.stringify(incoming).length;
        // Block if incoming has far fewer bags OR is much smaller (possible empty DB)
        if (currentBags > 5 && incomingBags === 0) {
          console.error(`[SAFETY] Blocked empty DB write — current has ${currentBags} bags`);
          return res.status(400).json({ error: 'Safety check failed: incoming data appears empty' });
        }
        if (currentBags > 10 && incomingBags < currentBags * 0.5) {
          console.error(`[SAFETY] Blocked suspicious write — current: ${currentBags} bags, incoming: ${incomingBags} bags`);
          return res.status(400).json({ error: 'Safety check failed: incoming data has significantly fewer bags' });
        }
        writeData(incoming);
        lastChange = Date.now();
        if (mainWindow) mainWindow.webContents.send('db:reload');
        res.json({ ok: true });
      } catch(e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Targeted receipt update — used by Aurum Business to mark a receipt as billed
    // Only allows updating safe fields: billedInBusiness, bizInvoiceNo, bizInvoiceDate
    appExpress.patch('/api/receipts/:id', authMiddleware, (req, res) => {
      try {
        const data = readData();
        const receipt = (data.coReceipts || []).find(r => r.id === req.params.id);
        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
        const allowed = ['billedInBusiness', 'bizInvoiceNo', 'bizInvoiceDate'];
        allowed.forEach(f => { if (req.body[f] !== undefined) receipt[f] = req.body[f]; });
        writeData(data);
        lastChange = Date.now();
        if (mainWindow) mainWindow.webContents.send('db:reload');
        res.json({ ok: true });
      } catch(e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Mark a ready stock item as sold — used by Aurum Business billing
    appExpress.patch('/api/stock-sold/:id', authMiddleware, (req, res) => {
      try {
        const data = readData();
        const item = (data.readyStock || []).find(s => s.id === req.params.id);
        if (!item) return res.status(404).json({ error: 'Ready stock item not found' });
        const { unitNo, stockSoldAt, stockSoldTo, stockSoldInvoice, stockSoldPrice } = req.body;
        const soldAt = stockSoldAt || new Date().toISOString();
        const purityFactors = {"24K":1,"22K":0.9167,"18K":0.75,"14K":0.5833,"925":0.925,"Silver 925":0.925,"9K":0.375};
        const netWt = item.netMetalWeight || 0;

        // Mark units as sold
        if(unitNo !== undefined) {
          const unit = (item.units || []).find(u => u.unitNo === unitNo);
          if(unit) { unit.soldAt=soldAt; unit.soldTo=stockSoldTo||""; unit.soldInvoice=stockSoldInvoice||""; unit.soldPrice=stockSoldPrice||0; }
        } else {
          (item.units || []).forEach(u => {
            if(!u.soldAt) { u.soldAt=soldAt; u.soldTo=stockSoldTo||""; u.soldInvoice=stockSoldInvoice||""; u.soldPrice=stockSoldPrice||0; }
          });
        }

        // Debit coReadyStock — metal leaves ready stock on sale
        if(netWt > 0) {
          if(!data.coReadyStock) data.coReadyStock = [];
          data.coReadyStock.push({
            id: 'RSD-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
            type: "RETAIL_SALE", direction: "OUT",
            metalType: item.metalType, purity: item.purity,
            weight: netWt, pureEquiv: netWt * (purityFactors[item.purity]||1),
            bagNo: item.bagId, readyStockId: item.id,
            invoiceNo: stockSoldInvoice||"", soldTo: stockSoldTo||"",
            source: `Retail Sale — Bag ${item.bagId} — Invoice ${stockSoldInvoice||""}`,
            date: soldAt,
            notes: `${netWt.toFixed(3)}g ${item.purity} ${item.metalType} sold from ready stock to ${stockSoldTo||"customer"}`,
          });
        }

        // Debit coStoneStock — stones leave CO permanently with sold jewellery
        const stonesByType = item.stonesByType || {};
        if(Object.keys(stonesByType).length > 0) {
          if(!data.coStoneStock) data.coStoneStock = [];
          Object.entries(stonesByType).forEach(([stoneType, s]) => {
            const netCt  = parseFloat(s.carats||0);
            const netPcs = Math.max(0, parseInt(s.pieces||0));
            if(netCt > 0 || netPcs > 0) {
              data.coStoneStock.push({
                id: 'SS-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
                type: "RETAIL_SALE", direction: "OUT",
                stoneType, pieces: netPcs, carats: netCt, grams: netCt * 0.2,
                bagId: item.bagId,
                invoiceNo: stockSoldInvoice || "",
                soldTo: stockSoldTo || "",
                source: `Retail Sale — Bag ${item.bagId} — Invoice ${stockSoldInvoice||""}`,
                date: soldAt,
                notes: `${stoneType} ${netPcs}pcs / ${netCt}ct sold with bag ${item.bagId} to ${stockSoldTo||"customer"}`,
              });
            }
          });
        }

        writeData(data);
        lastChange = Date.now();
        if (mainWindow) mainWindow.webContents.send('db:reload');
        res.json({ ok: true });
      } catch(e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Mark a ready stock item as unsold — used when AUB invoice is cancelled
    appExpress.patch('/api/stock-unsold/:id', authMiddleware, (req, res) => {
      try {
        const data = readData();
        const item = (data.readyStock || []).find(s => s.id === req.params.id);
        if (!item) return res.status(404).json({ error: 'Ready stock item not found' });

        // Clear sold status on all units
        (item.units || []).forEach(u => {
          u.soldAt = null; u.soldTo = null; u.soldInvoice = null; u.soldPrice = null;
        });

        // Credit coReadyStock back — sale cancelled, metal returns to ready stock
        const purityFactors = {"24K":1,"22K":0.9167,"18K":0.75,"14K":0.5833,"925":0.925,"Silver 925":0.925,"9K":0.375};
        const netWt = item.netMetalWeight || 0;
        if(netWt > 0) {
          if(!data.coReadyStock) data.coReadyStock = [];
          data.coReadyStock.push({
            id: 'RSC-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
            type: "SALE_CANCELLED", direction: "IN",
            metalType: item.metalType, purity: item.purity,
            weight: netWt, pureEquiv: netWt * (purityFactors[item.purity]||1),
            bagNo: item.bagId, readyStockId: item.id,
            source: `Sale Cancelled — Bag ${item.bagId} returned to Ready Stock`,
            date: new Date().toISOString(),
            notes: `${netWt.toFixed(3)}g ${item.purity} ${item.metalType} returned to ready stock — sale cancelled`,
          });
        }

        // Reverse coStoneStock — credit stones back to CO stock
        const stonesByType = item.stonesByType || {};
        if(Object.keys(stonesByType).length > 0) {
          if(!data.coStoneStock) data.coStoneStock = [];
          Object.entries(stonesByType).forEach(([stoneType, s]) => {
            const netCt  = parseFloat(s.carats||0);
            const netPcs = Math.max(0, parseInt(s.pieces||0));
            if(netCt > 0 || netPcs > 0) {
              data.coStoneStock.push({
                id: 'SU-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
                type: "SALE_CANCELLED", direction: "IN",
                stoneType, pieces: netPcs, carats: netCt, grams: netCt * 0.2,
                bagId: item.bagId,
                source: `Sale Cancelled — Bag ${item.bagId} returned to Ready Stock`,
                date: new Date().toISOString(),
                notes: `${stoneType} ${netPcs}pcs / ${netCt}ct returned to CO stock — sale cancelled`,
              });
            }
          });
        }

        writeData(data);
        lastChange = Date.now();
        if (mainWindow) mainWindow.webContents.send('db:reload');
        res.json({ ok: true });
      } catch(e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Proxy agent status check — so LAN browsers don't hit agent directly (CORS)
    appExpress.get('/api/agent-status', (req, res) => {
      const http = require('http');
      let responded = false;
      const options = { hostname:'localhost', port:3739, path:'/status', method:'GET', timeout:2000 };
      const probe = http.request(options, (r) => {
        if(!responded) { responded = true; res.json({ ok: true, running: true }); }
      });
      probe.on('error', () => { if(!responded) { responded = true; res.json({ ok: true, running: false }); } });
      probe.on('timeout', () => { probe.destroy(); if(!responded) { responded = true; res.json({ ok: true, running: false }); } });
      probe.end();
    });

    // Proxy print job — so LAN browsers send print via AUD server (CORS)
    appExpress.post('/api/agent-print', (req, res) => {
      const http = require('http');
      const body = JSON.stringify(req.body);
      const options = { hostname:'localhost', port:3739, path:'/print', method:'POST',
        headers:{ 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body) }, timeout:20000 };
      const probe = http.request(options, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => { try { res.json(JSON.parse(data)); } catch(e) { res.json({ ok: true }); } });
      });
      probe.on('error', (e) => res.status(500).json({ ok: false, error: e.message }));
      probe.write(body);
      probe.end();
    });
    appExpress.get('/api/stock-by-bag/:bagId', authMiddleware, (req, res) => {
      try {
        const data = readData();
        const item = (data.readyStock || []).find(s => s.bagId === req.params.bagId);
        if (!item) return res.status(404).json({ error: 'Bag not in ready stock' });
        res.json({ ok: true, item });
      } catch(e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Record sale from receipt history — debits coAlloyedStock and coStoneStock
    appExpress.patch('/api/receipt-sale/:id', authMiddleware, (req, res) => {
      try {
        const data = readData();
        const receipt = (data.coReceipts || []).find(r => r.id === req.params.id);
        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
        const { invoiceNo, soldTo, soldAt } = req.body;
        const date = soldAt || new Date().toISOString();
        const purityFactors = {"24K":1,"22K":0.9167,"18K":0.75,"14K":0.5833,"925":0.925,"Silver 925":0.925,"9K":0.375};

        // Debit coAlloyedStock
        const netWt = receipt.netMetalWeight || 0;
        const pureWt = netWt * (purityFactors[receipt.purity] || 1);
        if(netWt > 0) {
          if(!data.coAlloyedStock) data.coAlloyedStock = [];
          data.coAlloyedStock.push({
            id: 'RS-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
            type: "RETAIL_SALE", direction: "OUT",
            metalType: receipt.metalType, purity: receipt.purity,
            weight: netWt, pureEquiv: pureWt, bagNo: receipt.bagId,
            invoiceNo: invoiceNo||"", soldTo: soldTo||"",
            source: `Retail Sale — Bag ${receipt.bagId} — Invoice ${invoiceNo||""}`,
            date, notes: `${netWt.toFixed(3)}g ${receipt.purity} ${receipt.metalType} sold — Invoice ${invoiceNo||""}`,
          });
        }

        // Debit coStoneStock
        const stonesByType = receipt.stonesByType || {};
        if(Object.keys(stonesByType).length > 0) {
          if(!data.coStoneStock) data.coStoneStock = [];
          Object.entries(stonesByType).forEach(([stoneType, s]) => {
            const netCt = parseFloat(s.carats||0);
            const netPcs = Math.max(0, parseInt(s.pieces||0));
            if(netCt > 0 || netPcs > 0) {
              data.coStoneStock.push({
                id: 'RS-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
                type: "RETAIL_SALE", direction: "OUT",
                stoneType, pieces: netPcs, carats: netCt, grams: netCt*0.2,
                bagId: receipt.bagId, invoiceNo: invoiceNo||"", soldTo: soldTo||"",
                source: `Retail Sale — Bag ${receipt.bagId} — Invoice ${invoiceNo||""}`,
                date, notes: `${stoneType} ${netPcs}pcs/${netCt}ct sold with bag ${receipt.bagId}`,
              });
            }
          });
        }

        // Mark receipt as billed
        receipt.billedInBusiness = true;
        receipt.bizInvoiceNo = invoiceNo||"";
        receipt.bizInvoiceDate = date;

        writeData(data);
        lastChange = Date.now();
        if (mainWindow) mainWindow.webContents.send('db:reload');
        res.json({ ok: true });
      } catch(e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Reverse a receipt history sale on invoice cancellation
    appExpress.patch('/api/receipt-sale-cancel/:id', authMiddleware, (req, res) => {
      try {
        const data = readData();
        const receipt = (data.coReceipts || []).find(r => r.id === req.params.id);
        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
        const purityFactors = {"24K":1,"22K":0.9167,"18K":0.75,"14K":0.5833,"925":0.925,"Silver 925":0.925,"9K":0.375};
        const date = new Date().toISOString();

        // Credit coAlloyedStock back
        const netWt = receipt.netMetalWeight || 0;
        const pureWt = netWt * (purityFactors[receipt.purity] || 1);
        if(netWt > 0) {
          if(!data.coAlloyedStock) data.coAlloyedStock = [];
          data.coAlloyedStock.push({
            id: 'SC-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
            type: "SALE_CANCELLED", direction: "IN",
            metalType: receipt.metalType, purity: receipt.purity,
            weight: netWt, pureEquiv: pureWt, bagNo: receipt.bagId,
            source: `Sale Cancelled — Bag ${receipt.bagId}`,
            date, notes: `${netWt.toFixed(3)}g returned to CO alloyed stock — sale cancelled`,
          });
        }

        // Credit coStoneStock back
        const stonesByType = receipt.stonesByType || {};
        if(Object.keys(stonesByType).length > 0) {
          if(!data.coStoneStock) data.coStoneStock = [];
          Object.entries(stonesByType).forEach(([stoneType, s]) => {
            const netCt = parseFloat(s.carats||0);
            const netPcs = Math.max(0, parseInt(s.pieces||0));
            if(netCt > 0 || netPcs > 0) {
              data.coStoneStock.push({
                id: 'SC-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
                type: "SALE_CANCELLED", direction: "IN",
                stoneType, pieces: netPcs, carats: netCt, grams: netCt*0.2,
                bagId: receipt.bagId,
                source: `Sale Cancelled — Bag ${receipt.bagId}`,
                date, notes: `${stoneType} ${netPcs}pcs/${netCt}ct returned to CO stone stock — sale cancelled`,
              });
            }
          });
        }

        // Unmark receipt as billed
        receipt.billedInBusiness = false;
        receipt.bizInvoiceNo = "";
        receipt.bizInvoiceDate = "";

        writeData(data);
        lastChange = Date.now();
        if (mainWindow) mainWindow.webContents.send('db:reload');
        res.json({ ok: true });
      } catch(e) {
        res.status(500).json({ error: e.message });
      }
    });

    appExpress.get('/api/users', authMiddleware, (req, res) => {
      res.json(readUsers().map(u => ({
        id:u.id, username:u.username, displayName:u.displayName,
        role:u.role, isActive:u.isActive, lastLogin:u.lastLogin, createdAt:u.createdAt,
        roleLabel: Auth.ROLES[u.role]?.label||u.role,
        roleColor: Auth.ROLES[u.role]?.color||'#aaa',
      })));
    });

    appExpress.patch('/api/users/:id', authMiddleware, (req, res) => {
      const users = readUsers();
      const idx   = users.findIndex(u => u.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'User not found' });
      const { displayName, role, isActive, password } = req.body;
      if (displayName !== undefined) users[idx].displayName = displayName;
      if (role       !== undefined) users[idx].role        = role;
      if (isActive   !== undefined) users[idx].isActive    = isActive;
      if (password) {
        if (password.length < 6) return res.status(400).json({ error: 'Password too short' });
        users[idx].password = Auth.hashPassword(password);
      }
      writeUsers(users);
      res.json({ ok: true });
    });

    // Admin reset password — no old password required, admin only
    appExpress.post('/api/admin-reset-password', authMiddleware, (req, res) => {
      try {
        const reqUser = readUsers().find(u => u.id === req.user?.id);
        if (!reqUser || reqUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        const { userId, newPassword } = req.body;
        if (!userId || !newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Invalid request' });
        const users = readUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx === -1) return res.status(404).json({ error: 'User not found' });
        users[idx].password = Auth.hashPassword(newPassword);
        writeUsers(users);
        res.json({ ok: true });
      } catch(err) { res.status(500).json({ error: err.message }); }
    });

    appExpress.get('*', (req, res) => {
      const idx = path.join(distPath, 'index.html');
      if (fs.existsSync(idx)) res.sendFile(idx);
      else res.send(`<h2 style="font-family:Arial;padding:40px;color:#c8a850">AURUM LAN Server — ${lanIP}:${LAN_PORT}</h2>`);
    });

    // Try HTTPS with openssl-generated cert, fall back to HTTP
    const certFile = path.join(userDataPath, 'aurum-cert.pem');
    const keyFile  = path.join(userDataPath, 'aurum-key.pem');
    let useHttps   = false;

    if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
      try {
        const { execSync } = require('child_process');
        execSync(
          `openssl req -x509 -newkey rsa:2048 -keyout "${keyFile}" -out "${certFile}" -days 3650 -nodes -subj "/CN=AURUM-LAN"`,
          { stdio: 'pipe', timeout: 15000 }
        );
        useHttps = true;
        console.log('[LAN] Self-signed HTTPS cert generated');
      } catch(e) {
        console.log('[LAN] openssl not available, using HTTP:', e.message.slice(0,80));
      }
    } else {
      useHttps = true;
    }

    if (useHttps) {
      try {
        const credentials = { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
        lanServer = httpsLib.createServer(credentials, appExpress);
        lanServer.listen(LAN_PORT, '0.0.0.0', () => {
          lanIP = getLanIP();
          console.log(`[LAN] HTTPS server: https://${lanIP}:${LAN_PORT}`);
          if (tray) tray.setToolTip(`AURUM — LAN: https://${lanIP}:${LAN_PORT}`);
        });
        lanServer.on('error', e => {
          console.error('[LAN] HTTPS error:', e.message);
          if (e.code === 'EADDRINUSE') console.log(`[LAN] Port ${LAN_PORT} in use`);
        });
        return;
      } catch(e) {
        console.log('[LAN] HTTPS start failed, falling back to HTTP:', e.message);
      }
    }

    // HTTP fallback
    lanServer = http.createServer(appExpress);
    lanServer.listen(LAN_PORT, '0.0.0.0', () => {
      lanIP = getLanIP();
      console.log(`[LAN] HTTP server: http://${lanIP}:${LAN_PORT}`);
      if (tray) tray.setToolTip(`AURUM — LAN: http://${lanIP}:${LAN_PORT}`);
    });
    lanServer.on('error', e => {
      console.error('[LAN] HTTP error:', e.message);
    });

  } catch(e) {
    console.error('[LAN] Failed to start:', e.message);
  }
}



// ── Default departments ───────────────────────────────────────
function emptyDB() {
  return {
    designs:[], bags:[], units:[], parts:[], transactions:[],
    groups:[],
    karigars:[], departments:[
      {id:'d1',name:'Sprue Grinding',  order:1,isActive:true},
      {id:'d2',name:'Filing',           order:2,isActive:true,hasDust:true},
      {id:'d3',name:'Pre-Polishing',    order:3,isActive:true,hasDust:true},
      {id:'d4',name:'Setting',          order:4,isActive:true},
      {id:'d5',name:'Final Polishing',  order:5,isActive:true,hasDust:true},
      {id:'d6',name:'Rhodium / Plating',order:6,isActive:true},
      {id:'d7',name:'Quality Control',  order:7,isActive:true,isQC:true},
    ],
    bagCounters:{},
    pureMetalStock:[],machineDust:[],customerGold:[],
    coReceipts:[],stoneIssuances:[],stoneLosses:[],stoneStock:[],
    metalReturns:[],pmMetalDeliveries:[],pmLedger:[],
    customers:[],orders:[],auditLogs:[],
  };
}

// ── Simple JSON data store ────────────────────────────────────
function readData() {
  try {
    const f = getDataFile();
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f,'utf8'));
  } catch(e) { console.error('readData error:',e); }
  return emptyDB();
}
function writeData(data) {
  fs.writeFileSync(getDataFile(), JSON.stringify(data), 'utf8');
}

// ── Simple users store ────────────────────────────────────────
const bcrypt = require('bcryptjs');

function readUsers() {
  try {
    if (fs.existsSync(usersFile)) return JSON.parse(fs.readFileSync(usersFile,'utf8'));
  } catch(e) {}
  return [];
}
function writeUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users), 'utf8');
}
function ensureAdmin() {
  const users = readUsers();
  if (users.length === 0) {
    users.push({
      id: 'admin-001',
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10),
      displayName: 'Administrator',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    });
    writeUsers(users);
    console.log('Default admin created: admin / admin123');
  }
}

// Role permissions — loaded from auth.js
const Auth = require('./auth');
const ROLE_PERMS = Auth.ROLES;

// ── Backup ────────────────────────────────────────────────────
function doBackup() {
  try {
    const data = readData();
    const bDir = getBackupDir();
    if (!fs.existsSync(bDir)) fs.mkdirSync(bDir, { recursive: true });
    const ts   = new Date().toISOString().replace(/:/g,'-').replace('T','_').split('.')[0];
    const file = path.join(bDir, `AURUM-Backup-${ts}.json`);
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(file, jsonStr);
    // Keep only last 30 local backups
    const files = fs.readdirSync(bDir).filter(f=>f.endsWith('.json')).sort();
    while (files.length > 30) { fs.unlinkSync(path.join(bDir, files.shift())); }
    console.log('Backup saved:', file);

    // ── Auto-copy to G: drive if available — per company subfolder ──
    try {
      const settings  = readSettings();
      const gDrive    = settings.backupDrive || 'G:';
      const companyId = activeCompanyId || 'brasilgo';
      const gBackupDir = path.join(gDrive, 'Aurum', 'backups', companyId);
      if (fs.existsSync(gDrive + path.sep)) {
        if (!fs.existsSync(gBackupDir)) fs.mkdirSync(gBackupDir, { recursive: true });
        const gFile = path.join(gBackupDir, `AURUM-Backup-${ts}.json`);
        fs.writeFileSync(gFile, jsonStr);
        // Keep only last 30 per company on G:
        const gFiles = fs.readdirSync(gBackupDir).filter(f=>f.endsWith('.json')).sort();
        while (gFiles.length > 30) { fs.unlinkSync(path.join(gBackupDir, gFiles.shift())); }
        console.log(`G: drive backup saved [${companyId}]:`, gFile);
        writeSettings({ ...readSettings(), lastGDriveBackup: new Date().toISOString(), lastGDriveBackupFile: gFile });
      }
    } catch(gErr) {
      console.log('G: drive backup skipped:', gErr.message);
    }

    return file;
  } catch(e) { console.error('Backup failed:',e); return null; }
}

// ── Financial Year helpers ────────────────────────────────────
// Returns e.g. { label:"FY 26-27", start:"2026-04-01", end:"2027-03-31", key:"2627" }
function getCurrentFY() {
  return getFYForDate(new Date());
}
function getFYForDate(date) {
  const m = date.getMonth(); // 0=Jan
  const y = date.getFullYear();
  const fyStart = m >= 3 ? y : y - 1; // April = month 3
  const fyEnd   = fyStart + 1;
  return {
    key:   `${String(fyStart).slice(2)}${String(fyEnd).slice(2)}`,
    label: `FY ${String(fyStart).slice(2)}-${String(fyEnd).slice(2)}`,
    start: `${fyStart}-04-01`,
    end:   `${fyEnd}-03-31`,
    startDate: new Date(`${fyStart}-04-01`),
    endDate:   new Date(`${fyEnd}-03-31T23:59:59`),
  };
}
function getAllFYs(data) {
  // Scan all dated records to find which FYs have data
  const fySet = new Set();
  fySet.add(getCurrentFY().key); // always include current
  const dated = [
    ...(data.bags || []),
    ...(data.transactions || []),
    ...(data.coReceipts || []),
    ...(data.pureMetalStock || []),
    ...(data.orders || []),
  ];
  dated.forEach(r => {
    const d = r.date || r.createdAt || r.receivedAt || r.issuedAt;
    if (d) {
      try { fySet.add(getFYForDate(new Date(d)).key); } catch {}
    }
  });
  return [...fySet].sort().map(k => {
    const y1 = 2000 + parseInt(k.slice(0,2));
    const y2 = 2000 + parseInt(k.slice(2,4));
    return { key: k, label: `FY ${k.slice(0,2)}-${k.slice(2,4)}`, start: `${y1}-04-01`, end: `${y2}-03-31` };
  });
}

ipcMain.handle('fy:getCurrent', () => getCurrentFY());
ipcMain.handle('fy:getAll',     () => getAllFYs(readData()));

// ── Live Gold/Silver prices (fetched in main process) ─────────
const https = require('https');
const http  = require('http');
let cachedPrices  = null;
let lastPriceFetch = 0;
let cachedNews     = [];       // Array of { title, source, url }
let lastNewsFetch  = 0;

// Fetch URL and return raw text (not parsed)
function httpsGetRaw(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-IN,en;q=0.9',
        ...extraHeaders
      }
    }, (res) => {
      // Follow redirects
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        return httpsGetRaw(res.headers.location, extraHeaders).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpsGet(url, extraHeaders = {}) {
  return httpsGetRaw(url, extraHeaders).then(r => {
    try { return JSON.parse(r.body); }
    catch(e) { throw new Error('JSON parse failed [' + r.status + ']: ' + r.body.slice(0, 120)); }
  });
}



// ── Price fetching ────────────────────────────────────────────
async function fetchPrices() {
  const settings      = readSettings();
  const metalPriceKey = (settings.metalPriceApiKey || '').trim();
  const metalsDevKey  = (settings.metalsDevApiKey  || '').trim();
  const OZ            = 31.1035;
  let   gold = null, silver = null;
  const log  = [];

  console.log('[Prices] Keys loaded — MetalPriceAPI:', metalPriceKey ? '✓ present' : '✗ missing',
                                    ' Metals.dev:', metalsDevKey ? '✓ present' : '✗ missing');

  // ── 1. MetalPriceAPI ─────────────────────────────────────────
  // base=XAU → rates.INR = INR per 1 troy oz of gold
  if (metalPriceKey) {
    try {
      const url = `https://api.metalpriceapi.com/v1/latest?api_key=${metalPriceKey}&base=XAU&currencies=INR,XAG`;
      const r   = await httpsGetRaw(url);
      console.log('[Prices] MetalPriceAPI HTTP', r.status, r.body.slice(0,150));
      if (r.status === 200) {
        const d = JSON.parse(r.body);
        if (d.success && d.rates && d.rates.INR > 10000) {
          gold   = d.rates.INR / OZ;
          silver = d.rates.XAG ? (d.rates.INR / d.rates.XAG) / OZ : null;
          log.push('MetalPriceAPI ✓');
        } else {
          log.push('MetalPriceAPI: ' + (d.error?.info || d.message || 'bad response'));
        }
      } else { log.push('MetalPriceAPI HTTP ' + r.status); }
    } catch(e) { log.push('MetalPriceAPI error: ' + e.message); }
  }

  // ── 2. Metals.dev ────────────────────────────────────────────
  // currency=INR&unit=g → metals.gold = INR per gram directly
  if (!gold && metalsDevKey) {
    try {
      const url = `https://api.metals.dev/v1/latest?api_key=${metalsDevKey}&currency=INR&unit=g`;
      const r   = await httpsGetRaw(url);
      console.log('[Prices] Metals.dev HTTP', r.status, r.body.slice(0,150));
      if (r.status === 200) {
        const d = JSON.parse(r.body);
        if (d.metals && d.metals.gold > 1000) {
          gold   = parseFloat(d.metals.gold);
          silver = d.metals.silver ? parseFloat(d.metals.silver) : null;
          log.push('Metals.dev ✓');
        } else {
          log.push('Metals.dev: ' + (d.message || 'bad response'));
        }
      } else { log.push('Metals.dev HTTP ' + r.status); }
    } catch(e) { log.push('Metals.dev error: ' + e.message); }
  }

  // ── 3. fawazahmed0 CDN (free, no key) ────────────────────────
  // Note: only used if paid APIs fail
  if (!gold) {
    try {
      // This API returns: { xau: { inr: <INR per troy oz> } }
      const r  = await httpsGetRaw('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json');
      const r2 = await httpsGetRaw('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json');
      console.log('[Prices] fawazahmed0 HTTP', r.status, r.body.slice(0,120));
      const d  = JSON.parse(r.body);
      const d2 = JSON.parse(r2.body);
      // Must have xau.inr > 100000 (INR per troy oz, currently ~470000)
      if (d.xau && d.xau.inr && d.xau.inr > 100000) {
        gold   = d.xau.inr / OZ;
        silver = (d2.xag && d2.xag.inr > 500) ? d2.xag.inr / OZ : null;
        log.push('fawazahmed0 ✓');
      } else {
        log.push('fawazahmed0: unexpected format, skipping');
      }
    } catch(e) { log.push('fawazahmed0: ' + e.message); }
  }

  // ── 4. gold-api.com (free, USD→INR) ──────────────────────────
  if (!gold) {
    try {
      let usdInr = 85.0;
      try {
        const fx = await httpsGetRaw('https://api.frankfurter.app/latest?from=USD&to=INR');
        usdInr = JSON.parse(fx.body).rates.INR || 85;
      } catch(e) {}
      const r  = await httpsGetRaw('https://gold-api.com/price/XAU');
      const r2 = await httpsGetRaw('https://gold-api.com/price/XAG');
      console.log('[Prices] gold-api.com HTTP', r.status, r.body.slice(0,100));
      const d  = JSON.parse(r.body);
      const d2 = JSON.parse(r2.body);
      if (d.price > 100) {
        gold   = (d.price  / OZ) * usdInr;
        silver = d2.price ? (d2.price / OZ) * usdInr : null;
        log.push('gold-api.com ✓');
      }
    } catch(e) { log.push('gold-api.com: ' + e.message); }
  }

  console.log('[Prices] Result:', log.join(' | '), '→ gold=', gold?.toFixed(0));

  if (!gold || gold < 5000 || gold > 50000) {
    console.log('[Prices] Failed or out of range:', gold?.toFixed(0), '. Using cached.');
    return cachedPrices;
  }

  const prev  = cachedPrices;
  cachedPrices = {
    gold:    Math.round(gold),
    silver:  silver ? parseFloat(silver.toFixed(2)) : (prev?.silver || 0),
    updated: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
    goldUp:   prev ? Math.round(gold) >= prev.gold : true,
    silverUp: (prev?.silver && silver) ? silver >= prev.silver : true,
    manual:   false,
  };
  lastPriceFetch = Date.now();
  console.log('[Prices] ✓ Gold ₹' + cachedPrices.gold + '/g  Silver ₹' + cachedPrices.silver + '/g');
  return cachedPrices;
}

// ── News fetching ─────────────────────────────────────────────
// Fetches jewellery industry headlines from Google News RSS
// Runs server-side (no CORS), cached in memory, served to all clients
async function fetchNews() {
  const NEWS_TIMEOUT = 8000; // 8 second hard timeout
  const url = 'https://news.google.com/rss/search?q=jewellery+OR+jewelry+OR+diamonds+OR+gemstones+industry&hl=en-IN&gl=IN&ceid=IN:en';

  try {
    console.log('[News] Fetching jewellery headlines...');
    const r = await Promise.race([
      httpsGetRaw(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NEWS_TIMEOUT))
    ]);

    if (r.status !== 200) {
      console.log('[News] HTTP', r.status, '— keeping old headlines');
      return cachedNews;
    }

    // Simple XML parsing — no dependency needed, RSS is predictable
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(r.body)) !== null && items.length < 20) {
      const block   = match[1];
      const title   = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)   || block.match(/<title>(.*?)<\/title>/))?.[1]   || '';
      const source  = (block.match(/<source[^>]*>(.*?)<\/source>/))?.[1] || '';
      const url_    = (block.match(/<link>(.*?)<\/link>/)                     || block.match(/<guid[^>]*>(.*?)<\/guid>/))?.[1]  || '';
      const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || '';

      // Clean up — remove HTML entities and trailing source suffix Google appends
      const cleanTitle = title
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s*-\s*[^-]+$/, '')   // remove " - Source Name" suffix Google adds
        .trim();

      if (cleanTitle && cleanTitle.length > 10) {
        items.push({ title: cleanTitle, source: source.trim(), url: url_.trim(), pubDate });
      }
    }

    if (items.length > 0) {
      cachedNews    = items;
      lastNewsFetch = Date.now();
      console.log('[News] ✓ Fetched', items.length, 'headlines');
    } else {
      console.log('[News] No items parsed — keeping old headlines');
    }
  } catch(e) {
    console.log('[News] Fetch failed:', e.message, '— keeping old headlines');
    // Silently keep old cached headlines — app never hangs
  }
  return cachedNews;
}

ipcMain.handle('news:get', async () => {
  // If no headlines yet or older than 4 hours, fetch fresh
  if (cachedNews.length === 0 || Date.now() - lastNewsFetch > 4 * 60 * 60 * 1000) {
    await fetchNews();
  }
  return cachedNews;
});

ipcMain.handle('prices:get', async () => {
  if (!cachedPrices || Date.now() - lastPriceFetch > 4 * 60 * 60 * 1000) {
    await fetchPrices();
  }
  return cachedPrices;
});

ipcMain.handle('prices:refresh', async () => {
  lastPriceFetch = 0;
  cachedPrices   = null;
  const p = await fetchPrices();
  if (p && mainWindow) mainWindow.webContents.send('prices:update', p);
  return p;
});

ipcMain.handle('prices:debug', async () => {
  const settings      = readSettings();
  const metalPriceKey = (settings.metalPriceApiKey || '').trim();
  const metalsDevKey  = (settings.metalsDevApiKey  || '').trim();
  const results = [];
  const test = async (label, url) => {
    try {
      const r = await httpsGetRaw(url);
      results.push({ label, status: r.status, body: r.body.slice(0,300) });
    } catch(e) {
      results.push({ label, status:'ERROR', body: e.message });
    }
  };
  await test('MetalPriceAPI' + (metalPriceKey ? ' (key ✓)' : ' (no key!)'),
    metalPriceKey
      ? `https://api.metalpriceapi.com/v1/latest?api_key=${metalPriceKey}&base=XAU&currencies=INR,XAG`
      : 'https://api.metalpriceapi.com/v1/latest?api_key=NOKEY&base=XAU&currencies=INR'
  );
  await test('Metals.dev' + (metalsDevKey ? ' (key ✓)' : ' (no key!)'),
    metalsDevKey
      ? `https://api.metals.dev/v1/latest?api_key=${metalsDevKey}&currency=INR&unit=g`
      : 'https://api.metals.dev/v1/latest?api_key=NOKEY&currency=INR&unit=g'
  );
  await test('fawazahmed0 (free)',
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json'
  );
  await test('gold-api.com (free)', 'https://gold-api.com/price/XAU');
  await test('frankfurter USD/INR', 'https://api.frankfurter.app/latest?from=USD&to=INR');
  return results;
});




// ── Flash drive backup ────────────────────────────────────────
ipcMain.handle('backup:toFlashDrive', async () => {
  const companyId = activeCompanyId || 'brasilgo';
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save AURUM Backup',
    defaultPath: `AURUM-Backup-${companyId}-${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'AURUM Backup', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { success: false, canceled: true };
  try {
    fs.writeFileSync(filePath, JSON.stringify(readData(), null, 2), 'utf8');
    return { success: true, path: filePath };
  } catch(e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('backup:fromFlashDrive', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore AURUM Backup',
    filters: [{ name: 'AURUM Backup', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return { success: false, canceled: true };
  const confirm = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Restore Backup',
    message: 'This will REPLACE all current data with the backup.\n\nA safety backup of current data will be saved first.\n\nContinue?',
    buttons: ['Yes, Restore', 'Cancel'],
    defaultId: 1,
  });
  if (confirm.response !== 0) return { success: false, canceled: true };
  try {
    doBackup(); // safety backup first
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    writeData(data);
    mainWindow.webContents.send('db:reload');
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
});

// ── Auto-backup every hour + at 10pm
function scheduleBackup() {
  // Backup every hour
  setInterval(() => {
    doBackup();
    console.log('[BACKUP] Hourly backup completed at', new Date().toLocaleTimeString());
  }, 60 * 60 * 1000); // every 60 minutes
  // Also do immediate backup on start
  setTimeout(() => doBackup(), 5 * 60 * 1000); // 5 minutes after start
}

// ── IPC handlers ──────────────────────────────────────────────
// Data
ipcMain.handle('db:getAll',  ()         => readData());
ipcMain.handle('db:setAll',  (e, data)  => { writeData(data); ipcMain.emit('db:changed'); return true; });
ipcMain.handle('db:get',     (e, key)   => readData()[key]);
ipcMain.handle('db:set',     (e, k, v)  => { const d=readData(); d[k]=v; writeData(d); ipcMain.emit('db:changed'); return true; });

// Auth
ipcMain.handle('auth:login', (e, username, password, companyId) => {
  const users = readUsers();
  const result = Auth.login(users, username, password);
  if (result.success) {
    writeUsers(users); // save lastLogin
    if (companyId) { activeCompanyId = companyId; ensureCompanyDir(companyId); }
  }
  return result;
});

ipcMain.handle('auth:getUsers', () =>
  readUsers().map(u => ({
    id:u.id, username:u.username, displayName:u.displayName,
    role:u.role, isActive:u.isActive, lastLogin:u.lastLogin, createdAt:u.createdAt,
    roleLabel: Auth.ROLES[u.role]?.label||u.role,
    roleColor: Auth.ROLES[u.role]?.color||'#aaa',
  }))
);

ipcMain.handle('auth:addUser', (e, data) => {
  const users = readUsers();
  // Check creator permissions
  if (!Auth.canCreateRole(data.creatorRole, data.role))
    return { success:false, error:`Your role cannot create ${data.role} users` };
  if (users.find(u=>u.username===data.username.toLowerCase()))
    return { success:false, error:'Username already exists' };
  if (!data.password || data.password.length < 6)
    return { success:false, error:'Password must be at least 6 characters' };
  users.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    username: data.username.trim().toLowerCase(),
    password: Auth.hashPassword(data.password),
    displayName: data.displayName || data.username,
    role: data.role, isActive: true,
    createdAt: new Date().toISOString(), lastLogin: null,
  });
  writeUsers(users);
  return { success:true };
});

ipcMain.handle('auth:updateUser', (e, id, updates) => {
  const users = readUsers();
  const idx   = users.findIndex(u=>u.id===id);
  if (idx===-1) return { success:false, error:'User not found' };
  if (updates.password) {
    if (updates.password.length < 6) return { success:false, error:'Password too short' };
    users[idx].password = bcrypt.hashSync(updates.password, 10);
    delete updates.password;
  }
  Object.assign(users[idx], updates);
  writeUsers(users);
  return { success:true };
});

ipcMain.handle('auth:deleteUser', (e, id) => {
  const users = readUsers();
  const idx   = users.findIndex(u=>u.id===id);
  if (idx!==-1) { users[idx].isActive = false; writeUsers(users); }
  return { success:true };
});

ipcMain.handle('auth:changePassword', (e, userId, oldPass, newPass) => {
  const users = readUsers();
  const user  = users.find(u=>u.id===userId);
  if (!user) return { success:false, error:'User not found' };
  if (!Auth.checkPassword(oldPass, user.password)) return { success:false, error:'Current password incorrect' };
  if (!newPass || newPass.length < 6) return { success:false, error:'New password too short (min 6)' };
  user.password = Auth.hashPassword(newPass);
  writeUsers(users);
  return { success:true };
});

// Admin reset password — no old password required
ipcMain.handle('auth:adminResetPassword', (e, userId, newPass) => {
  try {
    const users = readUsers();
    const user  = users.find(u=>u.id===userId);
    if (!user) return { success:false, error:'User not found' };
    if (!newPass || newPass.length < 6) return { success:false, error:'Password too short (min 6 chars)' };
    user.password = Auth.hashPassword(newPass);
    writeUsers(users);
    return { success:true };
  } catch(err) {
    return { success:false, error:err.message };
  }
});

// Verify password without changing it (used for delete confirmations)
ipcMain.handle('auth:verifyPassword', (e, userId, password) => {
  try {
    const users = readUsers();
    const user  = users.find(u=>u.id===userId);
    if (!user) return { success:false, error:'User not found' };
    const ok = Auth.checkPassword(password, user.password);
    return { success:ok, error: ok ? null : 'Incorrect password' };
  } catch(err) {
    return { success:false, error:err.message };
  }
});

// Settings (API keys etc.)
ipcMain.handle('settings:get',    ()    => readSettings());
ipcMain.handle('settings:set',    (e,s) => { writeSettings({ ...readSettings(), ...s }); return true; });

// LAN server info
ipcMain.handle('lan:info', () => {
  const ip      = getLanIP();
  const running = lanServer !== null && lanServer.listening;
  const certFile = path.join(userDataPath, 'aurum-cert.pem');
  const isHttps  = fs.existsSync(certFile);
  const proto    = isHttps ? 'https' : 'http';
  return {
    ip,
    port: LAN_PORT,
    url: `${proto}://${ip}:${LAN_PORT}`,
    running,
    https: isHttps,
  };
});

// Backup
// ── Company IPC ─────────────────────────────────────────────
ipcMain.handle('company:list',   ()         => readCompanies());
ipcMain.handle('company:setActive', (e, id) => {
  const companies = readCompanies();
  if (!companies.find(c=>c.id===id)) return false;
  activeCompanyId = id;
  ensureCompanyDir(id);
  console.log('Active company set to:', id);
  return true;
});
ipcMain.handle('company:getActive', () => {
  const companies = readCompanies();
  return companies.find(c=>c.id===activeCompanyId) || null;
});
ipcMain.handle('company:add', (e, data) => {
  const companies = readCompanies();
  if (companies.find(c=>c.id===data.id)) return { error: 'Company ID already exists' };
  const newCo = { ...data, createdAt: new Date().toISOString(), isActive: true };
  companies.push(newCo);
  writeCompanies(companies);
  ensureCompanyDir(data.id);
  return { success: true };
});
ipcMain.handle('company:update', (e, id, data) => {
  const companies = readCompanies();
  const idx = companies.findIndex(c=>c.id===id);
  if (idx < 0) return { error: 'Company not found' };
  companies[idx] = { ...companies[idx], ...data };
  writeCompanies(companies);
  return { success: true };
});
ipcMain.handle('company:delete', (e, id) => {
  const companies = readCompanies();
  if (companies.length <= 1) return { error: 'Cannot delete the only company' };
  if (id === activeCompanyId) return { error: 'Cannot delete active company — switch first' };
  const updated = companies.filter(c=>c.id!==id);
  writeCompanies(updated);
  // Data files kept on disk — admin must manually delete if desired
  return { success: true };
});
ipcMain.handle('company:dataPath', (e, id) => path.join(dataDir, id||activeCompanyId||'brasilgo'));

ipcMain.handle('backup:now',  ()       => { const f=doBackup(); return {success:!!f,file:f}; });
ipcMain.handle('backup:gStatus', () => {
  const s = readSettings();
  return { lastBackup: s.lastGDriveBackup||null, lastFile: s.lastGDriveBackupFile||null,
           backupDrive: s.backupDrive||'G:' };
});
ipcMain.handle('backup:setDrive', (e, drive) => {
  writeSettings({ ...readSettings(), backupDrive: drive });
  return true;
});
ipcMain.handle('backup:list', ()       => {
  const bDir = getBackupDir();
  if (!fs.existsSync(bDir)) return [];
  return fs.readdirSync(bDir).filter(f=>f.endsWith('.json')).sort().reverse()
    .map(f => ({ filename:f, filepath:path.join(bDir,f), size:fs.statSync(path.join(bDir,f)).size }));
});
ipcMain.handle('backup:restore', (e, filePath) => {
  try { const d=JSON.parse(fs.readFileSync(filePath,'utf8')); writeData(d); return true; } catch { return false; }
});

// File ops
ipcMain.handle('file:exportJSON', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title:'Export AURUM Data',
    defaultPath: path.join(app.getPath('documents'),`AURUM-Export-${new Date().toISOString().slice(0,10)}.json`),
    filters:[{name:'JSON',extensions:['json']}],
  });
  if (canceled||!filePath) return;
  fs.writeFileSync(filePath, JSON.stringify(readData(),null,2));
  shell.showItemInFolder(filePath);
});

ipcMain.handle('file:importJSON', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title:'Import AURUM Data', filters:[{name:'JSON',extensions:['json']}], properties:['openFile'],
  });
  if (canceled||!filePaths[0]) return;
  const confirm = await dialog.showMessageBox(mainWindow,{
    type:'warning', title:'Import Data',
    message:'This will replace ALL current data. Current data will be backed up first.',
    buttons:['Import','Cancel'], defaultId:1,
  });
  if (confirm.response===0) {
    doBackup();
    const data = JSON.parse(fs.readFileSync(filePaths[0],'utf8'));
    writeData(data);
    mainWindow.webContents.send('db:reload');
  }
});

ipcMain.handle('file:openBackupFolder', () => shell.openPath(backupDir));

// Config
ipcMain.handle('config:get', () => ({ mode:'standalone', autoBackup:true, backupTime:'22:00' }));
ipcMain.handle('config:set', () => true);

// Window
ipcMain.handle('window:minimize',    () => mainWindow.minimize());
ipcMain.handle('window:maximize',    () => mainWindow.isMaximized() ? mainWindow.restore() : mainWindow.maximize());
ipcMain.handle('window:close',       () => mainWindow.hide());

// Help / Bug Reporter — capture screenshot and open WhatsApp
ipcMain.handle('help:captureScreen', async () => {
  try {
    const image = await mainWindow.webContents.capturePage();
    const base64 = image.toDataURL();
    return { ok: true, dataUrl: base64 };
  } catch(err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('help:saveScreenshot', async (e, dataUrl) => {
  try {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const fileName    = 'AURUM-Issue-' + new Date().toISOString().replace(/[:.]/g,'-').slice(0,19) + '.png';
    const filePath    = path.join(desktopPath, fileName);
    const base64Data  = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(filePath, base64Data, 'base64');
    return { ok: true, filePath, fileName };
  } catch(err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('help:openWhatsApp', async (e, message) => {
  const encoded = encodeURIComponent(message);
  const phone = '919311564850'; // ← Replace with your WhatsApp number (91 + 10 digits, no spaces or dashes)
  await shell.openExternal(`https://wa.me/${phone}?text=${encoded}`);
});
ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized());

// App
ipcMain.handle('app:version',  () => app.getVersion());
ipcMain.handle('app:dataPath', () => userDataPath);

// ── Window ────────────────────────────────────────────────────
function createWindow() {
  // Auto zoom for smaller screens (client PCs at 1152x864)
  const { screen } = require('electron');
  const { width: screenW } = screen.getPrimaryDisplay().workAreaSize;
  const zoomFactor = Math.min(1.0, screenW / 1280);

  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  mainWindow = new BrowserWindow({
    width:1400, height:900, minWidth:1100, minHeight:700,
    title:'AURUM — Brasilgo Jewels Private Limited',
    icon: appIcon,
    backgroundColor:'#0a0a0f',
    titleBarStyle:'hidden',
    titleBarOverlay:{ color:'#0f0f1a', symbolColor:'#c8a850', height:36 },
    webPreferences:{
      preload: path.join(__dirname,'preload.js'),
      contextIsolation:true, nodeIntegration:false,
      webSecurity: false,
      backgroundThrottling: false,
    },
    show:false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.webContents.setZoomFactor(zoomFactor);
    mainWindow.show();
  });

  // Fix: repaint on focus to fix unresponsive input fields
  mainWindow.on('focus', () => { mainWindow.webContents.invalidate(); });

  const indexFile = path.join(__dirname,'dist','index.html');
  if (fs.existsSync(indexFile)) {
    mainWindow.loadFile(indexFile);
  } else {
    // Fallback error page
    mainWindow.loadURL('data:text/html,<h2 style="font-family:Arial;color:red;padding:40px">dist/index.html not found. Run: npx vite build</h2>');
  }

  mainWindow.on('close', e => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });
}

function createTray() {
  tray = new Tray(appIcon);
  tray.setToolTip('AURUM — Jewellery Metal Tracking');
  const updateTrayMenu = () => {
    const ip  = getLanIP();
    const url = `http://${ip}:${LAN_PORT}`;
    tray.setContextMenu(Menu.buildFromTemplate([
      { label:'Open AURUM', click:()=>{ mainWindow.show(); mainWindow.focus(); } },
      { type:'separator' },
      { label:`🌐 LAN: ${url}`, enabled:false },
      { label:'Copy LAN URL', click:()=>{ require('electron').clipboard.writeText(url); } },
      { type:'separator' },
      { label:'Backup Now', click:()=>doBackup() },
      { type:'separator' },
      { label:'Quit', click:()=>{ app.isQuitting=true; app.quit(); } },
    ]));
  };
  updateTrayMenu();
  tray.on('double-click', ()=>{ mainWindow.show(); mainWindow.focus(); });
}

function createMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label:'AURUM', submenu:[
      { label:'About', click:()=>dialog.showMessageBox(mainWindow,{type:'info',title:'AURUM',message:'AURUM v1.0\nBrasilgo Jewels Pvt. Ltd.\nNew Delhi',buttons:['OK']}) },
      { type:'separator' },
      { label:'Quit', accelerator:'CmdOrCtrl+Q', click:()=>{ app.isQuitting=true; app.quit(); } },
    ]},
    { label:'Data', submenu:[
      { label:'Backup Now', accelerator:'CmdOrCtrl+B', click:()=>{ doBackup(); dialog.showMessageBox(mainWindow,{type:'info',title:'Backup',message:'Backup saved successfully.',buttons:['OK']}); } },
      { label:'Open Backup Folder', click:()=>shell.openPath(backupDir) },
      { type:'separator' },
      { label:'Export JSON...', click:()=>ipcMain.emit('file:exportJSON') },
      { label:'Import JSON...', click:()=>ipcMain.emit('file:importJSON') },
    ]},
    { label:'View', submenu:[
      { label:'Reload', accelerator:'CmdOrCtrl+R', click:()=>mainWindow.reload() },
      { label:'Toggle Fullscreen', accelerator:'F11', click:()=>mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
      { label:'Zoom In',  accelerator:'CmdOrCtrl+=', click:()=>mainWindow.webContents.setZoomFactor(Math.min(mainWindow.webContents.getZoomFactor()+0.1,2)) },
      { label:'Zoom Out', accelerator:'CmdOrCtrl+-', click:()=>mainWindow.webContents.setZoomFactor(Math.max(mainWindow.webContents.getZoomFactor()-0.1,0.5)) },
      { label:'Reset Zoom', accelerator:'CmdOrCtrl+0', click:()=>mainWindow.webContents.setZoomFactor(1) },
      { type:'separator' },
      { label:'Developer Tools', accelerator:'F12', click:()=>mainWindow.webContents.toggleDevTools() },
    ]},
  ]));
}

// ── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(() => {
  ensureAdmin();
  scheduleBackup();
  startLanServer(); // Start embedded LAN server
  startPrintAgent(); // Auto-start print agent

  // Allow all network requests (needed for live gold/silver prices)
  const { session } = require('electron');
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders } });
  });

  createWindow();
  createTray();
  createMenu();

  // Fetch prices once on startup, then daily at 14:00 IST
  setTimeout(() => {
    fetchPrices().then(p => {
      if (p && mainWindow) mainWindow.webContents.send('prices:update', p);
    });
  }, 3000);

  // Fetch news on startup (after 8s, so prices go first), then twice daily
  setTimeout(() => { fetchNews(); }, 8000);

  // Schedule daily fetch at 14:00 IST (UTC+5:30 = 08:30 UTC)
  function scheduleDailyPriceFetch() {
    const now = new Date();
    const target = new Date();
    target.setHours(14, 0, 0, 0); // 14:00 local time
    if (now >= target) target.setDate(target.getDate() + 1); // already past 14:00 today, schedule tomorrow
    const msUntilTarget = target - now;
    setTimeout(() => {
      fetchPrices().then(p => {
        if (p && mainWindow) mainWindow.webContents.send('prices:update', p);
      });
      setInterval(() => {
        fetchPrices().then(p => {
          if (p && mainWindow) mainWindow.webContents.send('prices:update', p);
        });
      }, 24 * 60 * 60 * 1000); // repeat every 24 hours
    }, msUntilTarget);
  }
  scheduleDailyPriceFetch();

  // Schedule news fetch twice daily — 09:00 and 15:00
  function scheduleNewsFetch() {
    const targets = [9, 15]; // hours
    targets.forEach(hour => {
      const now    = new Date();
      const target = new Date();
      target.setHours(hour, 0, 0, 0);
      if (now >= target) target.setDate(target.getDate() + 1);
      const ms = target - now;
      setTimeout(() => {
        fetchNews();
        setInterval(() => fetchNews(), 24 * 60 * 60 * 1000);
      }, ms);
    });
  }
  scheduleNewsFetch();
});

// ── Desktop Notification IPC ──
const { Notification: ElectronNotif } = require('electron');
ipcMain.on('notify:co-alert', (e, { title, body }) => {
  if (ElectronNotif.isSupported()) {
    const n = new ElectronNotif({ title: title || '⚑ AURUM Alert', body: body || 'Action required', timeoutType: 'never' });
    n.on('click', () => { if(mainWindow){ mainWindow.show(); mainWindow.focus(); } });
    n.show();
  }
});

app.on('window-all-closed', () => {}); // Stay in tray
app.on('activate', () => mainWindow.show());
app.on('before-quit', () => {
  app.isQuitting = true;
  stopPrintAgent(); // Stop print agent when AUD closes
  // Backup on every close — catches days when PC is off at 10pm
  try { doBackup(); } catch(e) { console.error('Close-time backup failed:', e); }
});
