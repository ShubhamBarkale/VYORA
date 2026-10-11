import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, Package, Check } from 'lucide-react';
import { authFetch } from '../utils/auth';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
const STEPS = ['Ordered','Confirmed','Processing','Shipped','Delivered'];
const STEP_MAP = { pending:0, confirmed:1, processing:2, shipped:3, delivered:4 };
const S_COLORS = { pending:'bg-amber-50 text-amber-700', confirmed:'bg-blue-50 text-blue-700', processing:'bg-indigo-50 text-indigo-700', shipped:'bg-purple-50 text-purple-700', delivered:'bg-emerald-50 text-emerald-700', cancelled:'bg-red-50 text-red-700' };

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${BASE}/api/orders/${orderNumber}/`).then(r=>r.ok?r.json():null).then(setOrder).catch(()=>{}).finally(()=>setLoading(false));
  }, [orderNumber]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--vyora-bg)' }}>
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
  if (!order) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--vyora-bg)' }}>
      <p style={{ color:'var(--vyora-muted)' }}>Order not found.</p>
    </div>
  );

  const stepIdx = STEP_MAP[order.status] ?? -1;

  return (
    <div style={{ background:'var(--vyora-bg)' }} className="pb-24 md:pb-8 page-transition">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm hover:text-indigo-600 transition mb-5"
          style={{ color:'var(--vyora-muted)' }}>
          <ArrowLeft size={14}/> Back to Orders
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="section-title">Order #{order.order_number}</h1>
            <p className="text-sm mt-0.5" style={{ color:'var(--vyora-muted)' }}>
              Placed on {new Date(order.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
            </p>
          </div>
          <span className={`text-sm font-bold px-4 py-1.5 rounded-xl capitalize ${S_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>{order.status}</span>
        </div>

        {/* Order Progress */}
        {order.status !== 'cancelled' && (
          <div className="vyora-card p-6 mb-5" style={{ '--shadow-hover':'none' }}>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-6" style={{ color:'var(--vyora-muted)' }}>Order Progress</h2>
            <div className="flex items-start">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-start flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-500
                      ${i < stepIdx ? 'bg-indigo-600 border-indigo-600 text-white' :
                        i === stepIdx ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' :
                        'border-gray-200 dark:border-slate-600 text-gray-400'}`}>
                      {i < stepIdx ? <Check size={16}/> : i + 1}
                    </div>
                    <span className={`text-[10px] font-semibold text-center leading-tight max-w-[52px]
                      ${i === stepIdx ? 'text-indigo-600' : ''}`}
                      style={{ color: i === stepIdx ? undefined : 'var(--vyora-muted)' }}>
                      {s}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mt-5 mx-1 rounded-full transition-all duration-500 ${i < stepIdx ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Items */}
          <div className="lg:col-span-2 vyora-card p-5" style={{ '--shadow-hover':'none' }}>
            <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color:'var(--vyora-text)' }}>
              <Package size={16} className="text-indigo-500"/> Items Ordered
            </h2>
            <div className="space-y-3 divide-y" style={{ '--tw-divide-color':'var(--vyora-border)' }}>
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center gap-3 pt-3 first:pt-0">
                  <div className="w-14 h-14 rounded-xl bg-gray-50 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                    {item.product_image ? (
                      <>
                        <img
                          src={item.product_image.startsWith('http') ? item.product_image : `${BASE}${item.product_image}`}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                        />
                        <div className="w-full h-full items-center justify-center text-xl" style={{ display: 'none' }}>🛍️</div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color:'var(--vyora-text)' }}>{item.product_name}</p>
                    <p className="text-xs mt-0.5" style={{ color:'var(--vyora-muted)' }}>Qty: {item.quantity} × ₹{Number(item.price).toLocaleString('en-IN')}</p>
                  </div>
                  <p className="font-bold text-sm flex-shrink-0" style={{ color:'var(--vyora-text)' }}>₹{Number(item.subtotal).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {/* Payment */}
            <div className="vyora-card p-5" style={{ '--shadow-hover':'none' }}>
              <h2 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color:'var(--vyora-text)' }}>
                <CreditCard size={14} className="text-indigo-500"/> Payment
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between" style={{ color:'var(--vyora-muted)' }}><span>Subtotal</span><span>₹{Number(order.subtotal).toLocaleString('en-IN')}</span></div>
                {Number(order.discount_amount) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₹{Number(order.discount_amount).toLocaleString('en-IN')}</span></div>}
                <div className="flex justify-between" style={{ color:'var(--vyora-muted)' }}><span>Shipping</span><span>{Number(order.shipping_charge)===0?'FREE':`₹${order.shipping_charge}`}</span></div>
                <div className="border-t pt-2 flex justify-between font-extrabold" style={{ borderColor:'var(--vyora-border)', color:'var(--vyora-text)' }}>
                  <span>Total</span><span>₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="text-xs pt-1" style={{ color:'var(--vyora-muted)' }}>
                  <p><span className="font-semibold">Method:</span> {order.payment_method === 'COD' ? 'Cash on Delivery' : 'Razorpay'}</p>
                  <p><span className="font-semibold">Status:</span> <span className={order.payment_status==='paid'?'text-emerald-600 font-bold':'text-amber-600'}>{order.payment_status}</span></p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="vyora-card p-5" style={{ '--shadow-hover':'none' }}>
              <h2 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color:'var(--vyora-text)' }}>
                <MapPin size={14} className="text-indigo-500"/> Shipping Address
              </h2>
              <div className="text-sm space-y-0.5" style={{ color:'var(--vyora-muted)' }}>
                <p className="font-bold" style={{ color:'var(--vyora-text)' }}>{order.shipping_name}</p>
                <p>{order.shipping_phone}</p>
                <p>{order.shipping_address}</p>
                <p>{order.shipping_city}, {order.shipping_state}</p>
                <p>{order.shipping_postal_code}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
