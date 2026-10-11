import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth }    from '../context/AuthContext';
import { useCart }    from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, authLoading } = useAuth();
  const { fetchCart }    = useCart();
  const { fetchWishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ username:'', password:'' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const result = await login(form.username, form.password);
    if (result.success) {
      await Promise.all([fetchCart(), fetchWishlist()]);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } else setError(result.error);
  };

  return (
    <div className="min-h-screen flex page-transition" style={{ background:'var(--vyora-bg)' }}>
      {/* Left visual */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-center px-12">
        <Link to="/" className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <Zap size={20} className="text-white" fill="white"/>
          </div>
          <span className="text-2xl font-extrabold text-white tracking-tight">VYORA</span>
        </Link>
        <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">Shop Smart.<br/>Live Better.</h2>
        <p className="text-indigo-200 text-lg max-w-sm leading-relaxed">Join thousands of happy shoppers who trust VYORA for quality products at the best prices.</p>
        <div className="mt-10 flex flex-col gap-3">
          {['Free shipping on orders above ₹500','7-day hassle-free returns','100% genuine products','Secure payment gateway'].map(t => (
            <div key={t} className="flex items-center gap-2.5 text-indigo-100">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap size={16} className="text-white" fill="white"/>
            </div>
            <span className="text-xl font-extrabold" style={{ color:'var(--vyora-text)' }}>VY<span className="text-indigo-500">ORA</span></span>
          </Link>
          <h1 className="text-2xl font-extrabold mb-1" style={{ color:'var(--vyora-text)' }}>Welcome back</h1>
          <p className="text-sm mb-6" style={{ color:'var(--vyora-muted)' }}>Sign in to your VYORA account</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>Username</label>
              <input value={form.username} onChange={e => setForm({...form,username:e.target.value})}
                placeholder="your_username" required autoFocus className="vyora-input" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wide" style={{ color:'var(--vyora-muted)' }}>Password</label>
                <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline font-semibold">Forgot?</Link>
              </div>
              <div className="relative">
                <input type={showPass?'text':'password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                  placeholder="••••••••" required className="vyora-input pr-11" />
                <button type="button" onClick={()=>setShowPass(v=>!v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition" style={{ color:'var(--vyora-muted)' }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={authLoading} className="btn-primary w-full py-3 text-sm mt-2">
              {authLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color:'var(--vyora-muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-600 font-bold hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
