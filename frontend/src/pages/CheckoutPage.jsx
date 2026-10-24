import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authFetch }  from '../utils/auth';
import { useCart }    from '../context/CartContext';
import { MapPin, CreditCard, ClipboardList, Check, Tag, Truck, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
const STEPS = [
  { id: 0, label: 'Address',  icon: MapPin         },
  { id: 1, label: 'Review',   icon: ClipboardList  },
  { id: 2, label: 'Payment',  icon: CreditCard     },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, total, clearCart } = useCart();

  const [step,        setStep]       = useState(0);
  const [loading,     setLoading]    = useState(false);
  const [addresses,   setAddresses]  = useState([]);
  const [selAddr,     setSelAddr]    = useState(null);
  const [couponCode,  setCouponCode] = useState('');
  const [couponInfo,  setCouponInfo] = useState(null);
  const [couponLoad,  setCouponLoad] = useState(false);
  const [payment,     setPayment]    = useState('COD');
  const [form, setForm] = useState({ shipping_name:'', shipping_phone:'', shipping_address:'', shipping_city:'', shipping_state:'', shipping_postal_code:'' });

  const shipping = total >= 500 ? 0 : 49;
  const discount = couponInfo ? parseFloat(couponInfo.discount_amount) : 0;
  const grandTotal = parseFloat(total) + shipping - discount;

  useEffect(() => {
    authFetch(`${BASE}/api/addresses/`).then(r => r.ok ? r.json() : []).then(data => {
      setAddresses(Array.isArray(data) ? data : []);
      const def = data.find?.(a => a.is_default) || data[0];
      if (def) { setSelAddr(def.id); fillForm(def); }
    }).catch(() => {});
  }, []);

  const fillForm = (a) => setForm({ shipping_name: a.name, shipping_phone: a.phone, shipping_address: a.address_line, shipping_city: a.city, shipping_state: a.state, shipping_postal_code: a.postal_code });

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoad(true);
    try {
      const res  = await authFetch(`${BASE}/api/coupon/validate/`, { method: 'POST', body: JSON.stringify({ code: couponCode, order_total: total }) });
      const data = await res.json();
      if (res.ok && data.valid) { setCouponInfo(data); toast.success(`Coupon applied! Saving ₹${data.discount_amount}`); }
      else { setCouponInfo(null); toast.error(data.error || 'Invalid coupon'); }
    } catch { toast.error('Network error'); }
    finally { setCouponLoad(false); }
  };

  const placeOrder = async () => {
    setLoading(true);
    try {
      const payload = { ...form, payment_method: payment, coupon_code: couponInfo?.code || '' };
      if (payment === 'RAZORPAY') { await handleRazorpay(payload); return; }
      const res  = await authFetch(`${BASE}/api/orders/create/`, { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) { clearCart(); navigate(`/order-success/${data.order_number}`); }
      else toast.error(data.error || 'Order failed');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const handleRazorpay = async (payload) => {
    try {
      const res  = await authFetch(`${BASE}/api/payment/create/`, { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Payment init failed'); setLoading(false); return; }

      if (data.demo_mode) {
        toast.success('Demo payment mode is active. Confirming the test checkout now…');
        const demoPayload = {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: `demo_${Date.now()}`,
          razorpay_signature: `demo_signature_${Date.now()}`,
          demo: true,
        };
        const vRes  = await authFetch(`${BASE}/api/payment/verify/`, { method: 'POST', body: JSON.stringify(demoPayload) });
        const vData = await vRes.json();
        if (vRes.ok) { clearCart(); navigate(`/order-success/${vData.order_number}`); }
        else toast.error(vData.error || 'Demo verification failed');
        setLoading(false);
        return;
      }

      const options = {
        key: data.key_id, amount: data.amount, currency: data.currency,
        name: 'VYORA', description: `Order ${data.order_number}`,
        order_id: data.razorpay_order_id,
        handler: async (response) => {
          const vRes  = await authFetch(`${BASE}/api/payment/verify/`, { method: 'POST', body: JSON.stringify(response) });
          const vData = await vRes.json();
          if (vRes.ok) { clearCart(); navigate(`/order-success/${vData.order_number}`); }
          else toast.error(vData.error || 'Verification failed');
          setLoading(false);
        },
        prefill: { name: form.shipping_name, contact: form.shipping_phone },
        theme: { color: '#6366f1' },
        modal: { ondismiss: () => setLoading(false) },
      };
      if (!window.Razorpay) { toast.error('Razorpay not loaded'); setLoading(false); return; }
      new window.Razorpay(options).open();
    } catch { toast.error('Payment error'); setLoading(false); }
  };

  if (!cartItems.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 pb-20" style={{ background: 'var(--vyora-bg)' }}>
      <p style={{ color: 'var(--vyora-muted)' }}>Your cart is empty.</p>
      <Link to="/shop" className="btn-primary px-6 py-2.5 text-sm">Continue Shopping</Link>
    </div>
  );

  const validateStep0 = () => {
    const vals = Object.values(form);
    if (vals.some(v => !v.trim())) { toast.error('Please fill all address fields'); return false; }
    if (!/^\d{10,}$/.test(form.shipping_phone)) { toast.error('Enter a valid 10-digit phone number'); return false; }
    return true;
  };

  return (
    <>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      <div style={{ background: 'var(--vyora-bg)' }} className="pb-20 md:pb-8 page-transition">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="section-title mb-6">Checkout</h1>

          {/* Step indicator */}
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => i < step && setStep(i)}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-sm font-bold
                    ${i < step ? 'bg-indigo-600 border-indigo-600 text-white' :
                      i === step ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' :
                      'border-gray-200 dark:border-slate-600 text-gray-400'}`}>
                    {i < step ? <Check size={16} /> : <s.icon size={16} />}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${i === step ? 'text-indigo-600' : ''}`}
                    style={{ color: i === step ? undefined : 'var(--vyora-muted)' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 mb-5 rounded-full transition-all duration-300 ${i < step ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">

              {/* Step 0 — Address */}
              {step === 0 && (
                <div className="vyora-card p-6">
                  <h2 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: 'var(--vyora-text)' }}>
                    <MapPin size={18} className="text-indigo-500" /> Shipping Address
                  </h2>
                  {addresses.length > 0 && (
                    <div className="space-y-2 mb-5">
                      {addresses.map(addr => (
                        <label key={addr.id} className={`flex items-start gap-3 p-3.5 border-2 rounded-2xl cursor-pointer transition
                          ${selAddr === addr.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'}`}>
                          <input type="radio" name="addr" checked={selAddr === addr.id}
                            onChange={() => { setSelAddr(addr.id); fillForm(addr); }} className="mt-0.5 text-indigo-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--vyora-text)' }}>{addr.name} · {addr.phone}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--vyora-muted)' }}>{addr.address_line}, {addr.city}, {addr.state} — {addr.postal_code}</p>
                          </div>
                          {addr.is_default && <span className="ml-auto text-xs font-semibold text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">Default</span>}
                        </label>
                      ))}
                      <label className={`flex items-center gap-3 p-3.5 border-2 rounded-2xl cursor-pointer transition
                        ${selAddr === null ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'}`}>
                        <input type="radio" name="addr" checked={selAddr === null}
                          onChange={() => { setSelAddr(null); setForm({ shipping_name:'',shipping_phone:'',shipping_address:'',shipping_city:'',shipping_state:'',shipping_postal_code:'' }); }}
                          className="text-indigo-600" />
                        <span className="text-sm font-semibold" style={{ color: 'var(--vyora-text)' }}>+ Enter a new address</span>
                      </label>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'shipping_name',          label: 'Full Name',   span: 1 },
                      { key: 'shipping_phone',         label: 'Phone',       span: 1 },
                      { key: 'shipping_address',       label: 'Address',     span: 2 },
                      { key: 'shipping_city',          label: 'City',        span: 1 },
                      { key: 'shipping_state',         label: 'State',       span: 1 },
                      { key: 'shipping_postal_code',   label: 'Postal Code', span: 1 },
                    ].map(f => (
                      <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                        <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--vyora-muted)' }}>{f.label}</label>
                        <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                          placeholder={f.label} className="vyora-input" />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => validateStep0() && setStep(1)} className="btn-primary w-full mt-5 py-3">
                    Continue to Review →
                  </button>
                </div>
              )}

              {/* Step 1 — Review */}
              {step === 1 && (
                <div className="vyora-card p-6">
                  <h2 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: 'var(--vyora-text)' }}>
                    <ClipboardList size={18} className="text-indigo-500" /> Order Review
                  </h2>
                  <div className="space-y-3 divide-y" style={{ '--tw-divide-opacity': 1 }}>
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 pt-3 first:pt-0">
                        <div className="w-14 h-14 rounded-xl bg-gray-50 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                          {item.product_image ? (
                            <>
                              <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover"
                                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                              <div className="w-full h-full items-center justify-center text-xl" style={{ display: 'none' }}>🛍️</div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--vyora-text)' }}>{item.product_name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--vyora-muted)' }}>Qty: {item.quantity} × ₹{Number(item.product_discounted_price).toLocaleString('en-IN')}</p>
                        </div>
                        <p className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--vyora-text)' }}>₹{Number(item.subtotal).toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                  {/* Coupon */}
                  <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--vyora-border)' }}>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--vyora-text)' }}>
                      <Tag size={13} className="text-indigo-500" /> Have a coupon?
                    </p>
                    <div className="flex gap-2">
                      <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="WELCOME10" className="vyora-input flex-1 uppercase tracking-widest font-semibold" />
                      <button onClick={applyCoupon} disabled={couponLoad}
                        className="btn-outline text-sm px-4 py-2 flex-shrink-0 disabled:opacity-60">
                        {couponLoad ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponInfo && (
                      <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                        ✓ Coupon <strong>{couponInfo.code}</strong> applied — saving ₹{couponInfo.discount_amount}
                      </p>
                    )}
                    <p className="text-xs mt-2" style={{ color: 'var(--vyora-muted)' }}>Try: WELCOME10, SAVE20, FLAT100</p>
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setStep(0)} className="btn-outline flex-1 py-2.5 text-sm">← Back</button>
                    <button onClick={() => setStep(2)} className="btn-primary flex-1 py-2.5 text-sm">Continue to Payment →</button>
                  </div>
                </div>
              )}

              {/* Step 2 — Payment */}
              {step === 2 && (
                <div className="vyora-card p-6">
                  <h2 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: 'var(--vyora-text)' }}>
                    <CreditCard size={18} className="text-indigo-500" /> Payment Method
                  </h2>
                  <div className="space-y-3">
                    {[
                      { val: 'COD',      label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives' },
                      { val: 'RAZORPAY', label: 'Pay Online',        icon: '💳', desc: 'UPI, Cards, Net Banking via Razorpay' },
                    ].map(pm => (
                      <label key={pm.val}
                        className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition
                          ${payment === pm.val ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'}`}>
                        <input type="radio" name="pay" value={pm.val} checked={payment === pm.val}
                          onChange={() => setPayment(pm.val)} className="text-indigo-600" />
                        <span className="text-2xl">{pm.icon}</span>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--vyora-text)' }}>{pm.label}</p>
                          <p className="text-xs" style={{ color: 'var(--vyora-muted)' }}>{pm.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setStep(1)} className="btn-outline flex-1 py-3 text-sm">← Back</button>
                    <button onClick={placeOrder} disabled={loading}
                      className="btn-primary flex-1 py-3 disabled:opacity-60 flex items-center justify-center gap-2">
                      {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                        : `Place Order — ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-4 text-xs" style={{ color: 'var(--vyora-muted)' }}>
                    <Shield size={12} className="text-indigo-500" /> 256-bit encrypted secure checkout
                  </div>
                </div>
              )}
            </div>

            {/* Summary sidebar */}
            <div className="vyora-card p-5 h-fit sticky top-24" style={{ '--shadow-hover': 'none' }}>
              <h3 className="font-bold mb-4" style={{ color: 'var(--vyora-text)' }}>Price Details</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between" style={{ color: 'var(--vyora-muted)' }}>
                  <span>Subtotal</span><span className="font-medium" style={{ color: 'var(--vyora-text)' }}>₹{Number(total).toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Coupon Discount</span><span className="font-medium">-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between" style={{ color: 'var(--vyora-muted)' }}>
                  <span>Shipping</span>
                  <span className={`font-medium ${shipping === 0 ? 'text-emerald-600' : ''}`}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                <div className="border-t pt-2.5 flex justify-between font-extrabold text-base" style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-text)' }}>
                  <span>Total</span><span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              {discount > 0 && (
                <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2 mt-3">
                  🎉 You're saving ₹{discount.toFixed(2)} on this order!
                </p>
              )}
              <div className="mt-4 pt-4 border-t text-xs space-y-1.5" style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-muted)' }}>
                {shipping === 0 && <p className="text-emerald-600 font-medium flex items-center gap-1"><Truck size={11}/>Free shipping applied!</p>}
                <p>↩️ 7-day return policy</p>
                <p>✅ Genuine products guarantee</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
