import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authFetch, getAccessToken } from '../utils/auth';
import toast from 'react-hot-toast';

const WishlistContext = createContext();
const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);

  const fetchWishlist = useCallback(async () => {
    if (!getAccessToken()) { setWishlistItems([]); return; }
    try {
      const res = await authFetch(`${BASE}/api/wishlist/`);
      if (!res.ok) return;
      const data = await res.json();
      setWishlistItems(data.products || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const isInWishlist = (productId) => wishlistItems.some(p => p.id === productId);

  const toggleWishlist = async (productId) => {
    if (!getAccessToken()) { toast.error('Please login to use wishlist'); return; }
    try {
      const res = await authFetch(`${BASE}/api/wishlist/toggle/`, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchWishlist();
        toast.success(data.message);
      }
    } catch { toast.error('Network error'); }
  };

  const moveToCart = async (productId, addToCartFn) => {
    try {
      const res = await authFetch(`${BASE}/api/wishlist/move-to-cart/`, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
      });
      if (res.ok) {
        await fetchWishlist();
        toast.success('Moved to cart!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Could not move to cart');
      }
    } catch { toast.error('Network error'); }
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, isInWishlist, toggleWishlist, moveToCart, fetchWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
