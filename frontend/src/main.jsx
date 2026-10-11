import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { ThemeProvider }         from './context/ThemeContext.jsx';
import { AuthProvider }          from './context/AuthContext.jsx';
import { CartProvider }          from './context/CartContext.jsx';
import { WishlistProvider }      from './context/WishlistContext.jsx';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <RecentlyViewedProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    borderRadius: '12px',
                    background: '#1e293b',
                    color: '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: '1px solid #334155',
                    boxShadow: '0 8px 24px rgba(0,0,0,.25)',
                  },
                  success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                  error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
              />
            </RecentlyViewedProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
