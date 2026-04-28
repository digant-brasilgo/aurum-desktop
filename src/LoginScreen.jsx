import { useState, useEffect } from 'react';

const IS_ELECTRON = typeof window !== 'undefined' && !!window.isElectron;

export default function LoginScreen({ onLogin }) {
  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [time,       setTime]       = useState(new Date());
  const [serverOk,   setServerOk]   = useState(IS_ELECTRON ? true : null);
  const [companies,  setCompanies]  = useState([]);
  const [companyId,  setCompanyId]  = useState('');
  const serverUrl = window.__AURUM_SERVER_URL || '';

  // Load company list on mount
  useEffect(() => {
    if (!IS_ELECTRON || !window.aurum?.company) return;
    window.aurum.company.list().then(list => {
      const active = list.filter(c => c.isActive !== false);
      setCompanies(active);
      if (active.length === 1) setCompanyId(active[0].id);
    }).catch(() => {
      setCompanies([{ id:'brasilgo', name:'Brasilgo Jewels Private Limited', shortName:'Brasilgo' }]);
      setCompanyId('brasilgo');
    });
  }, []);

  // Clock
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // LAN: check server connection
  useEffect(() => {
    if (IS_ELECTRON || !serverUrl) return;
    async function check() {
      try {
        const r = await fetch(`${serverUrl}/api/status`, { signal: AbortSignal.timeout(3000) });
        const d = await r.json();
        setServerOk(d.ok === true);
      } catch {
        setServerOk(false);
        setTimeout(check, 3000);
      }
    }
    check();
  }, [serverUrl]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim()) { setError('Please enter your username'); return; }
    if (!password)         { setError('Please enter your password'); return; }
    setLoading(true); setError('');

    try {
      let result;
      if (IS_ELECTRON) {
        if (!companyId) { setError('Please select a company'); setLoading(false); return; }
        result = await window.aurum.auth.login(username.trim(), password, companyId);
      } else {
        const r = await fetch(`${serverUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        result = await r.json();
        if (result.token) sessionStorage.setItem('aurum_token', result.token);
      }

      if (result.success) {
        const co = companies.find(c=>c.id===companyId);
        onLogin(result.user, co || { id:companyId, name:companyId, shortName:companyId });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection failed. Check server is running.');
    } finally {
      setLoading(false);
    }
  }

  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div style={{
      height: '100vh', background: '#06060f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundImage: 'radial-gradient(ellipse at 30% 50%, #0f0f1e 0%, #06060f 70%)',
    }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '40px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 24px',
        background: 'rgba(10,10,20,0.8)', borderBottom: '1px solid #0f0f1e',
        WebkitAppRegion: 'drag',
      }}>
        <div style={{ fontSize: '11px', color: '#2a2a3a', letterSpacing: '2px' }}>
          BRASILGO JEWELS PRIVATE LIMITED
        </div>
        <div style={{ fontSize: '12px', color: '#333', fontFamily: 'monospace' }}>
          {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>

      {/* Login card */}
      <div style={{
        width: '380px',
        background: 'linear-gradient(160deg, #0f0f1c 0%, #0a0a14 100%)',
        border: '1px solid #1a1a2e',
        borderRadius: '4px',
        padding: '48px 40px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(200,168,80,0.05)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: '32px', letterSpacing: '8px', fontWeight: 'bold',
            fontFamily: 'Georgia, serif', color: '#c8a850',
            marginBottom: '6px',
          }}>AURUM</div>
          <div style={{ fontSize: '9px', color: '#2a2a3a', letterSpacing: '4px' }}>
            JEWELLERY METAL TRACKING
          </div>
          <div style={{
            width: '40px', height: '1px',
            background: 'linear-gradient(90deg, transparent, #c8a850, transparent)',
            margin: '12px auto 0',
          }} />
        </div>

        {/* Server status for LAN mode */}
        {!IS_ELECTRON && (
          <div style={{
            marginBottom: '20px', padding: '8px 12px', borderRadius: '2px',
            background: serverOk === true ? 'rgba(77,184,138,0.1)' : serverOk === false ? 'rgba(180,50,50,0.1)' : 'rgba(200,168,80,0.1)',
            border: `1px solid ${serverOk === true ? 'rgba(77,184,138,0.2)' : serverOk === false ? 'rgba(180,50,50,0.2)' : 'rgba(200,168,80,0.2)'}`,
            fontSize: '10px', letterSpacing: '1px',
            color: serverOk === true ? '#4db88a' : serverOk === false ? '#e07070' : '#c8a850',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span>{serverOk === true ? '●' : serverOk === false ? '○' : '◌'}</span>
            {serverOk === true ? `Connected to server` : serverOk === false ? 'Cannot reach server — check connection' : 'Connecting to server...'}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: '16px', padding: '10px 14px', borderRadius: '2px',
            background: 'rgba(180,50,50,0.1)', border: '1px solid rgba(180,50,50,0.25)',
            color: '#e07070', fontSize: '12px',
          }}>{error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          {/* Company selector — only if multiple companies */}
          {IS_ELECTRON && companies.length > 1 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '9px', color: '#444', letterSpacing: '2px', marginBottom: '6px' }}>COMPANY</div>
              <select value={companyId} onChange={e=>setCompanyId(e.target.value)}
                style={{ width:'100%', background:'#0a0a14', border:'1px solid #1a1a2e',
                  borderRadius:'2px', padding:'10px 14px', color:'#e8d5a3',
                  fontSize:'13px', fontFamily:'monospace', outline:'none', boxSizing:'border-box' }}>
                <option value="">— Select Company —</option>
                {companies.map(c=>(
                  <option key={c.id} value={c.id}>{c.shortName||c.name}</option>
                ))}
              </select>
            </div>
          )}
          {IS_ELECTRON && companies.length === 1 && companyId && (
            <div style={{ textAlign:'center', fontSize:'11px', color:'#c8a850', marginBottom:'14px', letterSpacing:'1px' }}>
              {companies[0].shortName||companies[0].name}
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '9px', color: '#444', letterSpacing: '2px', marginBottom: '6px' }}>USERNAME</div>
            <input
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              style={{
                width: '100%', background: '#0a0a14', border: '1px solid #1a1a2e',
                borderRadius: '2px', padding: '10px 14px', color: '#e8d5a3',
                fontSize: '13px', fontFamily: 'monospace', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#c8a850'}
              onBlur={e  => e.target.style.borderColor = '#1a1a2e'}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '9px', color: '#444', letterSpacing: '2px', marginBottom: '6px' }}>PASSWORD</div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%', background: '#0a0a14', border: '1px solid #1a1a2e',
                  borderRadius: '2px', padding: '10px 40px 10px 14px', color: '#e8d5a3',
                  fontSize: '13px', fontFamily: 'monospace', outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#c8a850'}
                onBlur={e  => e.target.style.borderColor = '#1a1a2e'}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '14px',
              }}>{showPw ? '🙈' : '👁'}</button>
            </div>
          </div>

          <button type="submit" disabled={loading || serverOk === false} style={{
            width: '100%', padding: '12px',
            background: loading ? '#6a5010' : 'linear-gradient(135deg, #b8982a 0%, #c8a850 50%, #d4b860 100%)',
            border: 'none', borderRadius: '2px', color: '#0a0a0f',
            fontSize: '12px', fontWeight: 'bold', letterSpacing: '3px',
            cursor: loading ? 'wait' : 'pointer',
            textTransform: 'uppercase', fontFamily: 'Arial, sans-serif',
            transition: 'all 0.2s',
            opacity: serverOk === false ? 0.4 : 1,
          }}>
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: '#333', letterSpacing: '1px' }}>
            {days[time.getDay()]}, {time.getDate()} {months[time.getMonth()]} {time.getFullYear()}
          </div>
          <div style={{ fontSize: '8px', color: '#2a2a3a', marginTop: '6px', letterSpacing: '0.5px' }}>
            © {new Date().getFullYear()} Brasilgo Jewels Private Limited
          </div>
          <div style={{ fontSize: '7px', color: '#1e1e2e', marginTop: '2px', letterSpacing: '0.3px' }}>
            All rights reserved. Unauthorised use prohibited.
          </div>
        </div>
      </div>
    </div>
  );
}
