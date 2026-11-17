import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Settings as SettingsIcon, LogOut, Boxes, Menu, X } from 'lucide-react';
import { api } from './api';

function Protected({ children }) {
  return localStorage.getItem('stockflow_token') ? children : <Navigate to="/login" replace />;
}

function AuthPage({ mode, onAuth }) {
  const [form, setForm] = useState({ email: '', password: '', organizationName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const signup = mode === 'signup';
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const data = await api(`/auth/${signup ? 'signup' : 'login'}`, {
        method: 'POST', body: JSON.stringify(form)
      });
      localStorage.setItem('stockflow_token', data.token);
      localStorage.setItem('stockflow_user', JSON.stringify(data.user));
      onAuth(data.user); navigate('/');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="auth-wrap"><div className="auth-card">
    <div className="brand-mark"><Boxes size={24}/></div>
    <p className="eyebrow">INVENTORY, SIMPLIFIED</p><h1>{signup ? 'Create your workspace' : 'Welcome back'}</h1>
    <p className="muted">{signup ? 'Start managing your inventory with StockFlow.' : 'Sign in to continue to your inventory.'}</p>
    <form onSubmit={submit}>
      {signup && <label>Organization name<input required maxLength="150" placeholder="My Test Store" value={form.organizationName} onChange={e=>setForm({...form, organizationName:e.target.value})}/></label>}
      <label>Email address<input required type="email" placeholder="you@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label>Password<input required minLength="8" type="password" placeholder="At least 8 characters" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
      {error && <div className="alert">{error}</div>}
      <button className="primary full" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
    </form>
    <p className="auth-switch">{signup ? 'Already have an account?' : 'New to StockFlow?'} <a href={signup?'/login':'/signup'}>{signup?'Sign in':'Create an account'}</a></p>
  </div></div>;
}

function Shell({ user, onLogout, children }) {
  const [open,setOpen]=useState(false);
  const location=useLocation();
  useEffect(()=>setOpen(false),[location.pathname]);
  return <div className="app-shell">
    <aside className={`sidebar ${open?'sidebar-open':''}`}>
      <div className="sidebar-brand"><span className="brand-mark small"><Boxes size={19}/></span><span>stockflow</span><button className="mobile-close" onClick={()=>setOpen(false)}><X/></button></div>
      <div className="org-label">WORKSPACE</div><div className="org-name">{user?.organizationName || 'My organization'}</div>
      <nav>
        <NavLink to="/" end><LayoutDashboard size={18}/>Dashboard</NavLink>
        <NavLink to="/products"><Package size={18}/>Products</NavLink>
        <NavLink to="/settings"><SettingsIcon size={18}/>Settings</NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="avatar">{(user?.email||'U')[0].toUpperCase()}</div><div className="user-info"><strong>{user?.email}</strong><span>Workspace owner</span></div><button className="icon-btn" title="Sign out" onClick={onLogout}><LogOut size={18}/></button></div>
    </aside>
    {open && <div className="scrim" onClick={()=>setOpen(false)} />}
    <main className="main-area"><header className="topbar"><button className="menu-btn" onClick={()=>setOpen(true)}><Menu/></button><span>Inventory management</span><div className="topbar-right">Stock overview <span className="status-dot"/></div></header><div className="page-content">{children}</div></main>
  </div>;
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>;
}
function Dashboard() {
  const [data,setData]=useState(null); const [error,setError]=useState('');
  useEffect(()=>{api('/dashboard').then(setData).catch(e=>setError(e.message));},[]);
  return <><PageHeading eyebrow="OVERVIEW" title="Dashboard" description="Here's what's happening with your inventory."/>
    {error && <div className="alert">{error}</div>}
    {!data ? <div className="loading">Loading dashboard…</div> : <>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-top"><span>Total products</span><span className="stat-icon purple"><Package/></span></div><strong>{data.totalProducts}</strong><small>Products in your catalog</small></div>
        <div className="stat-card"><div className="stat-top"><span>Units in stock</span><span className="stat-icon green"><Boxes/></span></div><strong>{data.totalUnits.toLocaleString()}</strong><small>Total quantity on hand</small></div>
        <div className="stat-card"><div className="stat-top"><span>Low stock items</span><span className="stat-icon orange"><LayoutDashboard/></span></div><strong>{data.lowStockCount}</strong><small>Need your attention</small></div>
      </div>
      <section className="panel"><div className="panel-heading"><div><h2>Low stock items</h2><p className="muted">Products at or below their stock threshold.</p></div><span className="pill warning">{data.lowStockCount} items</span></div>
      {data.lowStockItems.length ? <div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Quantity</th><th>Threshold</th><th>Status</th></tr></thead><tbody>{data.lowStockItems.map(p=><tr key={p.id}><td className="product-name">{p.name}</td><td>{p.sku}</td><td>{p.quantityOnHand}</td><td>{p.lowStockThreshold}</td><td><span className="pill danger">Low stock</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon"><Package/></div><strong>Everything looks stocked</strong><p>No low-stock products right now.</p></div>}
      </section>
    </>}
  </>;
}

const blankProduct={name:'',sku:'',description:'',quantityOnHand:0,costPrice:'',sellingPrice:'',lowStockThreshold:''};
function ProductForm({ initial, onClose, onSaved }) {
  const [form,setForm]=useState(initial||blankProduct); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e) {
    e.preventDefault();setBusy(true);setError('');
    try {
      const editing=Boolean(initial?.id);
      await api(editing?`/products/${initial.id}`:'/products',{method:editing?'PUT':'POST',body:JSON.stringify({...form,quantityOnHand:Number(form.quantityOnHand)})});
      onSaved();
    } catch(err){setError(err.message);} finally{setBusy(false);}
  }
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal">
    <div className="modal-heading"><div><p className="eyebrow">PRODUCT DETAILS</p><h2>{initial?.id?'Edit product':'Add a product'}</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <form onSubmit={submit} className="product-form">
      <label>Product name *<input required maxLength="180" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Wireless keyboard"/></label>
      <label>SKU *<input required maxLength="80" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="e.g. KEY-001"/></label>
      <label className="span-two">Description<textarea rows="2" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Optional product details"/></label>
      <label>Quantity on hand *<input required type="number" min="0" step="1" value={form.quantityOnHand} onChange={e=>setForm({...form,quantityOnHand:e.target.value})}/></label>
      <label>Low stock threshold<input type="number" min="0" step="1" placeholder="Use workspace default" value={form.lowStockThreshold??''} onChange={e=>setForm({...form,lowStockThreshold:e.target.value})}/></label>
      <label>Cost price<input type="number" min="0" step="0.01" value={form.costPrice??''} onChange={e=>setForm({...form,costPrice:e.target.value})} placeholder="0.00"/></label>
      <label>Selling price<input type="number" min="0" step="0.01" value={form.sellingPrice??''} onChange={e=>setForm({...form,sellingPrice:e.target.value})} placeholder="0.00"/></label>
      {error&&<div className="alert span-two">{error}</div>}
      <div className="modal-actions span-two"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy?'Saving…':initial?.id?'Save changes':'Create product'}</button></div>
    </form>
  </div></div>;
}

function Products() {
  const [products,setProducts]=useState([]);const [search,setSearch]=useState('');const [modal,setModal]=useState(null);const [error,setError]=useState('');
  async function load(){try{const d=await api(`/products?search=${encodeURIComponent(search)}`);setProducts(d.products);setError('');}catch(e){setError(e.message);}}
  useEffect(()=>{const t=setTimeout(load,250);return()=>clearTimeout(t);},[search]);
  async function remove(p){if(!window.confirm(`Delete "${p.name}"? This cannot be undone.`))return;try{await api(`/products/${p.id}`,{method:'DELETE'});load();}catch(e){setError(e.message);}}
  return <><PageHeading eyebrow="CATALOG" title="Products" description="Manage your products, prices, and available stock." action={<button className="primary" onClick={()=>setModal({})}>＋ Add product</button>}/>
    <section className="panel"><div className="toolbar"><div className="search-box"><span>⌕</span><input placeholder="Search by product name or SKU…" value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="muted count-label">{products.length} products</span></div>
      {error&&<div className="alert">{error}</div>}
      {products.length ? <div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Quantity</th><th>Low stock threshold</th><th>Status</th><th>Selling price</th><th>Actions</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><div className="product-name">{p.name}</div>{p.description&&<small className="description">{p.description}</small>}</td><td>{p.sku}</td><td>{p.quantityOnHand}</td><td>{p.effectiveLowStockThreshold}{p.lowStockThreshold==null?' (default)':''}</td><td><span className={`pill ${p.isLowStock?'danger':'success-pill'}`}>{p.isLowStock?'Low stock':'In stock'}</span></td><td>{p.sellingPrice==null?'—':`₹${Number(p.sellingPrice).toFixed(2)}`}</td><td><div className="row-actions"><button className="text-btn" onClick={()=>setModal(p)}>Edit</button><button className="text-btn delete-btn" onClick={()=>remove(p)}>Delete</button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon"><Package/></div><strong>{search?'No matching products':'No products yet'}</strong><p>{search?'Try a different name or SKU.':'Add your first product to start tracking inventory.'}</p>{!search&&<button className="primary" onClick={()=>setModal({})}>Add your first product</button>}</div>}
    </section>
    {modal!==null&&<ProductForm initial={modal.id?modal:null} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load();}}/>}
  </>;
}

function Settings() {
  const [settings,setSettings]=useState(null);const [value,setValue]=useState(5);const [message,setMessage]=useState('');const [error,setError]=useState('');
  useEffect(()=>{api('/settings').then(d=>{setSettings(d.settings);setValue(d.settings.defaultThreshold);}).catch(e=>setError(e.message));},[]);
  async function save(e){e.preventDefault();setMessage('');setError('');try{await api('/settings',{method:'PUT',body:JSON.stringify({defaultThreshold:Number(value)})});setMessage('Your settings have been saved.');}catch(e){setError(e.message);}}
  return <><PageHeading eyebrow="PREFERENCES" title="Settings" description="Configure the default behavior for your workspace."/>
    <section className="panel settings-panel"><h2>Inventory settings</h2><p className="muted">Set the default low-stock threshold for products that don't have their own threshold.</p>
      {settings&&<div className="org-summary"><span>Organization</span><strong>{settings.organizationName}</strong></div>}
      <form onSubmit={save}><label className="setting-label">Default low-stock threshold<input type="number" min="0" step="1" required value={value} onChange={e=>setValue(e.target.value)}/><small className="muted">A product is flagged when its quantity is less than or equal to this number.</small></label>
      {message&&<div className="success">{message}</div>}{error&&<div className="alert">{error}</div>}<button className="primary" disabled={!settings}>Save settings</button></form>
    </section>
  </>;
}

export default function App() {
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('stockflow_user'));}catch{return null;}});
  const navigate=useNavigate();
  function logout(){localStorage.removeItem('stockflow_token');localStorage.removeItem('stockflow_user');setUser(null);navigate('/login');}
  return <Routes>
    <Route path="/login" element={user&&localStorage.getItem('stockflow_token')?<Navigate to="/"/>:<AuthPage mode="login" onAuth={setUser}/>}/>
    <Route path="/signup" element={user&&localStorage.getItem('stockflow_token')?<Navigate to="/"/>:<AuthPage mode="signup" onAuth={setUser}/>}/>
    <Route path="/*" element={<Protected><Shell user={user} onLogout={logout}><Routes><Route path="/" element={<Dashboard/>}/><Route path="/products" element={<Products/>}/><Route path="/settings" element={<Settings/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Shell></Protected>}/>
  </Routes>;
}
