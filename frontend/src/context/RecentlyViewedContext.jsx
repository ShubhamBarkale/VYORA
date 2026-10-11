import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RecentlyViewedContext = createContext();
const KEY   = 'vyora-recently-viewed';
const LIMIT = 10;

export const RecentlyViewedProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  });

  const add = useCallback((product) => {
    setItems(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      const next = [product, ...filtered].slice(0, LIMIT);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = () => { setItems([]); localStorage.removeItem(KEY); };

  return (
    <RecentlyViewedContext.Provider value={{ items, add, clear }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
};

export const useRecentlyViewed = () => useContext(RecentlyViewedContext);
