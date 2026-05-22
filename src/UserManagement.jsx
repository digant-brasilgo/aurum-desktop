import React, { useState, useEffect } from 'react';

const ROLES = {
  admin:              { label:'Administrator',       color:'#c8a850' },
  co:                 { label:'Central Office',      color:'#4a9eda' },
  production_manager: { label:'Production Manager',  color:'#4db88a' },
  data_manager:       { label:'Data Manager',        color:'#a070d0' },
  metal_issuer:       { label:'Metal Issuer',        color:'#e0903a' },
  stone_issuer:       { label:'Stone Issuer',        color:'#7090c0' },
};

const IS_ELECTRON = typeof window !== 'undefined' && !!window.isElectron;

async function api(method, path, body) {
  if (IS_ELECTRON) {
    if (path === '/users'  && method === 'GET')   return window.aurum.auth.getUsers();
    if (path === '/users'  && method === 'POST')  return window.aurum.auth.addUser(body);
    if (path.startsWith('/users/') && method === 'PATCH')
      return window.aurum.auth.updateUser(path.split('/')[2], body);
    if (path === '/change-password' && method === 'POST')
      return window.aurum.auth.changePassword(body.userId, body.oldPassword, body.newPassword);
    if (path === '/admin-reset-password' && method === 'POST')
      return window.aurum.auth.adminResetPassword(body.userId, body.newPassword);
  } else {
    const token = sessionStorage.getItem('aurum_token');
    const url   = `${window.__AURUM_SERVER_URL}/api${path}`;
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type':'application/json', 'x-aurum-token':token },
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.json();
  }
}

export default function UserManagement({ currentUser }) {
  const [users,   setUsers]   = useState([]);
  const [tab,     setTab]     = useState('users');
  const [msg,     setMsg]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username:'', password:'', displayName:'', role:'production_manager' });
  const [showPw,  setShowPw]  = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [editData,setEditData]= useState({});
  const [pwForm,  setPwForm]  = useState({ old:'', new1:'', new2:'' });

  // Only admin and co can manage system users
  const canManage = ['admin','co'].includes(currentUser?.role);
  // Roles this user can create
  const creatableRoles = canManage
    ? (currentUser.role === 'admin'
        ? ['admin','co','production_manager','data_manager','metal_issuer','stone_issuer']
        : ['production_manager','data_manager','metal_issuer','stone_issuer'])
    : [];

  function flash(text, isError=false) {
    setMsg({ text, isError });
    setTimeout(() => setMsg(null), 5000);
  }

  useEffect(() => {
    if (canManage) loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await api('GET', '/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch { flash('Failed to load users', true); }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    if (!newUser.username.trim()) return flash('Username is required', true);
    if (!newUser.password)        return flash('Password is required', true);
    if (newUser.password.length < 6) return flash('Password must be at least 6 characters', true);
    setLoading(true);
    const result = await api('POST', '/users', { ...newUser, creatorRole: currentUser.role });
    setLoading(false);
    if (result?.success || result?.ok) {
      flash(`✓ User "${newUser.displayName || newUser.username}" created successfully`);
      setNewUser({ username:'', password:'', displayName:'', role:'production_manager' });
      loadUsers();
    } else {
      flash(result?.error || 'Failed to create user', true);
    }
  }

  async function handleToggleActive(user) {
    const r = await api('PATCH', `/users/${user.id}`, { isActive: !user.isActive });
    if (r?.ok || r?.success) {
      flash(`✓ User ${user.isActive ? 'deactivated' : 'activated'}`);
      loadUsers();
    } else flash(r?.error || 'Failed', true);
  }

  const [resetId, setResetId] = useState(null);
  const [resetPw, setResetPw] = useState('');

  async function handleAdminResetPw() {
    if (!resetPw || resetPw.length < 6) return flash('Password must be at least 6 characters', true);
    const r = await api('POST', '/admin-reset-password', { userId: resetId, newPassword: resetPw });
    if (r?.ok || r?.success) {
      flash('✓ Password reset successfully'); setResetId(null); setResetPw('');
    } else flash(r?.error || 'Failed to reset password', true);
  }

  async function handleSaveEdit() {
    const r = await api('PATCH', `/users/${editId}`, editData);
    if (r?.ok || r?.success) {
      flash('✓ User updated'); setEditId(null); setEditData({}); loadUsers();
    } else flash(r?.error || 'Failed', true);
  }

  async function handleChangePw(e) {
    e.preventDefault();
    if (!pwForm.old)  return flash('Enter current password', true);
    if (!pwForm.new1) return flash('Enter new password', true);
    if (pwForm.new1 !== pwForm.new2) return flash('New passwords do not match', true);
    if (pwForm.new1.length < 6) return flash('Minimum 6 characters required', true);
    setLoading(true);
    const r = await api('POST', '/change-password', {
      userId: currentUser.id, oldPassword: pwForm.old, newPassword: pwForm.new1,
    });
    setLoading(false);
    if (r?.ok || r?.success) {
      flash('✓ Password changed successfully'); setPwForm({ old:'', new1:'', new2:'' });
    } else flash(r?.error || 'Failed', true);
  }

  // Styles
  const card  = { background:'#12121a', border:'1px solid #1a1a2e', borderRadius:'3px', padding:'20px', marginBottom:'20px' };
  const label = { fontSize:'10px', color:'#555', letterSpacing:'1px', marginBottom:'6px', display:'block', textTransform:'uppercase' };
  const input = { width:'100%', background:'#0a0a0f', border:'1px solid #1a1a2e', color:'#e8d5a3',
                  padding:'8px 12px', fontFamily:'monospace', fontSize:'13px', borderRadius:'2px',
                  outline:'none', boxSizing:'border-box' };
  const btn = (v='default') => ({
    padding:'7px 16px', border:'none', borderRadius:'2px', cursor:'pointer',
    fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', fontFamily:'monospace',
    background: v==='gold'?'#c8a850': v==='danger'?'rgba(180,50,50,0.2)':'#1a1a2e',
    color:      v==='gold'?'#0a0a0f': v==='danger'?'#e07070':'#c8a850',
    border:     v==='danger'?'1px solid rgba(180,50,50,0.3)':'1px solid #2a2a3a',
  });
  const badge = (color) => ({
    display:'inline-block', padding:'2px 8px', borderRadius:'2px',
    fontSize:'10px', letterSpacing:'1px',
    background:`${color}22`, color, border:`1px solid ${color}44`,
  });
  const msgStyle = (isError) => ({
    padding:'10px 16px', borderRadius:'2px', marginBottom:'16px', fontSize:'12px',
    background: isError?'rgba(180,50,50,0.15)':'rgba(77,184,138,0.15)',
    border:`1px solid ${isError?'rgba(180,50,50,0.3)':'rgba(77,184,138,0.3)'}`,
    color: isError?'#e07070':'#4db88a',
  });

  const tabs = [
    canManage && { key:'users',    label:'Users' },
    { key:'password', label:'Change My Password' },
  ].filter(Boolean);

  return (
    <div style={{ padding:'24px', maxWidth:'960px' }}>
      <div style={{ fontSize:'11px', color:'#8a6520', letterSpacing:'3px', marginBottom:'24px' }}>◈ USER MANAGEMENT</div>

      {msg && <div style={msgStyle(msg.isError)}>{msg.text}</div>}

      <div style={{ display:'flex', gap:'2px', marginBottom:'24px', borderBottom:'1px solid #1a1a2e' }}>
        {tabs.map(t => (
          <button key={t.key} style={{
            padding:'8px 20px', background:'none', border:'none',
            borderBottom: tab===t.key?'2px solid #c8a850':'2px solid transparent',
            color: tab===t.key?'#c8a850':'#555', cursor:'pointer',
            fontSize:'12px', letterSpacing:'1px', textTransform:'uppercase',
          }} onClick={()=>setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── USER LIST (admin/co only) ── */}
      {tab==='users' && canManage && (<>
        {/* Add user */}
        <div style={card}>
          <div style={{ fontSize:'11px', color:'#c8a850', letterSpacing:'2px', marginBottom:'16px' }}>ADD NEW USER</div>
          <form onSubmit={handleAddUser}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div>
                <label style={label}>Username *</label>
                <input style={input} value={newUser.username}
                  onChange={e=>setNewUser({...newUser,username:e.target.value.toLowerCase().replace(/\s/g,'')})}
                  placeholder="e.g. ravi.kumar" />
              </div>
              <div>
                <label style={label}>Display Name</label>
                <input style={input} value={newUser.displayName}
                  onChange={e=>setNewUser({...newUser,displayName:e.target.value})}
                  placeholder="e.g. Ravi Kumar" />
              </div>
              <div>
                <label style={label}>Password *</label>
                <div style={{ position:'relative' }}>
                  <input style={input} type={showPw?'text':'password'} value={newUser.password}
                    onChange={e=>setNewUser({...newUser,password:e.target.value})}
                    placeholder="Min 6 characters" />
                  <button type="button" onClick={()=>setShowPw(!showPw)} style={{
                    position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', color:'#555', cursor:'pointer',
                  }}>{showPw?'🙈':'👁'}</button>
                </div>
              </div>
              <div>
                <label style={label}>Role *</label>
                <select style={input} value={newUser.role}
                  onChange={e=>setNewUser({...newUser,role:e.target.value})}>
                  {creatableRoles.map(r=>(
                    <option key={r} value={r}>{ROLES[r]?.label||r}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" style={btn('gold')} disabled={loading}>
              {loading?'Creating...':'+ Create User'}
            </button>
          </form>
        </div>

        {/* Role guide */}
        <div style={{ ...card, marginBottom:'20px' }}>
          <div style={{ fontSize:'11px', color:'#c8a850', letterSpacing:'2px', marginBottom:'12px' }}>ROLE PERMISSIONS</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            {[
              { key:'admin',              desc:'Full access to everything including all settings, user management, financial data, editing any entry.' },
              { key:'co',                 desc:'Full access to all operations. Can create Production and Data Manager accounts.' },
              { key:'production_manager', desc:'Can create Karigars, Designs, Bags. Enter movements and weights. Cannot edit past entries. Cannot manage system users.' },
              { key:'data_manager',       desc:'Same as Production Manager — create and enter data. Cannot edit past entries or manage system users.' },
              { key:'metal_issuer',       desc:'Physically holds and issues alloyed metal stock. Sees their issuance queue. Confirms physical handover of approved metal demands.' },
              { key:'stone_issuer',       desc:'Physically holds and issues stone stock. Sees their issuance queue. Confirms physical handover of approved stone demands.' },
            ].map(({key,desc})=>(
              <div key={key} style={{ padding:'12px', background:'#0a0a0f', borderRadius:'2px', border:`1px solid ${ROLES[key].color}22` }}>
                <span style={badge(ROLES[key].color)}>{ROLES[key].label}</span>
                <div style={{ fontSize:'11px', color:'#555', lineHeight:'1.6', marginTop:'8px' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* User table */}
        <div style={card}>
          <div style={{ fontSize:'11px', color:'#c8a850', letterSpacing:'2px', marginBottom:'16px' }}>
            ALL USERS ({users.length})
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #1a1a2e' }}>
                {['Display Name','Username','Role','Status','Last Login','Actions'].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#555', fontSize:'10px', letterSpacing:'1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u=>(
                <React.Fragment key={u.id}>
                <tr style={{ borderBottom:'1px solid #0f0f18', opacity:u.isActive?1:0.45 }}>
                  <td style={{ padding:'10px 12px' }}>
                    {editId===u.id
                      ? <input style={{...input,width:'140px'}} value={editData.displayName??u.displayName}
                          onChange={e=>setEditData({...editData,displayName:e.target.value})} />
                      : <span style={{ color:'#e8d5a3' }}>{u.displayName}</span>
                    }
                  </td>
                  <td style={{ padding:'10px 12px', color:'#555', fontFamily:'monospace' }}>{u.username}</td>
                  <td style={{ padding:'10px 12px' }}>
                    {editId===u.id && currentUser.role==='admin'
                      ? <select style={{...input,width:'160px'}} value={editData.role??u.role}
                          onChange={e=>setEditData({...editData,role:e.target.value})}>
                          {creatableRoles.map(r=><option key={r} value={r}>{ROLES[r]?.label||r}</option>)}
                        </select>
                      : <span style={badge(ROLES[u.role]?.color||'#888')}>{u.roleLabel||ROLES[u.role]?.label||u.role}</span>
                    }
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ fontSize:'10px', color:u.isActive?'#4db88a':'#555' }}>
                      {u.isActive?'● Active':'○ Inactive'}
                    </span>
                  </td>
                  <td style={{ padding:'10px 12px', color:'#444', fontSize:'11px', fontFamily:'monospace' }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : 'Never'}
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
                      {editId===u.id ? (<>
                        <button style={btn('gold')} onClick={handleSaveEdit}>Save</button>
                        <button style={btn()} onClick={()=>{setEditId(null);setEditData({});}}>Cancel</button>
                      </>) : (<>
                        {(currentUser.role==='admin' || (u.id !== currentUser.id && !['admin','co'].includes(u.role))) && (
                          <button style={btn()} onClick={()=>{setEditId(u.id);setEditData({});setResetId(null);}}>
                            {u.id===currentUser.id ? 'Edit My Name' : 'Edit'}
                          </button>
                        )}
                        {currentUser.role==='admin' && u.id !== currentUser.id && (
                          <button style={{...btn(), color:'#c8a850', borderColor:'#4a3810'}}
                            onClick={()=>{setResetId(resetId===u.id?null:u.id);setResetPw('');setEditId(null);}}>
                            🔑 Reset Pw
                          </button>
                        )}
                        {u.id !== currentUser.id && (currentUser.role==='admin' || !['admin','co'].includes(u.role)) && (
                          <button style={btn(u.isActive?'danger':'default')} onClick={()=>handleToggleActive(u)}>
                            {u.isActive?'Deactivate':'Activate'}
                          </button>
                        )}
                      </>)}
                    </div>
                  </td>
                </tr>
                {resetId===u.id && (
                  <tr style={{ background:'#0d0d18', borderBottom:'1px solid #1a1a2e' }}>
                    <td colSpan={6} style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <span style={{ fontSize:'11px', color:'#c8a850', letterSpacing:'1px' }}>🔑 RESET PASSWORD FOR {u.displayName}:</span>
                        <input style={{...input, width:'200px'}} type="password" placeholder="New password (min 6 chars)"
                          value={resetPw} onChange={e=>setResetPw(e.target.value)}
                          onKeyDown={e=>e.key==='Enter'&&handleAdminResetPw()} autoFocus />
                        <button style={btn('gold')} onMouseDown={e=>{e.preventDefault(); handleAdminResetPw();}}>✓ Set Password</button>
                        <button style={btn()} onClick={()=>{setResetId(null);setResetPw('');}}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </>)}

      {/* ── CHANGE PASSWORD ── */}
      {tab==='password' && (
        <div style={{ ...card, maxWidth:'400px' }}>
          <div style={{ fontSize:'11px', color:'#c8a850', letterSpacing:'2px', marginBottom:'16px' }}>CHANGE YOUR PASSWORD</div>
          <form onSubmit={handleChangePw}>
            {[
              { key:'old',  lbl:'Current Password',    ph:'Your current password' },
              { key:'new1', lbl:'New Password',         ph:'Minimum 6 characters' },
              { key:'new2', lbl:'Confirm New Password', ph:'Repeat new password' },
            ].map(f=>(
              <div key={f.key} style={{ marginBottom:'14px' }}>
                <label style={label}>{f.lbl}</label>
                <input style={input} type="password" placeholder={f.ph}
                  value={pwForm[f.key]} onChange={e=>setPwForm({...pwForm,[f.key]:e.target.value})} />
              </div>
            ))}
            <button type="submit" style={btn('gold')} disabled={loading}>
              {loading?'Saving...':'Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
