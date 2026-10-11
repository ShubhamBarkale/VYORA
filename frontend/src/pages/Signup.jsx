import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name:'',last_name:'',username:'',email:'',phone:'',password:'',password2:'' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors,  setErrors]    = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault(); setErrors({});
    if (form.password !== form.password2) { setErrors({ password2:'Passwords do not match' }); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/register/`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { toast.success('Account created! Please log in.'); navigate('/login'); }
      else setErrors(data);
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const F = ({ name, label, type='text', required=false, half=false }) => (
    <div className={half ? '' : 'col-span-2'}>
      <label className="text-xs font-bold uppercase tracking-wide mb-1 block" style={{ color:'var(--vyora-muted)' }}>{label}{required && ' *'}</label>
      <div className="relative">
        <input type={name.includes('password') ? (showPass?'text':'password') : type}
          value={form[name]} onChange={e=>setForm({...form,[name]:e.target.value})}
          placeholder={label} required={required}
          className={`vyora-input ${errors[name] ? 'border-red-400' : ''}`} />
        {name === 'password' && (
          <button type="button" onClick={()=>setShowPass(v=>!v)}
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--vyora-muted)' }}>
            {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        )}
      </div>
      {errors[name] && <p className="text-xs text-red-500 mt-1">{Array.isArray(errors[name]) ? errors[name][0] : errors[name]}</p>}
    </div>
  );

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
          <h1 className="text-2xl font-extrabold" style={{ color:'var(--vyora-text)' }}>Create your account</h1>
          <p className="text-sm mt-1" style={{ color:'var(--vyora-muted)' }}>Start shopping smarter today</p>
        </div>

        <div className="vyora-card p-7" style={{ '--shadow-hover':'none' }}>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <F name="first_name" label="First Name" half />
            <F name="last_name"  label="Last Name"  half />
            <F name="username"   label="Username"   required />
            <F name="email"      label="Email"      required type="email" />
            <F name="phone"      label="Phone" />
            <F name="password"   label="Password"   required />
            <F name="password2"  label="Confirm Password" required />
            <div className="col-span-2 mt-1">
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Creating...</> : 'Create Free Account'}
              </button>
            </div>
          </form>
          <p className="text-center text-sm mt-5" style={{ color:'var(--vyora-muted)' }}>
            Already have an account? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
