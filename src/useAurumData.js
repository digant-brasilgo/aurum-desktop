import { useState, useEffect, useCallback, useRef } from 'react';

const IS_ELECTRON  = typeof window !== 'undefined' && !!window.isElectron;
// In browser mode, server URL = same origin (browser is served BY the server)
const SERVER_URL   = IS_ELECTRON ? '' : (window.__AURUM_SERVER_URL || window.location.origin);
const IS_LAN       = !IS_ELECTRON && !!SERVER_URL;

function getToken() { return sessionStorage.getItem('aurum_token') || ''; }

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-aurum-token': token,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

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
    metalReturns:[],pmMetalDeliveries:[],
    customers:[],orders:[],auditLogs:[],pmLedger:[],
  };
}

function merge(data) {
  const base = emptyDB();
  if (!data) return base;
  for (const k of Object.keys(base)) {
    if (data[k] === undefined) data[k] = base[k];
  }
  return data;
}

export function useAurumData() {
  const [db, setDb]               = useState(null);
  const [loading, setLoading]     = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const dbRef   = useRef(null);
  const timer   = useRef(null);
  const pollRef = useRef(null);
  const lastChangeRef = useRef(0);

  // Load
  useEffect(() => {
    async function load() {
      try {
        let data;
        if (IS_ELECTRON) {
          const timeout = new Promise((_, rej) =>
            setTimeout(() => rej(new Error('IPC timeout')), 5000)
          );
          data = await Promise.race([window.aurum.db.getAll(), timeout]);
        } else if (IS_LAN) {
          data = await apiFetch('/api/data');
        } else {
          const raw = localStorage.getItem('aurumDB');
          data = raw ? JSON.parse(raw) : null;
        }
        data = merge(data);
        dbRef.current = data;
        setDb(data);
      } catch (err) {
        console.error('Load error:', err);
        const fresh = emptyDB();
        dbRef.current = fresh;
        setDb(fresh);
      } finally {
        setLoading(false);
        try { window.__splashDone?.(); } catch {}
      }
    }
    load();
  }, []);

  // LAN: Poll for changes every 2 seconds
  useEffect(() => {
    if (!IS_LAN) return;
    pollRef.current = setInterval(async () => {
      try {
        const { changed, lastChange } = await apiFetch(
          `/api/poll?since=${lastChangeRef.current}`
        );
        if (changed && lastChange > lastChangeRef.current) {
          lastChangeRef.current = lastChange;
          const data = merge(await apiFetch('/api/data'));
          dbRef.current = data;
          setDb(data);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  // Listen for reload from Electron (backup restore + LAN client writes)
  useEffect(() => {
    if (!IS_ELECTRON || !window.aurum?.on) return;
    return window.aurum.on('db:reload', async () => {
      try {
        const data = merge(await window.aurum.db.getAll());
        dbRef.current = data;
        setDb(data);
      } catch {}
    });
  }, []);

  // Electron: poll file every 3 seconds to pick up changes made by LAN clients
  useEffect(() => {
    if (!IS_ELECTRON) return;
    const interval = setInterval(async () => {
      try {
        const fresh = merge(await window.aurum.db.getAll());
        // Only update if data actually changed (compare JSON length as quick check)
        const freshStr = JSON.stringify(fresh);
        const currentStr = JSON.stringify(dbRef.current);
        if (freshStr !== currentStr) {
          dbRef.current = fresh;
          setDb(fresh);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Save (debounced 500ms)
  const scheduleSave = useCallback((data) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        if (IS_ELECTRON) {
          await window.aurum.db.setAll(data);
        } else if (IS_LAN) {
          await apiFetch('/api/data', {
            method: 'POST',
            body: JSON.stringify(data),
          });
          lastChangeRef.current = Date.now();
        } else {
          localStorage.setItem('aurumDB', JSON.stringify(data));
        }
        setLastSaved(new Date());
      } catch (err) {
        console.error('Save error:', err);
      }
    }, 500);
  }, []);

  const updateDB = useCallback((updater) => {
    // Show busy cursor during processing
    document.body.style.cursor = "progress";
    try {
      setDb(prev => {
        const next   = JSON.parse(JSON.stringify(prev));
        const result = updater(next);
        const final  = result !== undefined ? result : next;
        dbRef.current = final;
        scheduleSave(final);
        return final;
      });
    } finally {
      // Restore cursor after React processes the state update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.style.cursor = "";
        });
      });
    }
  }, [scheduleSave]);

  const saveNow = useCallback(async () => {
    clearTimeout(timer.current);
    if (!dbRef.current) return;
    try {
      if (IS_ELECTRON) {
        await window.aurum.db.setAll(dbRef.current);
      } else if (IS_LAN) {
        await apiFetch('/api/data', {
          method: 'POST',
          body: JSON.stringify(dbRef.current),
        });
      } else {
        localStorage.setItem('aurumDB', JSON.stringify(dbRef.current));
      }
      setLastSaved(new Date());
    } catch {}
  }, []);

  const reloadDB = useCallback(async () => {
    try {
      let data;
      if (IS_ELECTRON) {
        data = await window.aurum.db.getAll();
      } else if (IS_LAN) {
        data = await apiFetch('/api/data');
      } else {
        const raw = localStorage.getItem('aurumDB');
        data = raw ? JSON.parse(raw) : null;
      }
      data = merge(data);
      dbRef.current = data;
      setDb(data);
    } catch (err) {
      console.error('Reload error:', err);
    }
  }, []);

  return { db, updateDB, saveNow, reloadDB, loading, lastSaved, isElectron: IS_ELECTRON, isLan: IS_LAN };
}
