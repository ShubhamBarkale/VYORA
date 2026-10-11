import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart }     from '../context/CartContext';
import { Star }        from 'lucide-react';

export default function WishlistPage() {
  const { wishlistItems, toggleWishlist, moveToCart } = useWishlist();
  const { addToCart } = useCart();

  if (!wishlistItems.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 pb-20" style={{ background:'var(--vyora-bg)' }}>
      <div className="w-24 h-24 rounded-3xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-5">
        <Heart size={40} className="text-rose-300" />
      </div>
      <h2 className="text-2xl font-extrabold mb-2" style={{ color:'var(--vyora-text)' }}>Your wishlist is empty</h2>
      <p className="text-sm mb-8 max-w-xs" style={{ color:'var(--vyora-muted)' }}>Save items you love here and come back to them anytime!</p>
      <Link to="/shop" className="btn-primary px-8 py-3">Explore Products</Link>
    </div>
  );

  return (
    <div style={{ background:'var(--vyora-bg)' }} className="pb-24 md:pb-8 page-transition">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="section-title mb-6">
          My Wishlist <span className="text-base font-normal ml-2" style={{ color:'var(--vyora-muted)' }}>({wishlistItems.length} items)</span>
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {wishlistItems.map(product => {
            const img = product.image_url || product.image;
            return (
              <div key={product.id} className="vyora-card overflow-hidden">
                <Link to={`/product/${product.id}`}>
                  <div className="img-zoom-wrap h-48 bg-gray-50 dark:bg-slate-800 overflow-hidden" style={{ borderRadius:'16px 16px 0 0' }}>
                    {img ? (
                      <>
                        <img src={img} alt={product.name} className="w-full h-full object-cover"
                          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                        <div className="w-full h-full items-center justify-center text-4xl" style={{ display: 'none' }}>🛍️</div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">{product.category?.name}</p>
                  <Link to={`/product/${product.id}`}>
                    <h3 className="text-sm font-bold line-clamp-2 hover:text-indigo-600 transition mb-2" style={{ color:'var(--vyora-text)' }}>{product.name}</h3>
                  </Link>
                  {product.review_count > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      {[1,2,3,4,5].map(s => <Star key={s} size={11} className={s<=Math.round(product.average_rating)?'star-filled':'star-empty'} />)}
                      <span className="text-xs" style={{ color:'var(--vyora-muted)' }}>({product.review_count})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-extrabold" style={{ color:'var(--vyora-text)' }}>₹{Number(product.discounted_price).toLocaleString('en-IN')}</span>
                    {product.discount_percent > 0 && <span className="text-xs line-through" style={{ color:'var(--vyora-muted)' }}>₹{Number(product.price).toLocaleString('en-IN')}</span>}
                    {product.discount_percent > 0 && <span className="badge badge-sale">{product.discount_percent}% off</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => moveToCart(product.id)} disabled={!product.in_stock}
                      className="btn-primary flex-1 text-xs py-2 disabled:opacity-50">
                      <ShoppingCart size={13}/> {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                <button onClick={() => toggleWishlist(product.id)}
                  className="p-2 rounded-xl border text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-200 hover:scale-110 active:scale-95" style={{ borderColor:'var(--vyora-border)' }}>
                  <Trash2 size={14}/>
                </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
