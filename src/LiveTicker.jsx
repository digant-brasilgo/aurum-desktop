import { useState, useEffect, useRef } from 'react';
import sounds from './aurumSounds.js';

const IS_ELECTRON = typeof window !== 'undefined' && !!window.isElectron;
const IS_LAN      = !IS_ELECTRON && typeof window !== 'undefined' && !!window.location?.port;
const SERVER_URL  = IS_LAN ? window.location.origin : '';
function getToken() { return sessionStorage.getItem('aurum_token') || ''; }

// Shimmer component — uses absolutely positioned overlay sweep, works in Electron
function ShimmerText({ children, style = {}, speed = 3 }) {
  const id = useRef('s' + Math.random().toString(36).slice(2));
  useEffect(() => {
    const styleEl = document.getElementById('aurum-shimmer-css');
    if (styleEl) return;
    const s = document.createElement('style');
    s.id = 'aurum-shimmer-css';
    s.textContent = `
      @keyframes aurumSweep {
        0%   { transform: translateX(-150%); }
        100% { transform: translateX(350%); }
      }
      .aurum-shimmer-wrap {
        position: relative;
        display: inline-block;
        overflow: hidden;
      }
      .aurum-shimmer-wrap::after {
        content: '';
        position: absolute;
        top: -10%; left: 0;
        width: 35%;
        height: 120%;
        background: linear-gradient(
          105deg,
          transparent 0%,
          transparent 25%,
          rgba(255, 248, 200, 0.08) 35%,
          rgba(255, 248, 200, 0.85) 50%,
          rgba(255, 248, 200, 0.08) 65%,
          transparent 75%,
          transparent 100%
        );
        transform: translateX(-150%);
        animation: aurumSweep var(--shimmer-speed, 3s) ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes aurumPulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.45; }
      }
      .aurum-pulse { animation: aurumPulse 2s ease-in-out infinite; }
    `;
    document.head.appendChild(s);
  }, []);

  return (
    <span
      className="aurum-shimmer-wrap"
      style={{ '--shimmer-speed': `${speed}s`, ...style }}
    >
      {children}
    </span>
  );
}

export default function LiveTicker({ user, company, onLogout, lastSaved, db, onNavigate, theme, toggleTheme }) {
  // theme and toggleTheme are lifted to AurumApp for instant re-render

  const [time,      setTime]      = useState(new Date());
  const [prices,    setPrices]    = useState(() => {
    // Load manually saved rates from localStorage on startup
    try { const s = localStorage.getItem('aurum_manual_rates'); return s ? JSON.parse(s) : null; } catch{ return null; }
  });
  const [news,      setNews]      = useState([]);
  const [newsTicker, setNewsTicker] = useState(
    // Fallback headlines shown immediately — replaced by live news once fetched
    '💎 Welcome to AURUM     ·     💎 Jewellery industry news loading...     ·     💎 Stay updated with global gems & jewellery market headlines'
  );
  const [backupMsg, setBackupMsg] = useState('');
  const [showRateEdit, setShowRateEdit] = useState(false);
  const [manualGold,   setManualGold]   = useState('');
  const [manualSilver, setManualSilver] = useState('');
  const isManual = prices?.manual === true;

  // Clock — every second
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Startup sound — plays once after a short delay on first load
  useEffect(() => {
    const t = setTimeout(() => sounds.startup(), 1200);
    return () => clearTimeout(t);
  }, []);

  // Prices — fetch on load and every 4 hours
  useEffect(() => {
    async function load() {
      try {
        let p = null;
        if (IS_ELECTRON && window.aurum?.prices) {
          p = await window.aurum.prices.refresh();
          if (!p) p = await window.aurum.prices.get();
        } else if (IS_LAN) {
          // Browser LAN client — fetch from server's cached prices
          const r = await fetch(`${SERVER_URL}/api/prices`, {
            headers: { 'x-aurum-token': getToken() }
          });
          if (r.ok) p = await r.json();
        } else {
          // Standalone browser dev fallback
          const r = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json');
          const d = await r.json();
          if (d?.xau?.inr) {
            p = { gold: Math.round(d.xau.inr / 31.1035), silver: 0, updated: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) };
          }
        }
        if (p && p.gold > 0) { setPrices({ ...p, manual: false }); }
      } catch(e) { console.log('Price load failed:', e.message); }
    }
    load();
    // Refresh every 5 minutes for LAN clients, every 4 hours for Electron
    const iv = setInterval(load, IS_LAN ? 5 * 60 * 1000 : 4 * 60 * 60 * 1000);

    // Listen for push updates from main process (Electron only)
    let unsub;
    if (IS_ELECTRON && window.aurum?.prices?.onUpdate) {
      unsub = window.aurum.prices.onUpdate(p => {
        if (p && p.gold > 0) setPrices({ ...p, manual: false });
      });
    }
    return () => { clearInterval(iv); if (unsub) unsub(); };
  }, []);

  // Manual rate entry
  const handleOpenRateEdit = () => {
    setManualGold(prices?.gold || '');
    setManualSilver(prices?.silver || '');
    setShowRateEdit(true);
  };
  const handleSaveManualRates = () => {
    if (!manualGold || !manualSilver) return;
    const p = {
      gold: parseFloat(manualGold).toFixed(0),
      silver: parseFloat(manualSilver).toFixed(2),
      manual: true,
      updated: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
    };
    setPrices(p);
    try { localStorage.setItem('aurum_manual_rates', JSON.stringify(p)); } catch{}
    setShowRateEdit(false);
  };

  // Alerts count
  useEffect(() => {
    if (!db) return;
    let n = 0;
    (db.bags||[]).filter(b => b.status==='In Process').forEach(b => {
      if (b.targetDate && new Date(b.targetDate) < new Date()) n++;
    });
  }, [db]);

  // News fetch — on load, then every 4 hours (server-side cached, instant response)
  useEffect(() => {
    async function loadNews() {
      console.log('[News] loadNews() called — IS_ELECTRON:', IS_ELECTRON, 'IS_LAN:', IS_LAN);
      try {
        let items = [];
        if (IS_ELECTRON && window.aurum?.news) {
          items = await window.aurum.news.get();
        } else if (IS_LAN) {
          const r = await fetch(`${SERVER_URL}/api/news`, {
            headers: { 'x-aurum-token': getToken() }
          });
          if (r.ok) items = await r.json();
        }
        if (Array.isArray(items) && items.length > 0) {
          console.log('[News] Got', items.length, 'headlines — first:', items[0]?.title);
          setNews(items);
          // Build ticker string — headlines separated by diamond separators
          const tickerStr = items.map(n => `💎 ${n.title}${n.source ? '  ·  ' + n.source : ''}`).join('     ');
          setNewsTicker(tickerStr);
        }
      } catch(e) { console.log('[News] load failed:', e.message); }
    }
    loadNews();
    const iv = setInterval(loadNews, 4 * 60 * 60 * 1000); // refresh every 4 hours
    return () => clearInterval(iv);
  }, []);

  // Backup listener
  useEffect(() => {
    if (!IS_ELECTRON || !window.aurum?.on) return;
    return window.aurum.on('backup:done', () => {
      setBackupMsg('✓ Backed up');
      sounds.backup();
      setTimeout(() => setBackupMsg(''), 4000);
    });
  }, []);

  const fmt     = n => new Intl.NumberFormat('en-IN').format(n);
  const DAYS    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const timeStr = time.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
  const dateStr = `${DAYS[time.getDay()]} ${time.getDate()} ${MONTHS[time.getMonth()]} ${time.getFullYear()}`;

  return (
    <div style={{ display:'flex', flexDirection:'column', flexShrink:0 }}>
    <div style={{
      height: '46px', flexShrink: 0,
      background: 'linear-gradient(180deg, #0e0e1b 0%, #09090e 100%)',
      borderBottom: '1px solid #181828',
      display: 'flex', alignItems: 'center',
      paddingLeft: '14px',
      paddingRight: '120px',   // room for 3 window control buttons (3 × 38px + buffer)
      fontFamily: 'Arial, sans-serif',
      WebkitAppRegion: 'drag',
      position: 'relative', zIndex: 100,
    }}>

      {/* AURUM logo with shimmer + company name */}
      <div style={{ display:'flex', flexDirection:'column', marginRight:'18px', WebkitAppRegion:'no-drag', flexShrink:0 }}>
        <ShimmerText speed={2.5}>
          <span style={{
            fontSize: '17px', fontWeight: 'bold', letterSpacing: '5px',
            fontFamily: 'Georgia, serif', color: '#c8a850',
          }}>AURUM</span>
        </ShimmerText>
        {company && (
          <div style={{ fontSize:'9px', color:'#6a5020', letterSpacing:'1px', marginTop:'-2px', whiteSpace:'nowrap', overflow:'hidden', maxWidth:'140px', textOverflow:'ellipsis' }}>
            {company.shortName||company.name}
          </div>
        )}
      </div>

      <div style={{ width:'1px', height:'22px', background:'#181828', marginRight:'16px', flexShrink:0 }} />

      {/* Gold price — click to set manually */}
      <div onClick={handleOpenRateEdit} title="Click to enter today's rate manually" style={{ display:'flex', alignItems:'center', gap:'5px', marginRight:'18px', WebkitAppRegion:'no-drag', flexShrink:0, cursor:'pointer' }}>
        <div style={{
          width:'7px', height:'7px', borderRadius:'50%',
          background: prices ? '#c8a850' : '#333',
          boxShadow: prices ? '0 0 7px #c8a85099' : 'none',
          flexShrink: 0,
        }} className={prices && !isManual ? 'aurum-pulse' : ''} />
        <span style={{ fontSize:'10px', color:'#555', letterSpacing:'1.5px' }}>GOLD 999</span>
        <span style={{ fontSize:'13px', fontWeight:'bold', fontFamily:'monospace', color: prices ? '#e8d070' : '#444' }}>
          {prices ? `₹${fmt(prices.gold)}/g` : '₹ —'}
        </span>
        {prices && !isManual && (
          <span style={{ fontSize:'11px', color: prices.goldUp ? '#4db88a' : '#e07070' }}>
            {prices.goldUp ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* Silver price — click to set manually */}
      <div onClick={handleOpenRateEdit} title="Click to enter today's rate manually" style={{ display:'flex', alignItems:'center', gap:'5px', marginRight:'14px', WebkitAppRegion:'no-drag', flexShrink:0, cursor:'pointer' }}>
        <div style={{
          width:'7px', height:'7px', borderRadius:'50%',
          background: prices ? '#8899bb' : '#333',
          boxShadow: prices ? '0 0 7px #8899bb77' : 'none',
          flexShrink: 0,
        }} className={prices && !isManual ? 'aurum-pulse' : ''} />
        <span style={{ fontSize:'10px', color:'#555', letterSpacing:'1.5px' }}>SILVER 999</span>
        <span style={{ fontSize:'13px', fontWeight:'bold', fontFamily:'monospace', color: prices ? '#aabbd0' : '#444' }}>
          {prices ? `₹${fmt(prices.silver)}/g` : '₹ —'}
        </span>
        {prices && !isManual && (
          <span style={{ fontSize:'11px', color: prices.silverUp ? '#4db88a' : '#e07070' }}>
            {prices.silverUp ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* LIVE / MANUAL / SET RATES badge */}
      <div onClick={handleOpenRateEdit} title="Click to enter rates manually" style={{
        fontSize:'8px', letterSpacing:'1.5px', cursor:'pointer',
        background: !prices ? 'rgba(200,100,50,0.1)' : isManual ? '#0a0a18' : '#091209',
        padding:'2px 8px',
        border: `1px solid ${!prices ? '#6a3a1a' : isManual ? '#2a2a5a' : '#1a3a1a'}`,
        borderRadius:'2px',
        marginRight:'10px', WebkitAppRegion:'no-drag', flexShrink:0,
        display:'flex', alignItems:'center', gap:'4px',
        color: !prices ? '#c07040' : isManual ? '#5060a0' : '#2a6a2a',
      }}>
        {!prices && <><span style={{ color:'#e0903a' }}>✎</span> SET RATES</>}
        {prices && isManual && <><span style={{ color:'#7080c0' }}>✎</span> {`MANUAL · ${prices.updated}`}</>}
        {prices && !isManual && <><span style={{ color:'#4db88a', fontSize:'9px' }} className="aurum-pulse">●</span> {`LIVE · ${prices.updated||''}`}</>}
      </div>

      {/* Manual rate entry popover */}
      {showRateEdit && (
        <div style={{
          position:'fixed', top:'54px', left:'200px', zIndex:9999,
          background:'#0e0e1b', border:'1px solid #c8a850', borderRadius:'4px',
          padding:'16px', minWidth:'280px', boxShadow:'0 8px 32px rgba(0,0,0,0.8)',
          WebkitAppRegion:'no-drag',
        }}>
          <div style={{ fontSize:'11px', color:'#c8a850', letterSpacing:'2px', marginBottom:'12px' }}>✎ ENTER TODAY'S RATES (₹/gram)</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
            <div>
              <div style={{ fontSize:'10px', color:'#555', marginBottom:'4px', letterSpacing:'1px' }}>GOLD 999 (24K)</div>
              <input
                type="number" value={manualGold} onChange={e=>setManualGold(e.target.value)}
                placeholder="e.g. 7240" autoFocus
                onKeyDown={e=>{ if(e.key==='Enter') handleSaveManualRates(); if(e.key==='Escape') setShowRateEdit(false); }}
                style={{ width:'100%', background:'#09090e', border:'1px solid #333', color:'#e8d070',
                  padding:'6px 8px', fontFamily:'monospace', fontSize:'13px', fontWeight:'bold', borderRadius:'2px', boxSizing:'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize:'10px', color:'#555', marginBottom:'4px', letterSpacing:'1px' }}>SILVER 999</div>
              <input
                type="number" value={manualSilver} onChange={e=>setManualSilver(e.target.value)}
                placeholder="e.g. 85"
                onKeyDown={e=>{ if(e.key==='Enter') handleSaveManualRates(); if(e.key==='Escape') setShowRateEdit(false); }}
                style={{ width:'100%', background:'#09090e', border:'1px solid #333', color:'#aabbd0',
                  padding:'6px 8px', fontFamily:'monospace', fontSize:'13px', fontWeight:'bold', borderRadius:'2px', boxSizing:'border-box' }}
              />
            </div>
          </div>
          <div style={{ fontSize:'9px', color:'#444', marginBottom:'10px' }}>
            Source: IBJA daily rates → <span style={{ color:'#c8a850' }}>ibjarates.com</span> · Enter per gram (not per 10g)
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={handleSaveManualRates} style={{
              flex:1, background:'#c8a850', color:'#09090e', border:'none',
              padding:'6px', fontFamily:'monospace', fontSize:'11px', fontWeight:'bold',
              cursor:'pointer', borderRadius:'2px', letterSpacing:'1px',
            }}>✓ SAVE RATES</button>
            <button onClick={()=>setShowRateEdit(false)} style={{
              background:'none', border:'1px solid #222', color:'#444',
              padding:'6px 12px', fontFamily:'monospace', fontSize:'11px',
              cursor:'pointer', borderRadius:'2px',
            }}>✕</button>
          </div>
        </div>
      )}
      {/* Click outside to close */}
      {showRateEdit && <div onClick={()=>setShowRateEdit(false)} style={{ position:'fixed', inset:0, zIndex:9998 }} />}

      {/* Spacer */}
      <div style={{ flex:1 }} />


      {/* Save status */}
      {(backupMsg || lastSaved) && (
        <div style={{
          fontSize:'10px', marginRight:'14px',
          color: backupMsg ? '#4db88a' : '#1e3a1e',
          WebkitAppRegion:'no-drag', flexShrink:0,
        }}>
          {backupMsg || `● Saved ${lastSaved.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`}
        </div>
      )}

      {/* Clock with shimmer */}
      <div style={{ textAlign:'right', marginRight:'10px', WebkitAppRegion:'no-drag', flexShrink:0, minWidth:'150px' }}>
        <ShimmerText speed={4}>
          <span style={{
            fontSize:'14px', fontFamily:'"Courier New",monospace',
            fontWeight:'bold', letterSpacing:'1px', color:'#c8a850',
          }}>{timeStr}</span>
        </ShimmerText>
        <div style={{ fontSize:'9px', color:'#2a2a3a', marginTop:'1px', letterSpacing:'0.5px' }}>{dateStr}</div>
      </div>

      {/* User badge */}
      <div style={{
        display:'flex', alignItems:'center', gap:'8px',
        padding:'4px 10px', marginRight:'6px',
        background:'#09090e', border:'1px solid #181828', borderRadius:'2px',
        WebkitAppRegion:'no-drag', flexShrink:0,
      }}>
        <div style={{
          width:'24px', height:'24px', borderRadius:'50%', flexShrink:0,
          background: user?.roleColor || '#333',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'11px', fontWeight:'bold', color:'#09090e',
          boxShadow: `0 0 8px ${user?.roleColor || '#333'}55`,
        }}>
          {(user?.displayName || user?.username || '?')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize:'11px', color:'#c8a850', fontWeight:'bold', lineHeight:'1' }}>
            {user?.displayName || user?.username}
          </div>
          <div style={{ fontSize:'9px', color:'#444', marginTop:'1px' }}>{user?.roleLabel}</div>
        </div>
{(()=>{
          const myRole = user?.role;
          const uid    = user?.id;
          const unread = uid ? (db?.messages||[]).filter(m=>
            m.fromUserId!==uid &&
            (m.toRole===myRole || myRole==='admin' || myRole==='co') &&
            !(m.readBy||[]).includes(uid)
          ).length : 0;
          return (
            <button onClick={()=>window.dispatchEvent(new CustomEvent('aurum:showMessages'))}
              title={unread>0 ? `Messages (${unread} unread)` : "Messages"}
              style={{ background:'none', border:'1px solid #3a3a4a', borderRadius:'3px',
                color: unread>0?'#5090c8':'#c8a850', cursor:'pointer', fontSize:'13px',
                marginLeft:'6px', padding:'2px 7px', lineHeight:'1.4',
                transition:'all 0.2s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#5090c8';e.currentTarget.style.background='rgba(80,144,200,0.1)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#3a3a4a';e.currentTarget.style.background='none';}}
            >
              💬{unread>0&&<span style={{ fontSize:'10px', fontWeight:'bold', marginLeft:'3px', color:'#5090c8' }}>{unread}</span>}
            </button>
          );
        })()}
        <button onClick={toggleTheme} title={theme==='dark'?'Switch to Light Mode':'Switch to Dark Mode'}
          style={{ background:'none', border:'1px solid #3a3a4a', borderRadius:'3px',
            color:'#c8a850', cursor:'pointer', fontSize:'13px',
            marginLeft:'6px', padding:'2px 7px', lineHeight:'1.4',
            transition:'all 0.2s' }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#c8a850';e.currentTarget.style.background='rgba(200,168,80,0.1)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#3a3a4a';e.currentTarget.style.background='none';}}
        >{theme==='dark'?'☀':'🌙'}</button>
        <button onClick={onLogout} title="Sign out" style={{
          background:'none', border:'none', color:'#2a2a2a',
          cursor:'pointer', fontSize:'15px', marginLeft:'4px', lineHeight:'1',
          transition:'color 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.color='#e07070'}
          onMouseLeave={e => e.currentTarget.style.color='#2a2a2a'}
        >⏻</button>
      </div>

      {/* Window controls — absolutely positioned top-right, never overlap content */}
      {IS_ELECTRON && (
        <div style={{ position:'absolute', top:0, right:0, display:'flex', WebkitAppRegion:'no-drag', zIndex:200 }}>
          {[
            { l:'─', title:'Minimise', fn:()=>window.aurum.window.minimize(), danger:false },
            { l:'□', title:'Maximise', fn:()=>window.aurum.window.maximize(), danger:false },
            { l:'✕', title:'Close',    fn:()=>window.aurum.window.close(),    danger:true  },
          ].map(({l,title,fn,danger})=>(
            <button key={l} title={title} onClick={fn} style={{
              width:'38px', height:'46px', background:'none', border:'none',
              color:'#2a2a3a', fontSize:'13px', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.15s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = danger ? 'rgba(200,40,40,0.2)' : 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = danger ? '#ff7777' : '#888';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = '#2a2a3a';
              }}
            >{l}</button>
          ))}
        </div>
      )}
    </div>

      {/* ── Jewellery News Ticker ── */}
      {newsTicker ? (
        <div style={{
          height: '24px',
          background: 'linear-gradient(90deg, #0a0a12 0%, #0d0d18 50%, #0a0a12 100%)',
          borderBottom: '1px solid #141420',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}>
          {/* INDUSTRY NEWS label */}
          <div style={{
            flexShrink: 0,
            padding: '0 10px',
            fontSize: '8px',
            letterSpacing: '2px',
            color: '#c8a850',
            background: '#0a0a12',
            borderRight: '1px solid #1a1a28',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            zIndex: 2,
          }}>NEWS</div>

          {/* Scrolling ticker */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <style>{`
              @keyframes newsScroll {
                0%   { transform: translateX(100vw); }
                100% { transform: translateX(-100%); }
              }
              .aurum-news-ticker {
                display: inline-block;
                white-space: nowrap;
                animation: newsScroll 200s linear infinite;
                animation-play-state: running;
              }
              .aurum-news-ticker:hover {
                animation-play-state: paused;
              }
            `}</style>
            <span className="aurum-news-ticker" style={{
              fontSize: '12.5px',
              color: '#8890a8',
              fontFamily: "'Courier New', monospace",
              letterSpacing: '0.3px',
              cursor: 'default',
            }} title="Hover to pause">
              {newsTicker}
            </span>
          </div>

          {/* Right fade overlay */}
          <div style={{
            position: 'absolute', right: 0, top: 0,
            width: '40px', height: '100%',
            background: 'linear-gradient(90deg, transparent, #0a0a12)',
            pointerEvents: 'none', zIndex: 1,
          }} />
        </div>
      ) : (
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, #0a0a12, #1a1428, #0a0a12)',
        }} />
      )}
    </div>
  );
}
