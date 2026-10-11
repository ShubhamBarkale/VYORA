import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authFetch, getAccessToken } from '../utils/auth';
import toast from 'react-hot-toast';

const CartContext = createContext();
const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal]         = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading]     = useState(false);

  const fetchCart = useCallback(async () => {
    if (!getAccessToken()) { setCartItems([]); setTotal(0); setItemCount(0); return; }
    try {
      const res = await authFetch(`${BASE}/api/cart/`);
      if (!res.ok) return;
      const data = await res.json();
      setCartItems(data.items || []);
      setTotal(data.total || 0);
      setItemCount(data.item_count || 0);
    } catch {
      // Retry once after 1 second on network error (handles cold-start race)
      setTimeout(async () => {
        try {
          const res = await authFetch(`${BASE}/api/cart/`);
          if (!res.ok) return;
          const data = await res.json();
          setCartItems(data.items || []);
          setTotal(data.total || 0);
          setItemCount(data.item_count || 0);
        } catch { /* silent */ }
      }, 1000);
    }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    setLoading(true);
    try {
      const res = await authFetch(`${BASE}/api/cart/add/`, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCart();
        toast.success('Added to cart!');
      } else {
        toast.error(data.error || 'Could not add to cart');
      }
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const removeFromCart = async (itemId) => {
    try {
      await authFetch(`${BASE}/api/cart/remove/`, {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId }),
      });
      await fetchCart();
      toast.success('Removed from cart');
    } catch { toast.error('Could not remove item'); }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (quantity < 1) { await removeFromCart(itemId); return; }
    try {
      const res = await authFetch(`${BASE}/api/cart/update/`, {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId, quantity }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Could not update quantity');
        return;
      }
      await fetchCart();
    } catch { toast.error('Network error'); }
  };

  const clearCart = () => { setCartItems([]); setTotal(0); setItemCount(0); };

  return (
    <CartContext.Provider value={{ cartItems, total, itemCount, loading, addToCart, removeFromCart, updateQuantity, clearCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
