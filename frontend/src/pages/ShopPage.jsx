import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SlidersHorizontal, X, ChevronDown, LayoutGrid, List,
} from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import ProductCardSkeleton from '../components/ProductCardSkeleton.jsx';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const SORT_OPTIONS = [
  { value: '',           label: 'Recommended'       },
  { value: 'featured',   label: 'Popular'            },
  { value: 'newest',     label: 'Newest'             },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
];

/* ─────────────────────────────────────────────────────────────────
   FilterSection — defined at MODULE level (never inside a component).
   Re-defining a component inside another component causes React to
   treat it as a new component type on every render, which unmounts
   and remounts the DOM node — losing input focus.
───────────────────────────────────────────────────────────────── */
function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b pb-4 mb-4 last:border-0 last:mb-0 last:pb-0"
      style={{ borderColor: 'var(--vyora-border)' }}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full mb-3">
        <span className="text-sm font-bold" style={{ color: 'var(--vyora-text)' }}>{title}</span>
        <ChevronDown size={14}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--vyora-muted)' }} />
      </button>
      {open && children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FilterSidebar — also at MODULE level, receives all needed data
   and callbacks as props so it never captures stale closures.
───────────────────────────────────────────────────────────────── */
function FilterSidebar({
  categories, category, sort, inStock, activeFilters,
  localMin, localMax, setLocalMin, setLocalMax,
  setParam, clearFilters, applyPrice,
}) {
  return (
    <div className="vyora-card p-5">
      <div className="flex items-center justify-between mb-5">
        <span className="font-bold text-sm" style={{ color: 'var(--vyora-text)' }}>Filters</span>
        {activeFilters.length > 0 && (
          <button onClick={clearFilters}
            className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition">
            Clear All
          </button>
        )}
      </div>

      <FilterSection title="Category">
        <div className="space-y-1.5">
          {[{ slug: '', name: 'All Categories' }, ...categories].map(cat => (
            <label key={cat.slug} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="cat"
                value={cat.slug}
                checked={category === cat.slug}
                onChange={() => setParam('category', cat.slug)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span
                className={`text-sm transition group-hover:text-indigo-600 ${category === cat.slug ? 'font-semibold text-indigo-600' : ''}`}
                style={{ color: category === cat.slug ? undefined : 'var(--vyora-text)' }}>
                {cat.name}
              </span>
              {cat.product_count !== undefined && cat.slug && (
                <span className="text-xs ml-auto" style={{ color: 'var(--vyora-muted)' }}>
                  ({cat.product_count})
                </span>
              )}
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="flex gap-2 items-center mb-3">
          <input
            type="number"
            value={localMin}
            onChange={e => setLocalMin(e.target.value)}
            placeholder="Min ₹"
            className="vyora-input text-xs py-2 px-3"
          />
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--vyora-muted)' }}>—</span>
          <input
            type="number"
            value={localMax}
            onChange={e => setLocalMax(e.target.value)}
            placeholder="Max ₹"
            className="vyora-input text-xs py-2 px-3"
          />
        </div>
        <button
          onClick={applyPrice}
          className="w-full py-2 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition">
          Apply Price Filter
        </button>
      </FilterSection>

      <FilterSection title="Availability">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock === 'true'}
            onChange={e => setParam('in_stock', e.target.checked ? 'true' : '')}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm" style={{ color: 'var(--vyora-text)' }}>In Stock Only</span>
        </label>
      </FilterSection>

      <FilterSection title="Sort By">
        <div className="space-y-1.5">
          {SORT_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sort"
                value={opt.value}
                checked={sort === opt.value}
                onChange={() => setParam('sort', opt.value)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span
                className={`text-sm ${sort === opt.value ? 'font-semibold text-indigo-600' : ''}`}
                style={{ color: sort === opt.value ? undefined : 'var(--vyora-text)' }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ShopPage — main page component
───────────────────────────────────────────────────────────────── */
export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search   = searchParams.get('search')    || '';
  const category = searchParams.get('category')  || '';
  const sort     = searchParams.get('sort')      || '';
  const inStock  = searchParams.get('in_stock')  || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const page     = parseInt(searchParams.get('page') || '1');

  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [gridView,   setGridView]   = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  /* Local price inputs — separate from URL params so typing doesn't
     trigger a product fetch on every keystroke */
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  const setParam = useCallback((key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    setSearchParams(p);
  }, [searchParams, setSearchParams]);

  const clearFilters = useCallback(() => {
    setLocalMin('');
    setLocalMax('');
    setSearchParams(search ? { search } : {});
  }, [search, setSearchParams]);

  const applyPrice = useCallback(() => {
    const p = new URLSearchParams(searchParams);
    if (localMin) p.set('min_price', localMin); else p.delete('min_price');
    if (localMax) p.set('max_price', localMax); else p.delete('max_price');
    p.delete('page');
    setSearchParams(p);
  }, [localMin, localMax, searchParams, setSearchParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search)   p.set('search',    search);
      if (category) p.set('category',  category);
      if (sort)     p.set('sort',      sort);
      if (inStock)  p.set('in_stock',  inStock);
      if (minPrice) p.set('min_price', minPrice);
      if (maxPrice) p.set('max_price', maxPrice);
      p.set('page', page);
      const res  = await fetch(`${BASE}/api/products/?${p}`);
      const data = await res.json();
      setProducts(data.results || []);
      setTotal(data.count || 0);
      setTotalPages(data.total_pages || 1);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, sort, inStock, minPrice, maxPrice, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    fetch(`${BASE}/api/categories/`)
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const activeFilters = [
    category && { key: 'category', label: categories.find(c => c.slug === category)?.name || category },
    sort     && { key: 'sort',     label: SORT_OPTIONS.find(s => s.value === sort)?.label || sort },
    inStock  && { key: 'in_stock', label: 'In Stock Only' },
    minPrice && { key: 'min_price',label: `Min ₹${minPrice}` },
    maxPrice && { key: 'max_price',label: `Max ₹${maxPrice}` },
  ].filter(Boolean);

  /* Shared props passed to both desktop sidebar and mobile drawer */
  const sidebarProps = {
    categories, category, sort, inStock, activeFilters,
    localMin, localMax, setLocalMin, setLocalMax,
    setParam, clearFilters, applyPrice,
  };

  return (
    <div style={{ background: 'var(--vyora-bg)' }} className="pb-20 md:pb-8 page-transition">

      {/* Page header */}
      <div className="border-b" style={{ background: 'var(--vyora-card)', borderColor: 'var(--vyora-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="section-title">
                {search
                  ? `Results for "${search}"`
                  : category
                  ? categories.find(c => c.slug === category)?.name || 'Shop'
                  : 'All Products'}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--vyora-muted)' }}>
                {loading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGridView(true)}
                className={`p-2 rounded-lg transition ${gridView ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`}
                style={{ color: gridView ? undefined : 'var(--vyora-muted)' }}
                aria-label="Grid view">
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setGridView(false)}
                className={`p-2 rounded-lg transition ${!gridView ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`}
                style={{ color: !gridView ? undefined : 'var(--vyora-muted)' }}
                aria-label="List view">
                <List size={16} />
              </button>
              <button
                onClick={() => setFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border transition"
                style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-text)' }}>
                <SlidersHorizontal size={14} /> Filters
                {activeFilters.length > 0 && (
                  <span className="w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFilters.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeFilters.map(f => (
                <span key={f.key}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {f.label}
                  <button onClick={() => setParam(f.key, '')} className="hover:text-rose-600 transition">
                    <X size={11} />
                  </button>
                </span>
              ))}
              <button onClick={clearFilters} className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-60 flex-shrink-0">
            <FilterSidebar {...sidebarProps} />
          </aside>

          {/* Products */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className={`grid gap-4 ${gridView ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center text-4xl mb-5">🔍</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--vyora-text)' }}>No products found</h3>
                <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--vyora-muted)' }}>
                  {search ? `We couldn't find anything for "${search}".` : 'No products match your current filters.'}
                </p>
                <button onClick={clearFilters} className="btn-primary text-sm px-6 py-2.5">
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className={`grid gap-4 card-grid ${gridView ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                      disabled={page <= 1}
                      onClick={() => { const p = new URLSearchParams(searchParams); p.set('page', page - 1); setSearchParams(p); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95"
                      style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-text)' }}
                      aria-label="Previous page">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Previous
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const p = start + i;
                      if (p > totalPages) return null;
                      return (
                        <button key={p}
                          onClick={() => { const sp = new URLSearchParams(searchParams); sp.set('page', p); setSearchParams(sp); }}
                          className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95
                            ${page === p
                              ? 'bg-indigo-600 text-white'
                              : 'border hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                          style={{ borderColor: page === p ? undefined : 'var(--vyora-border)', color: page === p ? undefined : 'var(--vyora-text)' }}
                          aria-label={`Page ${p}`}
                          aria-current={page === p ? 'page' : undefined}>
                          {p}
                        </button>
                      );
                    })}

                    <button
                      disabled={page >= totalPages}
                      onClick={() => { const p = new URLSearchParams(searchParams); p.set('page', page + 1); setSearchParams(p); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95"
                      style={{ borderColor: 'var(--vyora-border)', color: 'var(--vyora-text)' }}
                      aria-label="Next page">
                      Next
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setFilterOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto animate-slide-up"
            style={{ background: 'var(--vyora-card)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: 'var(--vyora-text)' }}>Filters &amp; Sort</h3>
              <button
                onClick={() => setFilterOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                style={{ color: 'var(--vyora-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <FilterSidebar {...sidebarProps} />
            <button onClick={() => setFilterOpen(false)} className="btn-primary w-full mt-4">
              Show {total} Products
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
