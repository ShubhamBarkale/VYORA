import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Zap, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/forgot-password/`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email }) });
      const data = await res.json();
      if (res.ok) setSent(true);
      else toast.error(data.error || 'Something went wrong');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 page-transition" style={{ background:'var(--vyora-bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap size={18} className="text-white" fill="white"/>
            </div>
            <span className="text-xl font-extrabold" style={{ color:'var(--vyora-text)' }}>VY<span className="text-indigo-500">ORA</span></span>
          </Link>
          <h1 className="text-2xl font-extrabold" style={{ color:'var(--vyora-text)' }}>Forgot Password?</h1>
          <p className="text-sm mt-1" style={{ color:'var(--vyora-muted)' }}>We'll send a reset link to your email</p>
        </div>
        <div className="vyora-card p-7" style={{ '--shadow-hover':'none' }}>
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4"/>
              <h3 className="font-bold text-lg mb-2" style={{ color:'var(--vyora-text)' }}>Check your inbox!</h3>
              <p className="text-sm mb-4" style={{ color:'var(--vyora-muted)' }}>If <strong>{email}</strong> is registered, you'll receive a reset link shortly.</p>
              <p className="text-xs" style={{ color:'var(--vyora-muted)' }}>Didn't receive it? Check your spam folder.</p>
              <Link to="/login" className="block mt-5 text-sm text-indigo-600 font-semibold hover:underline">← Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>Email Address</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="your@email.com" required autoFocus className="vyora-input" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending...</> : 'Send Reset Link'}
              </button>
              <Link to="/login" className="flex justify-center text-sm hover:text-indigo-600 transition" style={{ color:'var(--vyora-muted)' }}>← Back to Login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
