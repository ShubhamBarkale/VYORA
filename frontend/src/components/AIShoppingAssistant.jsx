import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, Send, Grip, GitCompareArrows, Star, PackagePlus, WandSparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { authFetch } from '../utils/auth.js';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export default function AIShoppingAssistant() {
  const { isLoggedIn } = useAuth();
  const { addToCart } = useCart();
  const [open, setOpen] = useState(true);
  const [position, setPosition] = useState(null);
  const [query, setQuery] = useState('Recommend a good product under ₹3000 for daily use');
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const dragRef = useRef(null);
  const draggedRef = useRef(false);
  const widgetRef = useRef(null);
  const [result, setResult] = useState({
    assistant_reply: 'Ask me to find products, shop within a budget, compare two products, summarize reviews, or track an order.',
    intent: '',
    recommendations: [],
    comparison: [],
    review_summary: null,
    order: null,
  });

  const startDragging = (e) => {
    if (e.button !== 0 || (open && e.target.closest('button'))) return;

    const bounds = widgetRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - bounds.left,
      offsetY: e.clientY - bounds.top,
    };
    draggedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPosition((current) => (
      current?.left === bounds.left && current?.top === bounds.top
        ? current
        : { left: bounds.left, top: bounds.top }
    ));
  };

  const drag = (e) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;

    const bounds = widgetRef.current.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - bounds.width);
    const maxTop = Math.max(0, window.innerHeight - bounds.height);
    const left = Math.min(
      Math.max(0, e.clientX - dragRef.current.offsetX),
      maxLeft,
    );
    const top = Math.min(
      Math.max(0, e.clientY - dragRef.current.offsetY),
      maxTop,
    );
    draggedRef.current = true;
    setPosition({ left, top });
  };

  const stopDragging = (e) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  const handleCollapsedClick = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    setOpen(true);
  };

  useEffect(() => {
    const keepInViewport = () => {
      if (!position || !widgetRef.current) return;
      const bounds = widgetRef.current.getBoundingClientRect();
      const left = Math.max(0, Math.min(position.left, window.innerWidth - bounds.width));
      const top = Math.max(0, Math.min(position.top, window.innerHeight - bounds.height));
      if (left !== position.left || top !== position.top) setPosition({ left, top });
    };

    keepInViewport();
    window.addEventListener('resize', keepInViewport);
    return () => window.removeEventListener('resize', keepInViewport);
  }, [open, position]);

  const askAssistant = async (e, options = {}) => {
    e?.preventDefault();
    const message = options.message ?? query.trim();
    if (!message && !options.action) return;
    setLoading(true);
    try {
      const res = await authFetch(`${BASE}/api/ai/assistant/`, {
        method: 'POST',
        body: JSON.stringify({
          message,
          action: options.action || '',
          product_ids: options.productIds || [],
          product_id: options.productId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          assistant_reply: data.error || 'I could not complete that request. Please try again.',
          intent: res.status === 401 ? 'order_tracking' : '',
          recommendations: [],
          comparison: [],
          review_summary: null,
          order: null,
        });
        return;
      }
      setResult({
        assistant_reply: data.assistant_reply || 'Here is what I found in the catalog.',
        intent: data.intent || '',
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        comparison: Array.isArray(data.comparison) ? data.comparison : [],
        review_summary: data.review_summary || null,
        order: data.order || null,
      });
      setSelectedProducts([]);
    } catch (error) {
      console.error('Shopping assistant request failed:', error);
      setResult({
        assistant_reply: 'I could not reach the shopping service. Please check your connection and try again.',
        intent: '',
        recommendations: [],
        comparison: [],
        review_summary: null,
        order: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : current.length < 2 ? [...current, productId] : [current[1], productId]
    ));
  };

  return (
    <div
      ref={widgetRef}
      style={position ? { left: position.left, top: position.top } : undefined}
      className={`fixed z-40 w-[min(360px,calc(100vw-1.5rem))] ${position ? '' : 'right-4 bottom-20'}`}
    >
      {!open ? (
        <button
          onClick={handleCollapsedClick}
          onPointerDown={startDragging}
          onPointerMove={drag}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          className="ml-auto flex touch-none cursor-move items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500"
        >
          <Bot size={16} /> VYRO
        </button>
      ) : (
        <div className="rounded-2xl border border-indigo-100 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
          <div
            onPointerDown={startDragging}
            onPointerMove={drag}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            className="flex cursor-move touch-none items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700"
            title="Drag to move VYRO"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">VYRO</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Smart shopping help</p>
              </div>
            </div>
            <Grip size={16} className="mr-2 text-slate-400" aria-hidden="true" />
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
            >
              Hide
            </button>
          </div>

          <form onSubmit={askAssistant} className="border-b border-slate-200 p-3 dark:border-slate-700">
            <textarea
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “wireless headphones under ₹3000” or “track order SC00001”"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Ask VYRO'}
                <Send size={14} />
              </button>
              <button
                type="button"
                onClick={() => askAssistant(null, { action: 'recommend', message: '' })}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                <WandSparkles size={14} /> For you
              </button>
              {selectedProducts.length === 2 && (
                <button
                  type="button"
                  onClick={() => askAssistant(null, { action: 'compare', productIds: selectedProducts })}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  <GitCompareArrows size={14} /> Compare
                </button>
              )}
            </div>
          </form>

          <div className="max-h-[320px] overflow-y-auto p-3">
            <p className="mb-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{result.assistant_reply}</p>
            {result.intent === 'order_tracking' && !isLoggedIn && (
              <Link to="/login" className="mb-3 inline-block rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
                Sign in to track your orders
              </Link>
            )}

            {result.recommendations.length > 0 && (
              <div className="space-y-2">
                {result.recommendations.map((product) => (
                  <div key={product.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <Link to={`/product/${product.id}`} className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xl dark:bg-slate-800">
                        {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : '🛍️'}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/product/${product.id}`} className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{product.name}</Link>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{product.category?.name || 'General'} · {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
                        <p className="text-sm font-bold text-indigo-600">
                          ₹{Number(product.discounted_price || product.price).toLocaleString('en-IN')}
                          {product.review_count > 0 && <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-medium text-slate-500"><Star size={11} /> {Number(product.average_rating).toFixed(1)} ({product.review_count})</span>}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleProductSelection(product.id)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium ${selectedProducts.includes(product.id) ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}
                      >
                        <GitCompareArrows size={12} /> {selectedProducts.includes(product.id) ? 'Selected' : 'Compare'}
                      </button>
                      <button
                        type="button"
                        onClick={() => askAssistant(null, { action: 'reviews', productId: product.id, message: product.name })}
                        disabled={loading}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        <Star size={12} /> Reviews
                      </button>
                      {isLoggedIn ? (
                        <button
                          type="button"
                          onClick={() => addToCart(product.id)}
                          disabled={product.stock < 1}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <PackagePlus size={12} /> Add to cart
                        </button>
                      ) : (
                        <Link to="/login" className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-semibold text-white">Sign in to add</Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.comparison.length === 2 && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr><th className="p-2 font-semibold">Details</th>{result.comparison.map((product) => <th key={product.id} className="min-w-24 p-2 font-semibold">{product.name}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    <tr><td className="p-2 text-slate-500">Price</td>{result.comparison.map((product) => <td key={product.id} className="p-2">₹{Number(product.discounted_price || product.price).toLocaleString('en-IN')}</td>)}</tr>
                    <tr><td className="p-2 text-slate-500">Stock</td>{result.comparison.map((product) => <td key={product.id} className="p-2">{product.stock}</td>)}</tr>
                    <tr><td className="p-2 text-slate-500">Rating</td>{result.comparison.map((product) => <td key={product.id} className="p-2">{product.review_count ? `${Number(product.average_rating).toFixed(1)} / 5 (${product.review_count})` : 'No reviews'}</td>)}</tr>
                  </tbody>
                </table>
                {result.comparison.some((product) => product.specifications) && (
                  <p className="border-t border-slate-200 p-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    Specifications: {result.comparison.map((product) => `${product.name}: ${product.specifications || 'Not provided'}`).join(' · ')}
                  </p>
                )}
              </div>
            )}

            {result.review_summary && (
              <div className="mt-3 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{result.review_summary.product_name}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {result.review_summary.review_count
                    ? `${result.review_summary.average_rating} / 5 from ${result.review_summary.review_count} stored review(s)`
                    : 'No reviews have been submitted for this product.'}
                </p>
                {result.review_summary.review_count > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(result.review_summary.rating_distribution).reverse().map(([rating, count]) => (
                      <span key={rating} className="rounded-md bg-slate-100 px-1.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {rating}★: {count}
                      </span>
                    ))}
                  </div>
                )}
                {result.review_summary.excerpts.map((review, index) => (
                  <p key={`${review.rating}-${index}`} className="mt-2 text-slate-500 dark:text-slate-400">
                    {review.rating}★ — “{review.text}”
                  </p>
                ))}
                <p className="mt-2 text-slate-400">{result.review_summary.summary_note}</p>
              </div>
            )}

            {result.order && (
              <div className="mt-3 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Order {result.order.order_number} · {result.order.status.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Payment: {result.order.payment_status} · Total: ₹{Number(result.order.total_amount).toLocaleString('en-IN')}</p>
                <div className="mt-2 space-y-1">
                  {result.order.items.map((item, index) => <p key={`${item.product_name}-${index}`} className="text-slate-600 dark:text-slate-300">{item.quantity} × {item.product_name}</p>)}
                </div>
                {result.order.status_history.map((update, index) => (
                  <p key={`${update.status}-${index}`} className="mt-2 border-l-2 border-indigo-400 pl-2 text-slate-500 dark:text-slate-400">
                    {update.status.replaceAll('_', ' ')} — {update.note}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
