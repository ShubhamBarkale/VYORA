import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, ShoppingBag } from 'lucide-react';
import { authFetch } from '../utils/auth';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export default function OrderSuccessPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    authFetch(`${BASE}/api/orders/${orderNumber}/`).then(r=>r.ok?r.json():null).then(setOrder).catch(()=>{});
  }, [orderNumber]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 page-transition" style={{ background:'var(--vyora-bg)' }}>
      <div className="max-w-md w-full text-center animate-fade-up">
        {/* Success icon */}
        <div className="relative mx-auto w-28 h-28 mb-6">
          <div className="w-28 h-28 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle size={56} className="text-emerald-500" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-lg">🎉</div>
        </div>

        <h1 className="text-3xl font-extrabold mb-2" style={{ color:'var(--vyora-text)' }}>Order Placed!</h1>
        <p className="mb-1" style={{ color:'var(--vyora-muted)' }}>Thank you for shopping with VYORA!</p>
        <p className="text-lg font-extrabold text-indigo-600 mb-6">#{orderNumber}</p>

        {order && (
          <div className="vyora-card p-5 mb-6 text-left" style={{ '--shadow-hover':'none' }}>
            <h3 className="font-bold text-sm mb-3" style={{ color:'var(--vyora-text)' }}>Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color:'var(--vyora-muted)' }}>Status</span>
                <span className="font-bold text-emerald-600 capitalize">{order.status}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color:'var(--vyora-muted)' }}>Payment</span>
                <span className="font-semibold" style={{ color:'var(--vyora-text)' }}>{order.payment_method === 'COD' ? 'Cash on Delivery' : 'Razorpay'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color:'var(--vyora-muted)' }}>Items</span>
                <span className="font-semibold" style={{ color:'var(--vyora-text)' }}>{order.items?.length}</span>
              </div>
              <div className="flex justify-between border-t pt-2" style={{ borderColor:'var(--vyora-border)' }}>
                <span className="font-bold" style={{ color:'var(--vyora-text)' }}>Total</span>
                <span className="font-extrabold text-indigo-600">₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor:'var(--vyora-border)', color:'var(--vyora-muted)' }}>
              <p>📦 Shipping to: <strong style={{ color:'var(--vyora-text)' }}>{order.shipping_name}</strong></p>
              <p className="mt-0.5">{order.shipping_address}, {order.shipping_city} — {order.shipping_postal_code}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={`/orders/${orderNumber}`} className="btn-primary px-6 py-3 flex items-center justify-center gap-2">
            <Package size={16}/> View Order
          </Link>
          <Link to="/shop" className="btn-outline px-6 py-3 flex items-center justify-center gap-2">
            <ShoppingBag size={16}/> Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
