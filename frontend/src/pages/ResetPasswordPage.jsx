import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export default function ResetPasswordPage() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ new_password:'', new_password2:'' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.new_password2) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/reset-password/`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ uid, token, ...form }) });
      const data = await res.json();
      if (res.ok) { toast.success('Password reset! Please log in.'); navigate('/login'); }
      else toast.error(data.error || 'Reset failed');
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
          <h1 className="text-2xl font-extrabold" style={{ color:'var(--vyora-text)' }}>Reset Password</h1>
          <p className="text-sm mt-1" style={{ color:'var(--vyora-muted)' }}>Enter your new password below</p>
        </div>
        <div className="vyora-card p-7" style={{ '--shadow-hover':'none' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {['new_password','new_password2'].map((f,i) => (
              <div key={f}>
                <label className="text-xs font-bold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>
                  {i===0?'New Password':'Confirm Password'}
                </label>
                <div className="relative">
                  <input type={showPass?'text':'password'} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}
                    placeholder={i===0?'Min. 6 characters':'Re-enter password'} required minLength={6} className="vyora-input pr-11" />
                  {i===0 && (
                    <button type="button" onClick={()=>setShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--vyora-muted)' }}>
                      {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Resetting...</> : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
