import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, MapPin, Lock, Package, Heart, ShoppingCart, Edit2, Trash2, Plus, Check } from 'lucide-react';
import { authFetch } from '../utils/auth';
import { useAuth }   from '../context/AuthContext';
import { useCart }   from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import toast         from 'react-hot-toast';
import ProductCard   from '../components/ProductCard';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
const TABS = [
  { id: 'profile',   label: 'Profile',   icon: User    },
  { id: 'addresses', label: 'Addresses', icon: MapPin  },
  { id: 'password',  label: 'Password',  icon: Lock    },
];

export default function ProfilePage() {
  const { user, fetchUser } = useAuth();
  const { itemCount }       = useCart();
  const { wishlistItems }   = useWishlist();
  const { items: recent }   = useRecentlyViewed();
  const [tab,      setTab]      = useState('profile');
  const [loading,  setLoading]  = useState(false);
  const [orders,   setOrders]   = useState([]);
  const [orderCount, setOrderCount] = useState(0);
  const [addresses,setAddresses]= useState([]);
  const [addrForm, setAddrForm] = useState({ name:'',phone:'',address_line:'',city:'',state:'',postal_code:'',is_default:false });
  const [editAddr, setEditAddr] = useState(null);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [profile, setProfile] = useState({ first_name:'',last_name:'',email:'',phone:'' });
  const [pwForm,  setPwForm]  = useState({ old_password:'',new_password:'',new_password2:'' });

  useEffect(() => {
    if (user) setProfile({ first_name:user.first_name||'', last_name:user.last_name||'', email:user.email||'', phone:user.profile?.phone||'' });
  }, [user]);

  useEffect(() => {
    authFetch(`${BASE}/api/orders/?page_size=3`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Unable to load orders')))
      .then(data => {
        setOrders(data.results);
        setOrderCount(data.count);
      })
      .catch(() => {});
    authFetch(`${BASE}/api/addresses/`).then(r=>r.ok?r.json():[]).then(d=>setAddresses(Array.isArray(d)?d:[])).catch(()=>{});
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await authFetch(`${BASE}/api/profile/update/`, { method:'PUT', body:JSON.stringify(profile) });
      if (res.ok) { await fetchUser(); toast.success('Profile updated!'); }
      else { const d = await res.json(); toast.error(Object.values(d)[0] || 'Update failed'); }
    } catch { toast.error('Network error'); } finally { setLoading(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.new_password2) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await authFetch(`${BASE}/api/profile/change-password/`, { method:'POST', body:JSON.stringify(pwForm) });
      if (res.ok) { toast.success('Password changed!'); setPwForm({ old_password:'',new_password:'',new_password2:'' }); }
      else { const d = await res.json(); toast.error(Object.values(d)[0] || 'Failed'); }
    } catch { toast.error('Network error'); } finally { setLoading(false); }
  };

  const saveAddr = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editAddr ? `${BASE}/api/addresses/${editAddr}/` : `${BASE}/api/addresses/`;
      const res = await authFetch(url, { method: editAddr ? 'PUT' : 'POST', body: JSON.stringify(addrForm) });
      if (res.ok) {
        toast.success(editAddr ? 'Address updated!' : 'Address added!');
        const r = await authFetch(`${BASE}/api/addresses/`); setAddresses(await r.json());
        setShowAddrForm(false); setEditAddr(null); setAddrForm({ name:'',phone:'',address_line:'',city:'',state:'',postal_code:'',is_default:false });
      }
    } catch { toast.error('Network error'); } finally { setLoading(false); }
  };

  const deleteAddr = async (id) => {
    await authFetch(`${BASE}/api/addresses/${id}/`, { method:'DELETE' });
    setAddresses(a => a.filter(x => x.id !== id)); toast.success('Deleted');
  };

  const STATUS_COLORS = { pending:'text-amber-600 bg-amber-50', confirmed:'text-blue-600 bg-blue-50', processing:'text-indigo-600 bg-indigo-50', shipped:'text-purple-600 bg-purple-50', delivered:'text-emerald-600 bg-emerald-50', cancelled:'text-red-600 bg-red-50' };

  return (
    <div style={{ background:'var(--vyora-bg)' }} className="pb-24 md:pb-8 page-transition">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header card */}
        <div className="vyora-card p-6 mb-6" style={{ '--shadow-hover':'none' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-3xl text-white font-extrabold uppercase flex-shrink-0">
              {user?.first_name?.[0] || user?.username?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-extrabold" style={{ color:'var(--vyora-text)' }}>
                {user?.first_name ? `${user.first_name} ${user.last_name||''}`.trim() : user?.username}
              </h1>
              <p className="text-sm" style={{ color:'var(--vyora-muted)' }}>{user?.email}</p>
              <p className="text-xs mt-1" style={{ color:'var(--vyora-muted)' }}>VYORA Member</p>
            </div>
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
              {[
                { label:'Orders',  value: orderCount, icon:<Package size={16}/>,  to:'/orders'   },
                { label:'Wishlist',value: wishlistItems.length, icon:<Heart size={16}/>, to:'/wishlist' },
                { label:'Cart',    value: itemCount, icon:<ShoppingCart size={16}/>, to:'/cart'     },
              ].map(s => (
                <Link key={s.label} to={s.to}
                  className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition">
                  <span className="text-indigo-500">{s.icon}</span>
                  <span className="text-lg font-extrabold text-indigo-700">{s.value}</span>
                  <span className="text-[10px] font-semibold" style={{ color:'var(--vyora-muted)' }}>{s.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Sidebar tabs */}
          <div className="sm:w-48 flex-shrink-0">
            <div className="vyora-card overflow-hidden" style={{ '--shadow-hover':'none' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold transition
                    ${tab === t.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  style={{ color: tab === t.id ? undefined : 'var(--vyora-text)' }}>
                  <t.icon size={15} className={tab === t.id ? 'text-indigo-500' : ''} style={{ color: tab !== t.id ? 'var(--vyora-muted)' : undefined }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-5">
            {/* Profile tab */}
            {tab === 'profile' && (
              <div className="vyora-card p-6" style={{ '--shadow-hover':'none' }}>
                <h2 className="font-bold text-lg mb-5" style={{ color:'var(--vyora-text)' }}>Personal Information</h2>
                <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>First Name</label>
                    <input value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} className="vyora-input" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>Last Name</label>
                    <input value={profile.last_name} onChange={e => setProfile({...profile, last_name: e.target.value})} className="vyora-input" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>Email</label>
                    <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="vyora-input" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>Phone</label>
                    <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="vyora-input" />
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit" disabled={loading} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-60">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Addresses tab */}
            {tab === 'addresses' && (
              <div className="vyora-card p-6" style={{ '--shadow-hover':'none' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-lg" style={{ color:'var(--vyora-text)' }}>Saved Addresses</h2>
                  <button onClick={() => { setShowAddrForm(!showAddrForm); setEditAddr(null); setAddrForm({ name:'',phone:'',address_line:'',city:'',state:'',postal_code:'',is_default:false }); }}
                    className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
                    <Plus size={14}/> Add New
                  </button>
                </div>
                {showAddrForm && (
                  <form onSubmit={saveAddr} className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      {[{l:'Full Name',k:'name',span:1},{l:'Phone',k:'phone',span:1},{l:'Address',k:'address_line',span:2},{l:'City',k:'city',span:1},{l:'State',k:'state',span:1},{l:'Postal Code',k:'postal_code',span:1}].map(f => (
                        <div key={f.k} className={f.span===2?'sm:col-span-2':''}>
                          <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>{f.l}</label>
                          <input value={addrForm[f.k]} onChange={e => setAddrForm({...addrForm,[f.k]:e.target.value})} required className="vyora-input" />
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer" style={{ color:'var(--vyora-text)' }}>
                      <input type="checkbox" checked={addrForm.is_default} onChange={e => setAddrForm({...addrForm,is_default:e.target.checked})} className="rounded text-indigo-600" />
                      Set as default address
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" disabled={loading} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
                        {loading ? 'Saving...' : editAddr ? 'Update' : 'Add Address'}
                      </button>
                      <button type="button" onClick={() => { setShowAddrForm(false); setEditAddr(null); }} className="btn-outline text-sm px-4 py-2">Cancel</button>
                    </div>
                  </form>
                )}
                {addresses.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color:'var(--vyora-muted)' }}>No saved addresses.</p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <div key={addr.id} className={`border-2 rounded-2xl p-4 ${addr.is_default ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-slate-600'}`}>
                        {addr.is_default && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full mb-2 inline-block">Default</span>}
                        <p className="font-bold text-sm" style={{ color:'var(--vyora-text)' }}>{addr.name} · {addr.phone}</p>
                        <p className="text-xs mt-0.5" style={{ color:'var(--vyora-muted)' }}>{addr.address_line}, {addr.city}, {addr.state} — {addr.postal_code}</p>
                        <div className="flex gap-3 mt-3">
                          <button onClick={() => { setEditAddr(addr.id); setAddrForm({name:addr.name,phone:addr.phone,address_line:addr.address_line,city:addr.city,state:addr.state,postal_code:addr.postal_code,is_default:addr.is_default}); setShowAddrForm(true); }}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium">
                            <Edit2 size={11}/> Edit
                          </button>
                          <button onClick={() => deleteAddr(addr.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline font-medium">
                            <Trash2 size={11}/> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Password tab */}
            {tab === 'password' && (
              <div className="vyora-card p-6" style={{ '--shadow-hover':'none' }}>
                <h2 className="font-bold text-lg mb-5" style={{ color:'var(--vyora-text)' }}>Change Password</h2>
                <form onSubmit={savePassword} className="max-w-sm space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>Current Password</label>
                    <input type="password" value={pwForm.old_password} onChange={e => setPwForm({...pwForm, old_password: e.target.value})} className="vyora-input" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>New Password</label>
                    <input type="password" value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} className="vyora-input" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>Confirm New Password</label>
                    <input type="password" value={pwForm.new_password2} onChange={e => setPwForm({...pwForm, new_password2: e.target.value})} className="vyora-input" />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-60">
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            {/* Recent orders preview */}
            {tab === 'profile' && orders.length > 0 && (
              <div className="vyora-card p-6" style={{ '--shadow-hover':'none' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold" style={{ color:'var(--vyora-text)' }}>Recent Orders</h2>
                  <Link to="/orders" className="text-xs text-indigo-600 font-semibold hover:underline">View All</Link>
                </div>
                <div className="space-y-2">
                    {orders.slice(0, 3).map(order => (
                      <Link key={order.id} to={`/orders/${order.order_number}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                        <div>
                          <p className="text-sm font-semibold" style={{ color:'var(--vyora-text)' }}>#{order.order_number}</p>
                          <p className="text-xs" style={{ color:'var(--vyora-muted)' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color:'var(--vyora-text)' }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize dark:bg-opacity-20 ${{ pending:'text-amber-600 bg-amber-50',confirmed:'text-blue-600 bg-blue-50',processing:'text-indigo-600 bg-indigo-50',shipped:'text-purple-600 bg-purple-50',delivered:'text-emerald-600 bg-emerald-50',cancelled:'text-red-600 bg-red-50' }[order.status] || 'text-gray-600 bg-gray-100'}`}>
                            {order.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* Recently viewed */}
            {tab === 'profile' && recent.length > 0 && (
              <div className="vyora-card p-6" style={{ '--shadow-hover':'none' }}>
                <h2 className="font-bold mb-4" style={{ color:'var(--vyora-text)' }}>Recently Viewed</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {recent.slice(0, 6).map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
