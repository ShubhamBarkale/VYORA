import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, Send, ArrowRight, Grip } from 'lucide-react';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export default function AIShoppingAssistant() {
  const [open, setOpen] = useState(true);
  const [position, setPosition] = useState(null);
  const [query, setQuery] = useState('Recommend a good product under ₹3000 for daily use');
  const [loading, setLoading] = useState(false);
  const dragRef = useRef(null);
  const draggedRef = useRef(false);
  const widgetRef = useRef(null);
  const [result, setResult] = useState({
    assistant_reply: 'Demo AI mode is active. Ask for a budget, use case, or category and I will scan the product catalog for suggestions.',
    recommendations: [],
  });

  const startDragging = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;

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

  const askAssistant = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ai/assistant/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();
      setResult({
        assistant_reply: data.assistant_reply || 'I found a few matching products.',
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      });
    } catch {
      setResult({
        assistant_reply: 'I could not fetch recommendations right now. Please try again.',
        recommendations: [],
      });
    } finally {
      setLoading(false);
    }
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
          <Bot size={16} /> AI Assistant
        </button>
      ) : (
        <div className="rounded-2xl border border-indigo-100 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
          <div
            onPointerDown={startDragging}
            onPointerMove={drag}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            className="flex cursor-move touch-none items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700"
            title="Drag to move VYORA AI"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">VYORA AI</p>
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
              placeholder="Need a product under a budget or for a specific use case?"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Finding products...' : 'Ask Assistant'}
              <Send size={14} />
            </button>
          </form>

          <div className="max-h-[320px] overflow-y-auto p-3">
            <p className="mb-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{result.assistant_reply}</p>

            {result.recommendations.length > 0 ? (
              <div className="space-y-2">
                {result.recommendations.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-2 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:hover:border-indigo-500 dark:hover:bg-slate-800"
                  >
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xl dark:bg-slate-800">
                      {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : '🛍️'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{product.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{product.category?.name || 'General'}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-indigo-600">
                      ₹{Number(product.discounted_price || product.price).toLocaleString('en-IN')}
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
