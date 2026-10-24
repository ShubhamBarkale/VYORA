import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { authFetch } from '../utils/auth';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
const S = { pending:'bg-amber-50 text-amber-700 border-amber-200', confirmed:'bg-blue-50 text-blue-700 border-blue-200', processing:'bg-indigo-50 text-indigo-700 border-indigo-200', shipped:'bg-purple-50 text-purple-700 border-purple-200', delivered:'bg-emerald-50 text-emerald-700 border-emerald-200', cancelled:'bg-red-50 text-red-700 border-red-200' };

export default function OrdersPage() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    authFetch(`${BASE}/api/orders/?page=${page}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load orders.');
        if (active) {
          setOrders(data.results);
          setTotalPages(data.total_pages);
          setError('');
        }
      })
      .catch(reason => {
        if (active) setError(reason.message || 'Unable to load orders.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--vyora-bg)' }}>
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background:'var(--vyora-bg)', color:'var(--vyora-text)' }}>
      <p role="alert">{error}</p>
    </div>
  );

  if (!orders.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 pb-20" style={{ background:'var(--vyora-bg)' }}>
      <div className="w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-5">
        <ShoppingBag size={40} className="text-indigo-300" />
      </div>
      <h2 className="text-2xl font-extrabold mb-2" style={{ color:'var(--vyora-text)' }}>No orders yet</h2>
      <p className="text-sm mb-8 max-w-xs" style={{ color:'var(--vyora-muted)' }}>Your order history will appear here once you make a purchase.</p>
      <Link to="/shop" className="btn-primary px-8 py-3">Start Shopping</Link>
    </div>
  );

  return (
    <div style={{ background:'var(--vyora-bg)' }} className="pb-24 md:pb-8 page-transition">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="section-title mb-6">My Orders</h1>
        <div className="space-y-4">
          {orders.map(order => (
            <Link key={order.id} to={`/orders/${order.order_number}`}
              className="vyora-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                <Package size={22} className="text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-extrabold" style={{ color:'var(--vyora-text)' }}>#{order.order_number}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border capitalize ${S[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{order.status}</span>
                  {order.payment_status === 'paid' && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">Paid</span>
                  )}
                </div>
                <p className="text-sm" style={{ color:'var(--vyora-muted)' }}>{new Date(order.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>
                <p className="text-xs mt-0.5" style={{ color:'var(--vyora-muted)' }}>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} · {order.payment_method === 'COD' ? 'Cash on Delivery' : 'Online Payment'}</p>
              </div>
              {/* Product thumbnails */}
              <div className="flex -space-x-2">
                {(order.items || []).slice(0,3).map((item,i) => (
                  <div key={i} className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-700 overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.product_image ? (
                      <>
                        <img
                          src={item.product_image.startsWith('http') ? item.product_image : `${BASE}${item.product_image}`}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                        />
                        <div className="w-full h-full items-center justify-center text-sm" style={{ display: 'none' }}>📦</div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm">📦</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-lg" style={{ color:'var(--vyora-text)' }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
        {totalPages > 1 && (
          <nav aria-label="Order pages" className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={page === 1}
              className="btn-secondary px-3 py-2 disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ color:'var(--vyora-muted)' }}>Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              disabled={page === totalPages}
              className="btn-secondary px-3 py-2 disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
