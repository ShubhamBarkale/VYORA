import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, Send, ArrowRight } from 'lucide-react';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export default function AIShoppingAssistant() {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('Recommend a good product under ₹3000 for daily use');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({
    assistant_reply: 'Ask for a product recommendation based on your budget, use case, or category.',
    recommendations: [],
  });

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
    <div className="fixed bottom-20 right-4 z-40 w-[min(360px,calc(100vw-1.5rem))]">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="ml-auto flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 transition"
        >
          <Bot size={16} /> AI Assistant
        </button>
      ) : (
        <div className="rounded-2xl border border-indigo-100 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">VYORA AI</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Smart shopping help</p>
              </div>
            </div>
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
