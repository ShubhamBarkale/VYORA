import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import ProductCardSkeleton from '../components/ProductCardSkeleton.jsx';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const SORT_OPTIONS = [
  { value: '',           label: 'Default' },
  { value: 'newest',     label: 'Newest' },
  { value: 'featured',   label: 'Featured' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
];

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [totalCount,  setTotalCount]  = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [featured,    setFeatured]    = useState([]);
  const [filterOpen,  setFilterOpen]  = useState(false);

  const search   = searchParams.get('search')   || '';
  const category = searchParams.get('category') || '';
  const sort     = searchParams.get('sort')     || '';
  const inStock  = searchParams.get('in_stock') || '';
  const minPrice = searchParams.get('min_price')|| '';
  const maxPrice = searchParams.get('max_price')|| '';
  const page     = parseInt(searchParams.get('page') || '1');

  const setParam = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    setSearchParams(p);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)   params.set('search',   search);
      if (category) params.set('category', category);
      if (sort)     params.set('sort',     sort);
      if (inStock)  params.set('in_stock', inStock);
      if (minPrice) params.set('min_price',minPrice);
      if (maxPrice) params.set('max_price',maxPrice);
      params.set('page', page);

      const res  = await fetch(`${BASE}/api/products/?${params}`);
      const data = await res.json();
      setProducts(data.results || []);
      setTotalCount(data.count  || 0);
      setTotalPages(data.total_pages || 1);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }, [search, category, sort, inStock, minPrice, maxPrice, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    fetch(`${BASE}/api/categories/`)
      .then(r => r.json()).then(setCategories).catch(() => {});
    fetch(`${BASE}/api/featured/`)
      .then(r => r.json()).then(setFeatured).catch(() => {});
  }, []);

  const isFiltered = search || category || sort || inStock || minPrice || maxPrice;

  const clearFilters = () => setSearchParams({});

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero (only on unfiltered homepage) ── */}
      {!isFiltered && (
        <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-indigo-200 font-medium text-sm mb-3 tracking-wide uppercase">New Arrivals 2024</p>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
                Shop Smarter,<br />Live Better
              </h1>
              <p className="text-indigo-100 text-lg mb-8">
                Discover thousands of products at unbeatable prices. Free shipping on orders above ₹500.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setParam('sort', 'featured')}
                  className="px-6 py-3 bg-white text-indigo-700 font-semibold rounded-full hover:shadow-lg transition">
                  Shop Featured
                </button>
                <button onClick={() => setParam('in_stock', 'true')}
                  className="px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-full hover:bg-white/10 transition">
                  In Stock Only
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Category Pills ── */}
      {!isFiltered && categories.length > 0 && (
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              <button onClick={() => setParam('category', '')}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border
                  ${!category ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                🛍️ All
              </button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setParam('category', cat.slug)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border
                    ${category === cat.slug ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                  {cat.icon} {cat.name}
                  {cat.product_count > 0 && <span className="text-xs opacity-70">({cat.product_count})</span>}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Search result heading ── */}
        {search && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Search results for "<span className="text-indigo-600">{search}</span>"
            </h2>
            <p className="text-sm text-gray-500 mt-1">{totalCount} products found</p>
          </div>
        )}

        {/* ── Filter / Sort bar ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 transition">
              <SlidersHorizontal size={15} /> Filters
              {isFiltered && <span className="w-2 h-2 bg-indigo-600 rounded-full" />}
            </button>
            {isFiltered && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition">
                <X size={13}/> Clear all
              </button>
            )}
            <span className="text-sm text-gray-500">{totalCount} products</span>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select value={sort} onChange={e => setParam('sort', e.target.value)}
              className="appearance-none pl-4 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ── Filter panel ── */}
        {filterOpen && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Category</label>
                <select value={category} onChange={e => setParam('category', e.target.value)}
                  className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">All Categories</option>
                  {categories.map(cat => <option key={cat.id} value={cat.slug}>{cat.name}</option>)}
                </select>
              </div>
              {/* Min Price */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Min Price (₹)</label>
                <input type="number" value={minPrice} placeholder="0"
                  onChange={e => setParam('min_price', e.target.value)}
                  className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {/* Max Price */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Max Price (₹)</label>
                <input type="number" value={maxPrice} placeholder="Any"
                  onChange={e => setParam('max_price', e.target.value)}
                  className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {/* Availability */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Availability</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={inStock === 'true'}
                    onChange={e => setParam('in_stock', e.target.checked ? 'true' : '')}
                    className="rounded text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── Product Grid ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {Array.from({length: 10}).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6 max-w-sm">
              {search ? `We couldn't find anything for "${search}".` : 'No products match your current filters.'}
            </p>
            <button onClick={clearFilters}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition">
              Explore All Products
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
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
                <span className="text-sm font-medium px-2" style={{ color: 'var(--vyora-muted)' }}>
                  Page {page} of {totalPages}
                </span>
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
  );
}
