import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Heart, Tag, Truck } from 'lucide-react';
import { useCart }    from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { authFetch }  from '../utils/auth';
import toast          from 'react-hot-toast';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export default function CartPage() {
  const { cartItems, total, removeFromCart, updateQuantity } = useCart();
  const { toggleWishlist } = useWishlist();

  if (!cartItems.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 pb-20"
      style={{ background: 'var(--vyora-bg)' }}>
      <div className="w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-5">
        <ShoppingBag size={40} className="text-indigo-300" />
      </div>
      <h2 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--vyora-text)' }}>Your cart is empty</h2>
      <p className="mb-8 max-w-xs text-sm" style={{ color: 'var(--vyora-muted)' }}>
        Looks like you haven't added anything yet. Explore our products!
      </p>
      <Link to="/shop" className="btn-primary px-8 py-3">Continue Shopping</Link>
    </div>
  );

  const shipping    = total >= 500 ? 0 : 49;
  const grandTotal  = parseFloat(total) + shipping;
  const toFreeShip  = Math.max(0, 500 - parseFloat(total));

  const handleMoveToWishlist = async (item) => {
    await removeFromCart(item.id);
    await toggleWishlist(item.product);
    toast.success('Moved to wishlist');
  };

  return (
    <div style={{ background: 'var(--vyora-bg)' }} className="pb-24 md:pb-8 page-transition">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="section-title mb-6">
          Shopping Cart <span className="text-base font-normal ml-2" style={{ color: 'var(--vyora-muted)' }}>({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</span>
        </h1>

        {/* Free shipping progress */}
        {toFreeShip > 0 && (
          <div className="vyora-card p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={14} className="text-indigo-500" />
              <p className="text-sm font-medium" style={{ color: 'var(--vyora-text)' }}>
                Add <strong>₹{toFreeShip.toFixed(0)}</strong> more for <strong className="text-emerald-600">FREE shipping</strong>!
              </p>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (parseFloat(total) / 500) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map(item => (
              <div key={item.id} className="vyora-card p-4 flex items-center gap-4" style={{ '--shadow-hover': 'none' }}>
                <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-800">
                  {item.product_image ? (
                    <>
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                      <div className="w-full h-full items-center justify-center text-2xl" style={{ display: 'none' }}>🛍️</div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product}`}
                    className="font-semibold text-sm line-clamp-2 hover:text-indigo-600 transition"
                    style={{ color: 'var(--vyora-text)' }}>
                    {item.product_name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-sm" style={{ color: 'var(--vyora-text)' }}>
                      ₹{Number(item.product_discounted_price).toLocaleString('en-IN')}
                    </span>
                    {item.product_discount_percent > 0 && (
                      <span className="text-xs line-through" style={{ color: 'var(--vyora-muted)' }}>
                        ₹{Number(item.product_price).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  {item.product_stock <= 5 && item.product_stock > 0 && (
                    <p className="text-xs text-amber-600 mt-0.5">Only {item.product_stock} left in stock</p>
                  )}
                </div>
                {/* Qty */}
                <div className="flex items-center border rounded-xl" style={{ borderColor: 'var(--vyora-border)' }}>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-l-xl transition" style={{ color: 'var(--vyora-muted)' }}>
                    <Minus size={12} />
                  </button>
                  <span className="px-3 py-1.5 text-sm font-bold border-x" style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-text)' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product_stock}
                    className="px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-r-xl transition disabled:opacity-30" style={{ color: 'var(--vyora-muted)' }}>
                    <Plus size={12} />
                  </button>
                </div>
                <div className="text-sm font-bold hidden sm:block" style={{ color: 'var(--vyora-text)' }}>
                  ₹{Number(item.subtotal).toLocaleString('en-IN')}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => handleMoveToWishlist(item)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition" title="Move to Wishlist">
                    <Heart size={15} />
                  </button>
                  <button onClick={() => removeFromCart(item.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Remove">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div>
            <div className="vyora-card p-5 sticky top-24" style={{ '--shadow-hover': 'none' }}>
              <h2 className="font-bold text-lg mb-5" style={{ color: 'var(--vyora-text)' }}>Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between" style={{ color: 'var(--vyora-muted)' }}>
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span className="font-semibold" style={{ color: 'var(--vyora-text)' }}>₹{Number(total).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--vyora-muted)' }}>
                  <span>Shipping</span>
                  <span className={`font-semibold ${shipping === 0 ? 'text-emerald-600' : ''}`}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                    🚚 Add ₹{toFreeShip.toFixed(0)} more for free shipping
                  </p>
                )}
                <div className="border-t pt-3 flex justify-between font-extrabold text-base" style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-text)' }}>
                  <span>Total</span>
                  <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <Link to="/checkout" className="btn-primary w-full mt-5 py-3 flex items-center justify-center gap-2">
                Proceed to Checkout <ArrowRight size={15} />
              </Link>
              <Link to="/shop" className="flex items-center justify-center text-sm mt-3 hover:text-indigo-600 transition"
                style={{ color: 'var(--vyora-muted)' }}>
                ← Continue Shopping
              </Link>
              {/* Trust */}
              <div className="mt-4 pt-4 border-t text-center text-xs space-y-1" style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-muted)' }}>
                <p>🔒 Secure Checkout</p>
                <p>✅ Razorpay / Cash on Delivery</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
