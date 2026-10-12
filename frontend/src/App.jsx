import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar           from './components/Navbar.jsx';
import Footer           from './components/Footer.jsx';
import BottomNav        from './components/BottomNav.jsx';
import PrivateRouter    from './components/PrivateRouter.jsx';
import AIShoppingAssistant from './components/AIShoppingAssistant.jsx';
import { useAuth }      from './context/AuthContext.jsx';

import HomePage           from './pages/HomePage.jsx';
import ShopPage           from './pages/ShopPage.jsx';
import ProductDetails     from './pages/ProductDetails.jsx';
import CartPage           from './pages/CartPage.jsx';
import CheckoutPage       from './pages/CheckoutPage.jsx';
import Login              from './pages/Login.jsx';
import Signup             from './pages/Signup.jsx';
import WishlistPage       from './pages/WishlistPage.jsx';
import ProfilePage        from './pages/ProfilePage.jsx';
import OrdersPage         from './pages/OrdersPage.jsx';
import OrderDetailPage    from './pages/OrderDetailPage.jsx';
import OrderSuccessPage   from './pages/OrderSuccessPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage  from './pages/ResetPasswordPage.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function AppRoutes() {
  const { authReady } = useAuth();

  // Block rendering until the auth token check resolves.
  // This prevents a blank flash caused by contexts racing on cold load.
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--vyora-bg)' }}>
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 pt-16">
        <Routes>
          <Route path="/"            element={<HomePage />} />
          <Route path="/shop"        element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart"        element={<CartPage />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/signup"      element={<Signup />} />
          <Route path="/forgot-password"            element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
          <Route element={<PrivateRouter />}>
            <Route path="/checkout"                      element={<CheckoutPage />} />
            <Route path="/wishlist"                      element={<WishlistPage />} />
            <Route path="/profile"                       element={<ProfilePage />} />
            <Route path="/orders"                        element={<OrdersPage />} />
            <Route path="/orders/:orderNumber"           element={<OrderDetailPage />} />
            <Route path="/order-success/:orderNumber"    element={<OrderSuccessPage />} />
          </Route>
        </Routes>
      </main>
      <Footer />
      <AIShoppingAssistant />
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--vyora-bg)' }}>
        <AppRoutes />
      </div>
    </Router>
  );
}
