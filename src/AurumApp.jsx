import { useState, useEffect, Component } from 'react';
import LoginScreen from './LoginScreen.jsx';
import LiveTicker from './LiveTicker.jsx';
import { useAurumData } from './useAurumData.js';
import MainApp from './MainApp.jsx';

// Error boundary to catch crashes inside MainApp
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:'40px', background:'#0a0a0f', color:'#e07070', fontFamily:'monospace', height:'100%', overflowY:'auto' }}>
          <div style={{ color:'#c8a850', fontSize:'20px', marginBottom:'20px' }}>AURUM — Error Loading App</div>
          <div style={{ background:'#1a0808', border:'1px solid #c45', padding:'20px', borderRadius:'4px', marginBottom:'16px' }}>
            <div style={{ color:'#ff8888', marginBottom:'8px', fontSize:'14px' }}>{this.state.error.message}</div>
            <pre style={{ fontSize:'11px', color:'#aa6666', whiteSpace:'pre-wrap', overflow:'auto' }}>
              {this.state.error.stack}
            </pre>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ background:'#c8a850', color:'#0a0a0f', border:'none', padding:'10px 20px', cursor:'pointer', fontFamily:'monospace', fontWeight:'bold' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AurumApp() {
  const [user,    setUser]    = useState(null);
  const [company, setCompany] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openTabs, setOpenTabs] = useState(['dashboard']);
  const [theme, setTheme] = useState(() => localStorage.getItem('aurum_theme') || 'dark');
  const { db, updateDB, saveNow, reloadDB, loading, lastSaved } = useAurumData();

  const toggleTheme = () => setTheme(t => {
    const next = t === 'dark' ? 'light' : 'dark';
    localStorage.setItem('aurum_theme', next);
    return next;
  });

  const openTab = (id) => {
    setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id]);
    setActiveTab(id);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('aurum_user');
    if (saved) { try { setUser(JSON.parse(saved)); } catch {} }
    const savedCo = sessionStorage.getItem('aurum_company');
    if (savedCo) { try { setCompany(JSON.parse(savedCo)); } catch {} }
  }, []);

  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveNow(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [saveNow]);

  const handleLogin = async (userData, companyData) => {
    setUser(userData);
    if (companyData) setCompany(companyData);
    sessionStorage.setItem('aurum_user', JSON.stringify(userData));
    if (companyData) sessionStorage.setItem('aurum_company', JSON.stringify(companyData));
    // Reload data for the selected company (activeCompanyId is now set in main process)
    if (reloadDB) await reloadDB();
  };

  const handleLogout = async () => {
    await saveNow();
    setUser(null);
    setCompany(null);
    sessionStorage.removeItem('aurum_user');
    sessionStorage.removeItem('aurum_company');
  };

  const can = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return (user.permissions || []).includes(permission);
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  if (loading || !db) {
    return (
      <div style={{ height:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'16px' }}>
        <div style={{ color:'#c8a850', fontSize:'16px', letterSpacing:'3px' }}>AURUM</div>
        <div style={{ color:'#555', fontSize:'12px', letterSpacing:'2px' }}>LOADING DATA...</div>
      </div>
    );
  }

  return (
    <div className={`theme-${theme}`} style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#0a0a0f', overflow:'hidden' }}>
      <LiveTicker user={user} company={company} onLogout={handleLogout} lastSaved={lastSaved} db={db} onNavigate={openTab} theme={theme} toggleTheme={toggleTheme} />
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <ErrorBoundary>
          <MainApp db={db} updateDB={updateDB} user={user} company={company} onLogout={handleLogout} can={can} activeTab={activeTab} setActiveTab={setActiveTab} openTabs={openTabs} setOpenTabs={setOpenTabs} openTab={openTab} theme={theme} toggleTheme={toggleTheme} />
        </ErrorBoundary>
      </div>
      {/* Busy overlay — shown on initial load */}
      {loading && (
        <div className="aurum-busy-overlay">
          <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div className="aurum-busy-ring" />
            <div className="aurum-busy-diamond" />
          </div>
        </div>
      )}
    </div>
  );
}
