import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, ShoppingCart, Heart, User, Menu, X,
  ChevronDown, LogOut, Package, MapPin, Moon, Sun,
  Bell, Zap, TrendingUp, Tag, Clock,
} from 'lucide-react';
import { useAuth }    from '../context/AuthContext';
import { useCart }    from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme }   from '../context/ThemeContext';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const NAV_LINKS = [
  { to: '/',     label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/shop?sort=newest',   label: 'New Arrivals' },
  { to: '/shop?sort=featured', label: 'Best Sellers' },
  { to: '/shop?discount=true', label: 'Deals' },
];

export default function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();
  const { itemCount }                = useCart();
  const { wishlistItems }            = useWishlist();
  const { dark, toggle }             = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [mobileOpen, setMobileOpen]   = useState(false);
  const [userMenu,   setUserMenu]     = useState(false);
  const [query,      setQuery]        = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching,  setSearching]    = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const [cartBounce, setCartBounce]   = useState(false);
  const [prevCount,  setPrevCount]    = useState(itemCount);

  const userRef   = useRef(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Animate cart badge on change
  useEffect(() => {
    if (itemCount !== prevCount && itemCount > prevCount) {
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 400);
    }
    setPrevCount(itemCount);
  }, [itemCount]);

  // Close menus on outside click
  useEffect(() => {
    const h = (e) => {
      if (userRef.current   && !userRef.current.contains(e.target))   setUserMenu(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocus(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Close on route change
  useEffect(() => { setMobileOpen(false); setUserMenu(false); }, [location]);

  // Debounced search suggestions
  const fetchSuggestions = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res  = await fetch(`${BASE}/api/products/?search=${encodeURIComponent(q)}&page=1`);
      const data = await res.json();
      setSuggestions((data.results || []).slice(0, 5));
    } catch { setSuggestions([]); }
    finally { setSearching(false); }
  }, []);

  const handleQueryChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    setQuery(''); setSuggestions([]); setSearchFocus(false);
  };

  const handleSuggestionClick = (product) => {
    navigate(`/product/${product.id}`);
    setQuery(''); setSuggestions([]); setSearchFocus(false);
  };

  const handleLogout = () => { logout(); setUserMenu(false); navigate('/'); };

  const showDropdown = searchFocus && (query.length >= 2 || suggestions.length > 0);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b"
      style={{ borderColor: 'var(--vyora-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-3">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2 mr-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--vyora-text)' }}>
              VY<span className="text-indigo-500">ORA</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1 mr-2">
            {NAV_LINKS.map(l => (
              <Link key={l.to} to={l.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname + location.search === l.to
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                style={{ color: location.pathname + location.search === l.to ? undefined : 'var(--vyora-muted)' }}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Search bar */}
          <div ref={searchRef} className="flex-1 relative max-w-lg hidden md:block">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => setSearchFocus(true)}
                  placeholder="Search products, brands, categories..."
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border transition-all outline-none"
                  style={{
                    background: 'var(--vyora-bg)',
                    borderColor: searchFocus ? 'var(--vyora-indigo)' : 'var(--vyora-border)',
                    boxShadow: searchFocus ? '0 0 0 3px rgba(99,102,241,.1)' : 'none',
                    color: 'var(--vyora-text)',
                  }}
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setSuggestions([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </form>

            {/* Search dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl shadow-xl border overflow-hidden animate-scale-in z-50"
                style={{ background: 'var(--vyora-card)', borderColor: 'var(--vyora-border)' }}>
                {searching ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm" style={{ color: 'var(--vyora-muted)' }}>
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </div>
                ) : suggestions.length === 0 && query.length >= 2 ? (
                  <div className="px-4 py-3 text-sm" style={{ color: 'var(--vyora-muted)' }}>
                    No results for "<strong>{query}</strong>"
                  </div>
                ) : (
                  <>
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--vyora-muted)' }}>
                        Products
                      </p>
                    </div>
                    {suggestions.map(p => (
                      <button key={p.id} onClick={() => handleSuggestionClick(p)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-800 transition text-left">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--vyora-text)' }}>{p.name}</p>
                          <p className="text-xs" style={{ color: 'var(--vyora-muted)' }}>
                            ₹{p.discounted_price}
                            {p.discount_percent > 0 && <span className="ml-1 text-emerald-500">{p.discount_percent}% off</span>}
                          </p>
                        </div>
                      </button>
                    ))}
                    <div className="border-t px-3 py-2" style={{ borderColor: 'var(--vyora-border)' }}>
                      <button onClick={handleSearch}
                        className="text-sm text-indigo-500 font-medium hover:text-indigo-700 flex items-center gap-1">
                        <Search size={12} /> View all results for "{query}"
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Theme toggle */}
            <button onClick={toggle}
              className="hidden sm:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              style={{ color: 'var(--vyora-muted)' }} aria-label="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Wishlist */}
            {isLoggedIn && (
              <Link to="/wishlist" className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                style={{ color: 'var(--vyora-muted)' }}>
                <Heart size={20} />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlistItems.length > 9 ? '9+' : wishlistItems.length}
                  </span>
                )}
              </Link>
            )}

            {/* Cart */}
            <Link to="/cart" className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              style={{ color: 'var(--vyora-muted)' }}>
              <ShoppingCart size={20} className={cartBounce ? 'animate-cart-bounce' : ''} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* User */}
            {isLoggedIn ? (
              <div className="relative" ref={userRef}>
                <button onClick={() => setUserMenu(v => !v)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  style={{ color: 'var(--vyora-text)' }}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold uppercase">
                    {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                  </div>
                  <span className="hidden md:block text-sm font-medium max-w-[80px] truncate">
                    {user?.first_name || user?.username}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${userMenu ? 'rotate-180' : ''}`} style={{ color: 'var(--vyora-muted)' }} />
                </button>

                {userMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border overflow-hidden animate-scale-in z-50"
                    style={{ background: 'var(--vyora-card)', borderColor: 'var(--vyora-border)' }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--vyora-border)' }}>
                      <p className="text-sm font-bold" style={{ color: 'var(--vyora-text)' }}>
                        {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--vyora-muted)' }}>{user?.email}</p>
                    </div>
                    {[
                      { to: '/profile', icon: <User size={14}/>,    label: 'My Profile' },
                      { to: '/orders',  icon: <Package size={14}/>,  label: 'My Orders' },
                      { to: '/wishlist',icon: <Heart size={14}/>,    label: 'Wishlist' },
                      { to: '/profile', icon: <MapPin size={14}/>,   label: 'Addresses' },
                    ].map(item => (
                      <Link key={item.label} to={item.to} onClick={() => setUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                        style={{ color: 'var(--vyora-text)' }}>
                        <span className="text-indigo-400">{item.icon}</span> {item.label}
                      </Link>
                    ))}
                    <div className="border-t mt-1" style={{ borderColor: 'var(--vyora-border)' }}>
                      <button onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition">
                        <LogOut size={14}/> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="px-3.5 py-1.5 text-sm font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  style={{ color: 'var(--vyora-text)' }}>Login</Link>
                <Link to="/signup" className="px-3.5 py-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition ml-1"
              style={{ color: 'var(--vyora-muted)' }} onClick={() => setMobileOpen(v => !v)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3 px-0">
          <form onSubmit={handleSearch} className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={query} onChange={handleQueryChange} placeholder="Search..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none"
              style={{ background: 'var(--vyora-bg)', borderColor: 'var(--vyora-border)', color: 'var(--vyora-text)' }}
              onFocus={() => setSearchFocus(true)} />
          </form>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t animate-fade-in" style={{ background: 'var(--vyora-card)', borderColor: 'var(--vyora-border)' }}>
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition hover:bg-indigo-50 dark:hover:bg-slate-800"
                style={{ color: 'var(--vyora-text)' }}>
                {l.label}
              </Link>
            ))}
            <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--vyora-border)' }}>
              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2 mb-1">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold uppercase">
                      {user?.first_name?.[0] || user?.username?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--vyora-text)' }}>
                        {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--vyora-muted)' }}>{user?.email}</p>
                    </div>
                  </div>
                  {[
                    { to: '/profile', label: 'My Profile' },
                    { to: '/orders',  label: 'My Orders'  },
                    { to: '/wishlist',label: 'Wishlist'   },
                  ].map(item => (
                    <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                      className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                      style={{ color: 'var(--vyora-text)' }}>
                      {item.label}
                    </Link>
                  ))}
                  <button onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 transition">
                    <LogOut size={14}/> Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Link to="/login" onClick={() => setMobileOpen(false)}
                    className="py-2.5 text-center text-sm font-semibold border rounded-xl transition hover:bg-gray-50"
                    style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-text)' }}>
                    Login
                  </Link>
                  <Link to="/signup" onClick={() => setMobileOpen(false)}
                    className="py-2.5 text-center text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
                    Sign Up
                  </Link>
                </div>
              )}
              <button onClick={toggle} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                style={{ color: 'var(--vyora-muted)' }}>
                {dark ? <Sun size={15}/> : <Moon size={15}/>} {dark ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
