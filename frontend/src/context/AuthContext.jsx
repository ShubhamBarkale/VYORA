import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAccessToken, clearTokens, saveTokens } from '../utils/auth';

const AuthContext = createContext();
const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [user,        setUser]        = useState(null);
  const [isLoggedIn,  setIsLoggedIn]  = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  // authReady = true once the initial token check has resolved.
  // Children should not render auth-dependent UI until this is true.
  const [authReady,   setAuthReady]   = useState(false);

  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoggedIn(false);
      setAuthReady(true);
      return;
    }
    try {
      const res = await fetch(`${BASE}/api/profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch {
      // Network error — keep whatever state we had; don't force logout
    } finally {
      setAuthReady(true);
    }
  }, []);

  // Run once on mount
  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (username, password) => {
    setAuthLoading(true);
    try {
      const res = await fetch(`${BASE}/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        saveTokens(data);
        await fetchUser();
        return { success: true };
      }
      return { success: false, error: data.detail || 'Invalid credentials' };
    } catch {
      return { success: false, error: 'Network error' };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, authLoading, authReady, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
