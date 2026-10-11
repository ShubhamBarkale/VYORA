import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Eye, Minus, Plus, X, ArrowRight } from 'lucide-react';
import { useCart }     from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth }     from '../context/AuthContext';
import toast           from 'react-hot-toast';

/* ── QuickView Modal ─────────────────────────────────────────── */
function QuickViewModal({ product, onClose }) {
  const { addToCart }   = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isLoggedIn }  = useAuth();
  const navigate        = useNavigate();
  const [qty, setQty]   = useState(1);
  const inWish          = isInWishlist(product.id);

  const handleAdd = () => {
    if (!isLoggedIn) { onClose(); navigate('/login'); return; }
    addToCart(product.id, qty);
    onClose();
  };

  // Close on Escape
  const handleKey = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} onKeyDown={handleKey} tabIndex={-1}>
      <div
        className="rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in"
        style={{ background: 'var(--vyora-card)' }}
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={product.name}>
        {/* Close */}
        <div className="flex items-center justify-between p-5 pb-0">
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Quick View</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            style={{ color: 'var(--vyora-muted)' }} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5">
          {/* Image */}
          <div className="img-zoom-wrap rounded-2xl overflow-hidden bg-gray-50 dark:bg-slate-800 aspect-square">
            {product.image_url
              ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
              : null}
            <div className="w-full h-full items-center justify-center text-6xl"
              style={{ display: product.image_url ? 'none' : 'flex' }}>🛍️</div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{product.category?.name}</p>
            <h3 className="text-xl font-bold leading-snug" style={{ color: 'var(--vyora-text)' }}>{product.name}</h3>

            {/* Rating */}
            {product.review_count > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={13} className={s <= Math.round(product.average_rating) ? 'star-filled' : 'star-empty'} />
                  ))}
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--vyora-text)' }}>{Number(product.average_rating).toFixed(1)}</span>
                <span className="text-xs" style={{ color: 'var(--vyora-muted)' }}>({product.review_count})</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-end gap-2">
              <span className="text-2xl font-extrabold" style={{ color: 'var(--vyora-text)' }}>₹{product.discounted_price}</span>
              {product.discount_percent > 0 && (
                <>
                  <span className="text-sm line-through mb-0.5" style={{ color: 'var(--vyora-muted)' }}>₹{product.price}</span>
                  <span className="text-sm font-bold text-emerald-600 mb-0.5">{product.discount_percent}% off</span>
                </>
              )}
            </div>

            {/* Stock */}
            <span className={`text-xs font-semibold w-fit px-2.5 py-1 rounded-full
              ${product.stock > 5 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20' :
                product.stock > 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20' :
                'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
              {product.stock > 5 ? `✓ In Stock` : product.stock > 0 ? `Only ${product.stock} left!` : '✕ Out of Stock'}
            </span>

            <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--vyora-muted)' }}>
              {product.description}
            </p>

            {/* Quantity */}
            {product.in_stock && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: 'var(--vyora-text)' }}>Qty:</span>
                <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: 'var(--vyora-border)' }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition" style={{ color: 'var(--vyora-muted)' }}>
                    <Minus size={13} />
                  </button>
                  <span className="px-4 py-2 text-sm font-bold border-x" style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-text)' }}>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                    className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition" style={{ color: 'var(--vyora-muted)' }}>
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-2">
              <button onClick={handleAdd} disabled={!product.in_stock}
                className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
                <ShoppingCart size={15} /> {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button onClick={() => toggleWishlist(product.id)}
                className={`p-2.5 rounded-xl border-2 transition-all duration-200 ${inWish ? 'border-rose-500 bg-rose-50 text-rose-500 dark:bg-rose-900/20 scale-110' : 'border-gray-200 dark:border-slate-600 text-gray-400 hover:border-rose-300 hover:text-rose-400'}`}>
                <Heart size={16} fill={inWish ? 'currentColor' : 'none'} />
              </button>
            </div>
            <Link to={`/product/${product.id}`} onClick={onClose}
              className="flex items-center justify-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition mt-1">
              View Full Details <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ProductCard ─────────────────────────────────────────────── */
export default function ProductCard({ product }) {
  const { addToCart }                    = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isLoggedIn }                   = useAuth();
  const navigate                         = useNavigate();
  const [quickView,      setQuickView]      = useState(false);
  const [adding,         setAdding]         = useState(false);
  const [added,          setAdded]          = useState(false);
  const [wishAnimating,  setWishAnimating]  = useState(false);
  const inWish = isInWishlist(product.id);

  const handleAdd = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isLoggedIn) { navigate('/login'); return; }
    if (!product.in_stock || adding) return;
    setAdding(true);
    await addToCart(product.id);
    setAdding(false); setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleWish = (e) => {
    e.preventDefault(); e.stopPropagation();
    setWishAnimating(true);
    setTimeout(() => setWishAnimating(false), 400);
    toggleWishlist(product.id);
  };

  const handleQuickView = (e) => {
    e.preventDefault(); e.stopPropagation();
    setQuickView(true);
  };

  // Badge
  const badge = product.discount_percent >= 20 ? { label: `${product.discount_percent}% OFF`, cls: 'badge-sale' }
    : product.is_featured ? { label: 'FEATURED', cls: 'badge-featured' }
    : product.stock <= 5 && product.stock > 0 ? { label: 'FEW LEFT', cls: 'badge-hot' }
    : null;

  return (
    <>
      <div className="vyora-card product-card group relative overflow-hidden cursor-pointer flex flex-col h-full"
        style={{ borderRadius: '16px' }}>

        {/* Badges */}
        {badge && (
          <div className="absolute top-3 left-3 z-10">
            <span className={`badge ${badge.cls}`}>{badge.label}</span>
          </div>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 z-20 flex items-center justify-center rounded-2xl">
            <span className="text-xs font-bold text-gray-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow border" style={{ borderColor: 'var(--vyora-border)' }}>
              Out of Stock
            </span>
          </div>
        )}

        {/* Wishlist */}
        <button onClick={handleWish} aria-label={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
            ${inWish
              ? 'bg-rose-500 text-white opacity-100 shadow-md shadow-rose-200'
              : 'bg-white/90 dark:bg-slate-800/90 text-gray-400 opacity-0 group-hover:opacity-100 shadow-sm hover:text-rose-500 hover:bg-rose-50'}`}>
          <Heart
            size={14}
            fill={inWish ? 'white' : 'none'}
            className={wishAnimating ? 'wish-animate' : ''}
          />
        </button>

        {/* Quick View */}
        <button onClick={handleQuickView} aria-label="Quick view"
          className="absolute top-3 right-12 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 text-gray-500 flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm hover:text-indigo-600 transition-all duration-200">
          <Eye size={14} />
        </button>

        {/* Image */}
        <Link to={`/product/${product.id}`} tabIndex={-1}>
          <div className="img-zoom-wrap bg-gray-50 dark:bg-slate-800 h-48 overflow-hidden" style={{ borderRadius: '16px 16px 0 0' }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} loading="lazy"
                className="w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div className="w-full h-full items-center justify-center text-5xl"
              style={{ display: product.image_url ? 'none' : 'flex' }}>
              🛍️
            </div>
          </div>
        </Link>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1 gap-2">
          <Link to={`/product/${product.id}`}>
            <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">{product.category?.name}</p>
            <h3 className="text-sm font-semibold leading-snug line-clamp-2 mt-0.5 hover:text-indigo-600 transition"
              style={{ color: 'var(--vyora-text)' }}>
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          {product.review_count > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={11} className={s <= Math.round(product.average_rating) ? 'star-filled' : 'star-empty'} />
                ))}
              </div>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--vyora-text)' }}>
                {Number(product.average_rating).toFixed(1)}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--vyora-muted)' }}>({product.review_count})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={11} className="star-empty" />
              ))}
              <span className="text-[11px]" style={{ color: 'var(--vyora-muted)' }}>No reviews</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-base font-extrabold" style={{ color: 'var(--vyora-text)' }}>
              ₹{Number(product.discounted_price).toLocaleString('en-IN')}
            </span>
            {product.discount_percent > 0 && (
              <span className="text-xs line-through" style={{ color: 'var(--vyora-muted)' }}>
                ₹{Number(product.price).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Stock */}
          <p className={`text-[11px] font-semibold
            ${product.stock > 10 ? 'text-emerald-600' : product.stock > 0 ? 'text-amber-600' : 'text-red-500'}`}>
            {product.stock > 10 ? '✓ In Stock' : product.stock > 0 ? `Only ${product.stock} left` : '✕ Out of Stock'}
          </p>

          {/* Add to Cart */}
          <button onClick={handleAdd} disabled={!product.in_stock || adding}
            aria-label="Add to cart"
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mt-1
              ${added
                ? 'bg-emerald-500 text-white btn-added'
                : 'btn-primary'}
              disabled:opacity-50 disabled:cursor-not-allowed`}>
            {adding ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding...</>
            ) : added ? (
              <><span className="text-base leading-none">✓</span> Added to Cart</>
            ) : (
              <><ShoppingCart size={14} /> Add to Cart</>
            )}
          </button>
        </div>
      </div>

      {quickView && <QuickViewModal product={product} onClose={() => setQuickView(false)} />}
    </>
  );
}
