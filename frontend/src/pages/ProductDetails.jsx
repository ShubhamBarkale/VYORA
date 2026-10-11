import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ShoppingCart, Heart, Star, Package, Truck,
  RotateCcw, Shield, Minus, Plus, MapPin, CheckCircle
} from 'lucide-react';
import { useCart }     from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth }     from '../context/AuthContext';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import ProductCard     from '../components/ProductCard';
import toast           from 'react-hot-toast';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110">
          <Star size={26} className={s <= (hover || value) ? 'star-filled' : 'star-empty'} />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart }                    = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isLoggedIn }                   = useAuth();
  const { add: addToRecent }             = useRecentlyViewed();

  const [product,    setProduct]    = useState(null);
  const [related,    setRelated]    = useState([]);
  const [reviews,    setReviews]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [qty,        setQty]        = useState(1);
  const [tab,        setTab]        = useState('description');
  const [pincode,    setPincode]    = useState('');
  const [pinResult,  setPinResult]  = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [adding,     setAdding]     = useState(false);
  const [wishAnim,   setWishAnim]   = useState(false);

  useEffect(() => {
    setLoading(true);
    setProduct(null);
    setTab('description');
    Promise.all([
      fetch(`${BASE}/api/products/${id}/`).then(r => r.json()),
      fetch(`${BASE}/api/products/${id}/related/`).then(r => r.json()),
      fetch(`${BASE}/api/products/${id}/reviews/`).then(r => r.json()),
    ]).then(([prod, rel, rev]) => {
      if (!prod.error) { setProduct(prod); addToRecent(prod); }
      setRelated(Array.isArray(rel) ? rel : []);
      setReviews(Array.isArray(rev) ? rev : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    if (!product.in_stock || adding) return;
    setAdding(true);
    await addToCart(product.id, qty);
    setAdding(false);
  };

  const handleBuyNow = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    await addToCart(product.id, qty);
    navigate('/cart');
  };

  const checkDelivery = () => {
    if (pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      toast.error('Enter a valid 6-digit PIN code');
      return;
    }
    const days = pincode[0] <= '5' ? '2-3' : '4-5';
    setPinResult({ days });
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) { navigate('/login'); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BASE}/api/products/${id}/review/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(reviewForm),
      });
      const data = await res.json();
      if (res.ok) {
        setReviews(prev => [data, ...prev]);
        setReviewForm({ rating: 5, title: '', comment: '' });
        toast.success('Review submitted!');
      } else {
        toast.error(data.error || 'Could not submit');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--vyora-bg)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm" style={{ color: 'var(--vyora-muted)' }}>Loading product...</p>
      </div>
    </div>
  );

  if (!product || product.error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--vyora-bg)' }}>
      <div className="text-6xl">😕</div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--vyora-text)' }}>Product not found</h2>
      <Link to="/shop" className="btn-primary text-sm px-6 py-2.5">Back to Shop</Link>
    </div>
  );

  const inWish = isInWishlist(product.id);
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    r,
    count: reviews.filter(rv => rv.rating === r).length,
  }));

  /* stock badge classes — defined as plain variable to avoid template-literal parser issues */
  const stockCls = product.stock > 5
    ? 'bg-emerald-50 text-emerald-700'
    : product.stock > 0
    ? 'bg-amber-50 text-amber-700'
    : 'bg-red-50 text-red-600';

  return (
    <div style={{ background: 'var(--vyora-bg)' }} className="pb-20 md:pb-8 page-transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-indigo-600 transition" style={{ color: 'var(--vyora-muted)' }}>Home</Link>
          <span style={{ color: 'var(--vyora-muted)' }}>/</span>
          <Link to="/shop" className="hover:text-indigo-600 transition" style={{ color: 'var(--vyora-muted)' }}>Shop</Link>
          <span style={{ color: 'var(--vyora-muted)' }}>/</span>
          <Link to={`/shop?category=${product.category?.slug}`}
            className="hover:text-indigo-600 transition" style={{ color: 'var(--vyora-muted)' }}>
            {product.category?.name}
          </Link>
          <span style={{ color: 'var(--vyora-muted)' }}>/</span>
          <span className="truncate max-w-[200px] font-medium" style={{ color: 'var(--vyora-text)' }}>
            {product.name}
          </span>
        </nav>

        {/* Main product card */}
        <div className="vyora-card p-6 lg:p-8 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* Image column */}
            <div className="space-y-3">
              <div className="img-zoom-wrap rounded-2xl overflow-hidden bg-gray-50 dark:bg-slate-800 aspect-square">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                    }}
                  />
                )}
                <div
                  className="w-full h-full items-center justify-center text-8xl"
                  style={{ display: product.image_url ? 'none' : 'flex' }}>
                  🛍️
                </div>
              </div>
              {product.discount_percent > 0 && (
                <div className="flex gap-2">
                  <span className="badge badge-sale text-sm px-3 py-1">{product.discount_percent}% OFF</span>
                  <span className="badge badge-new text-sm px-3 py-1">
                    Save ₹{(product.price - product.discounted_price).toFixed(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Info column */}
            <div className="flex flex-col gap-4">
              <div>
                <Link to={`/shop?category=${product.category?.slug}`}
                  className="text-xs font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition">
                  {product.category?.name}
                </Link>
                <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 leading-tight" style={{ color: 'var(--vyora-text)' }}>
                  {product.name}
                </h1>
              </div>

              {/* Rating */}
              {product.review_count > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={16}
                        className={s <= Math.round(product.average_rating) ? 'star-filled' : 'star-empty'} />
                    ))}
                  </div>
                  <span className="font-bold text-sm" style={{ color: 'var(--vyora-text)' }}>
                    {Number(product.average_rating).toFixed(1)}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--vyora-muted)' }}>
                    ({product.review_count} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-end gap-3 py-2 border-y" style={{ borderColor: 'var(--vyora-border)' }}>
                <span className="text-3xl font-extrabold" style={{ color: 'var(--vyora-text)' }}>
                  ₹{Number(product.discounted_price).toLocaleString('en-IN')}
                </span>
                {product.discount_percent > 0 && (
                  <>
                    <span className="text-lg line-through mb-0.5" style={{ color: 'var(--vyora-muted)' }}>
                      ₹{Number(product.price).toLocaleString('en-IN')}
                    </span>
                    <span className="text-emerald-600 font-bold text-sm mb-0.5">{product.discount_percent}% off</span>
                  </>
                )}
              </div>

              {/* Stock */}
              <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-xl w-fit ${stockCls}`}>
                <Package size={14} />
                {product.stock > 5
                  ? `In Stock (${product.stock} available)`
                  : product.stock > 0
                  ? `Only ${product.stock} left!`
                  : 'Out of Stock'}
              </div>

              {/* Delivery check */}
              <div className="bg-indigo-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Truck size={15} className="text-indigo-600" />
                  <span className="font-semibold" style={{ color: 'var(--vyora-text)' }}>Free delivery above ₹500</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={pincode}
                      onChange={e => setPincode(e.target.value.slice(0, 6))}
                      placeholder="Enter PIN code"
                      maxLength={6}
                      className="vyora-input pl-9 text-sm py-2"
                      onKeyDown={e => { if (e.key === 'Enter') checkDelivery(); }}
                    />
                  </div>
                  <button onClick={checkDelivery} className="btn-outline text-sm px-4 py-2 flex-shrink-0">
                    Check
                  </button>
                </div>
                {pinResult && (
                  <p className="text-sm font-medium text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle size={14} /> Estimated delivery in {pinResult.days} business days
                  </p>
                )}
              </div>

              {/* Quantity */}
              {product.in_stock && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold" style={{ color: 'var(--vyora-text)' }}>Quantity:</span>
                  <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: 'var(--vyora-border)' }}>
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="px-3 py-2 hover:bg-gray-50 transition"
                      style={{ color: 'var(--vyora-muted)' }}>
                      <Minus size={14} />
                    </button>
                    <span className="px-4 py-2 text-sm font-bold border-x"
                      style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-text)' }}>
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                      className="px-3 py-2 hover:bg-gray-50 transition"
                      style={{ color: 'var(--vyora-muted)' }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!product.in_stock || adding}
                  className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                  {adding
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding...</>
                    : <><ShoppingCart size={17} /> Add to Cart</>
                  }
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!product.in_stock}
                  className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  Buy Now
                </button>
                <button
                  onClick={() => {
                    setWishAnim(true);
                    setTimeout(() => setWishAnim(false), 400);
                    toggleWishlist(product.id);
                  }}
                  aria-label={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                    inWish
                      ? 'border-rose-500 bg-rose-50 text-rose-500'
                      : 'border-gray-200 text-gray-400 hover:border-rose-300 hover:scale-105 active:scale-95'
                  }`}>
                  <Heart
                    size={18}
                    fill={inWish ? 'currentColor' : 'none'}
                    className={wishAnim ? 'wish-animate' : ''}
                  />
                </button>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Shield size={13} />,      text: '100% Genuine Product' },
                  { icon: <RotateCcw size={13} />,   text: '7-Day Easy Returns' },
                  { icon: <Truck size={13} />,       text: 'Pan India Delivery' },
                  { icon: <CheckCircle size={13} />, text: 'Secure Payment' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs rounded-lg p-2 bg-gray-50"
                    style={{ color: 'var(--vyora-muted)' }}>
                    <span className="text-indigo-500">{b.icon}</span> {b.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="vyora-card mb-6 overflow-hidden">
          <div className="flex border-b" style={{ borderColor: 'var(--vyora-border)' }}>
            {['description', 'specifications', 'reviews'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 sm:px-7 py-4 text-sm font-semibold capitalize transition border-b-2 -mb-px ${
                  tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-indigo-500'
                }`}
                style={{ color: tab === t ? undefined : 'var(--vyora-muted)' }}>
                {t}{t === 'reviews' ? ` (${reviews.length})` : ''}
              </button>
            ))}
          </div>
          <div className="p-6">

            {tab === 'description' && (
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--vyora-text)' }}>
                {product.description || 'No description available.'}
              </p>
            )}

            {tab === 'specifications' && (
              product.specifications ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 rounded-xl overflow-hidden border"
                  style={{ borderColor: 'var(--vyora-border)' }}>
                  {product.specifications.split('|').map((spec, i) => {
                    const colonIdx = spec.indexOf(':');
                    if (colonIdx < 0) return null;
                    const key = spec.slice(0, colonIdx).trim();
                    const val = spec.slice(colonIdx + 1).trim();
                    const rowCls = i % 2 === 0 ? 'bg-gray-50' : '';
                    return (
                      <div key={i} className={`flex gap-3 p-3 text-sm border-b last:border-0 ${rowCls}`}
                        style={{ borderColor: 'var(--vyora-border)' }}>
                        <span className="font-semibold min-w-[120px] flex-shrink-0" style={{ color: 'var(--vyora-muted)' }}>
                          {key}
                        </span>
                        <span style={{ color: 'var(--vyora-text)' }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--vyora-muted)' }}>No specifications available.</p>
              )
            )}

            {tab === 'reviews' && (
              <div className="space-y-6">

                {/* Rating summary */}
                {reviews.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-6 p-5 rounded-2xl bg-gray-50 mb-4">
                    <div className="text-center">
                      <div className="text-5xl font-extrabold text-indigo-600">
                        {Number(product.average_rating).toFixed(1)}
                      </div>
                      <div className="flex justify-center gap-0.5 my-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={14}
                            className={s <= Math.round(product.average_rating) ? 'star-filled' : 'star-empty'} />
                        ))}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--vyora-muted)' }}>{reviews.length} reviews</div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {ratingDist.map(({ r, count }) => (
                        <div key={r} className="flex items-center gap-2 text-xs">
                          <span className="w-5 text-right font-medium" style={{ color: 'var(--vyora-text)' }}>{r}★</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-500"
                              style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="w-4" style={{ color: 'var(--vyora-muted)' }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews list */}
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Star size={40} className="mx-auto mb-3 star-empty" />
                    <p className="font-semibold" style={{ color: 'var(--vyora-text)' }}>No reviews yet</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--vyora-muted)' }}>
                      Be the first to share your experience!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(rv => (
                      <div key={rv.id} className="border rounded-2xl p-4" style={{ borderColor: 'var(--vyora-border)' }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold uppercase">
                              {rv.username?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--vyora-text)' }}>
                                {rv.user_full_name || rv.username}
                              </p>
                              <div className="flex gap-0.5 mt-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} size={11}
                                    className={s <= rv.rating ? 'star-filled' : 'star-empty'} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs" style={{ color: 'var(--vyora-muted)' }}>
                            {new Date(rv.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        {rv.title && (
                          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--vyora-text)' }}>
                            {rv.title}
                          </p>
                        )}
                        {rv.comment && (
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--vyora-muted)' }}>
                            {rv.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Write a review */}
                {isLoggedIn && (
                  <div className="border-t pt-6" style={{ borderColor: 'var(--vyora-border)' }}>
                    <h4 className="font-bold mb-4" style={{ color: 'var(--vyora-text)' }}>Write a Review</h4>
                    <form onSubmit={handleReview} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--vyora-text)' }}>
                          Your Rating
                        </label>
                        <StarPicker
                          value={reviewForm.rating}
                          onChange={r => setReviewForm(f => ({ ...f, rating: r }))}
                        />
                      </div>
                      <input
                        value={reviewForm.title}
                        onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Review title (optional)"
                        className="vyora-input"
                      />
                      <textarea
                        value={reviewForm.comment}
                        onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                        placeholder="Share your experience..."
                        rows={3}
                        className="vyora-input resize-none"
                      />
                      <button type="submit" disabled={submitting}
                        className="btn-primary px-6 py-2.5 text-sm disabled:opacity-60">
                        {submitting ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div>
            <h2 className="section-title mb-5">You May Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {related.slice(0, 5).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
