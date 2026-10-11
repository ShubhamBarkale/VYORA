import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Heart, ShoppingCart, User } from 'lucide-react';
import { useCart }    from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth }    from '../context/AuthContext';

const ITEMS = [
  { to: '/',         icon: Home,        label: 'Home'   },
  { to: '/shop',     icon: LayoutGrid,  label: 'Shop'   },
  { to: '/wishlist', icon: Heart,       label: 'Saved'  },
  { to: '/cart',     icon: ShoppingCart,label: 'Cart'   },
  { to: '/profile',  icon: User,        label: 'Account'},
];

export default function BottomNav() {
  const { pathname }    = useLocation();
  const { itemCount }   = useCart();
  const { wishlistItems } = useWishlist();
  const { isLoggedIn }  = useAuth();

  return (
    <nav className="bottom-nav md:hidden pb-safe">
      {ITEMS.map(({ to, icon: Icon, label }) => {
        const active = pathname === to;
        const badge  = to === '/cart' ? itemCount : to === '/wishlist' ? wishlistItems.length : 0;
        const showItem = (to === '/wishlist' || to === '/profile') ? isLoggedIn : true;
        if (!showItem && to === '/profile') {
          return (
            <Link key={to} to="/login" className={`bottom-nav-item ${active ? 'active' : ''}`}>
              <div className="relative"><Icon size={20} /></div>
              <span>{label}</span>
            </Link>
          );
        }
        return (
          <Link key={to} to={to} className={`bottom-nav-item ${active ? 'active' : ''}`}>
            <div className="relative">
              <Icon size={20} />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
