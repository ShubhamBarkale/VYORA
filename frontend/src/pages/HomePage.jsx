import { useCallback, useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Star, Truck, Shield, RotateCcw,
  Headphones, ChevronLeft, ChevronRight, Zap, Clock,
  Mail, CheckCircle,
} from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import ProductCardSkeleton from '../components/ProductCardSkeleton.jsx';
import { useRecentlyViewed } from '../context/RecentlyViewedContext.jsx';
import { useScrollReveal } from '../hooks/useScrollReveal.js';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

/* ── Static data outside component (never recreated on re-render) ─── */
const CATEGORIES = [
  { slug: 'electronics',   name: 'Electronics',    icon: '📱', color: 'from-blue-500 to-indigo-600'   },
  { slug: 'home-kitchen',  name: 'Home & Kitchen', icon: '🏠', color: 'from-orange-400 to-amber-500'  },
  { slug: 'fashion',       name: 'Fashion',        icon: '👗', color: 'from-pink-500 to-rose-600'     },
  { slug: 'beauty-health', name: 'Beauty & Health',icon: '💄', color: 'from-purple-500 to-violet-600' },
  { slug: 'sports-fitness',name: 'Sports & Fitness',icon:'🏋️', color: 'from-green-500 to-emerald-600' },
  { slug: 'books',         name: 'Books',          icon: '📚', color: 'from-yellow-500 to-orange-500' },
  { slug: 'toys-games',    name: 'Toys & Games',   icon: '🎮', color: 'from-red-400 to-pink-500'     },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', avatar: 'PS', rating: 5, text: 'Absolutely love shopping on VYORA! Fast delivery, great quality products, and amazing deals.', product: 'Wireless Earbuds Pro' },
  { name: 'Rahul Verma',  avatar: 'RV', rating: 5, text: 'The checkout process is seamless and the product quality exceeded my expectations.', product: 'Mechanical Keyboard' },
  { name: 'Ananya Patel', avatar: 'AP', rating: 4, text: 'Great selection of products. Found exactly what I was looking for at a better price.', product: 'Yoga Mat Anti-Slip' },
  { name: 'Karan Mehta',  avatar: 'KM', rating: 5, text: 'Super smooth experience from browsing to delivery. Order tracking is excellent!', product: 'Smart Fitness Band' },
];

const PERKS = [
  { icon: <Truck size={22}/>,      title: 'Free Shipping',  desc: 'On all orders above ₹500'       },
  { icon: <Shield size={22}/>,     title: 'Secure Payment', desc: '100% safe & encrypted payments' },
  { icon: <RotateCcw size={22}/>,  title: 'Easy Returns',   desc: '7-day hassle-free return policy'},
  { icon: <Headphones size={22}/>, title: '24/7 Support',   desc: 'Expert help whenever you need'  },
];

/* Must be outside component — otherwise recreated every render */
const HERO_SLIDES = [
  {
    badge: 'Summer Sale — Up to 50% Off',
    title: 'Discover Products\nYou\'ll Love',
    sub:   'Shop thousands of products at unbeatable prices. Free shipping on orders above ₹500.',
    cta1:  { label: 'Shop Now',     to: '/shop' },
    cta2:  { label: 'Explore Deals',to: '/shop?sort=featured' },
    art:   '🛍️',
  },
  {
    badge: 'Flash Deals — Limited Time',
    title: 'Premium Tech\nat Your Fingertips',
    sub:   'Latest electronics, gadgets, and accessories. Authentic products, best prices.',
    cta1:  { label: 'Shop Electronics', to: '/shop?category=electronics' },
    cta2:  { label: 'New Arrivals',      to: '/shop?sort=newest' },
    art:   '📱',
  },
  {
    badge: 'New Arrivals This Week',
    title: 'Fashion Forward,\nPriced Right',
    sub:   'Trending styles for every occasion. Express yourself with VYORA Fashion.',
    cta1:  { label: 'Shop Fashion', to: '/shop?category=fashion' },
    cta2:  { label: 'View All',     to: '/shop' },
    art:   '👗',
  },
];

const HERO_PRODUCTS = [
  { id: 'dress', illustration: '👗', name: 'Fashion dress' },
  { id: 'phone', illustration: '📱', name: 'Mobile phone' },
  { id: 'shoes', illustration: '👟', name: 'Shoes' },
  { id: 'handbag', illustration: '👜', name: 'Handbag' },
  { id: 'headphones', illustration: '🎧', name: 'Headphones' },
  { id: 'shopping', illustration: '🛍️', name: 'Shopping bag' },
];

/* ── Countdown hook ─────────────────────────────────────────────── */
function useCountdown(targetDate) {
  const calc = useCallback(() => {
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return { h: 0, m: 0, s: 0 };
    return {
      h: Math.floor((diff / 3600000) % 24),
      m: Math.floor((diff / 60000) % 60),
      s: Math.floor((diff / 1000) % 60),
    };
  }, [targetDate]);
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

/* ── Sub-components ─────────────────────────────────────────────── */
function CountdownBox({ value, label }) {
  return (
    <div className="flex flex-col items-center bg-white/20 rounded-xl px-3 py-2 min-w-[52px]">
      <span className="text-white text-xl font-extrabold tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-white/70 text-[10px] font-medium mt-0.5 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function SectionHeader({ title, subtitle, viewAll }) {
  const navigate = useNavigate();
  const ref = useScrollReveal();
  return (
    <div ref={ref} className="scroll-reveal flex items-end justify-between mb-6">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--vyora-muted)' }}>{subtitle}</p>}
      </div>
      {viewAll && (
        <button onClick={() => navigate(viewAll)}
          className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition">
          View All <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function HorizontalScroll({ children }) {
  const ref = useRef(null);
  const scroll = (d) => ref.current?.scrollBy({ left: d * 280, behavior: 'smooth' });
  return (
    <div className="relative group/scroll">
      <button onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full shadow-lg border flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity bg-white"
        style={{ borderColor: 'var(--vyora-border)' }}>
        <ChevronLeft size={16} />
      </button>
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
        {children}
      </div>
      <button onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full shadow-lg border flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity bg-white"
        style={{ borderColor: 'var(--vyora-border)' }}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

/* ProductRow uses useScrollReveal() correctly — called at the top of this component */
function ProductRow({ title, subtitle, viewAll, products, loading }) {
  const sectionRef = useScrollReveal({ threshold: 0.08 });
  return (
    <section ref={sectionRef} className="scroll-reveal">
      <SectionHeader title={title} subtitle={subtitle} viewAll={viewAll} />
      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-52"><ProductCardSkeleton /></div>
          ))}
        </div>
      ) : (
        <HorizontalScroll>
          {products.map((p, i) => (
            <div key={p.id} className="flex-shrink-0 w-52 snap-start"
              style={{ animation: `reveal-up 350ms ${Math.min(i * 50, 400)}ms cubic-bezier(.4,0,.2,1) both` }}>
              <ProductCard product={p} />
            </div>
          ))}
        </HorizontalScroll>
      )}
    </section>
  );
}

/* FlashDeals uses useScrollReveal() correctly at the top of this component */
function FlashDealsSection({ discounted, h, m, s }) {
  const ref = useScrollReveal({ threshold: 0.08 });
  if (!discounted.length) return null;
  return (
    <section ref={ref} className="scroll-reveal">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={20} className="text-amber-500" />
            <h2 className="section-title">Flash Deals</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--vyora-muted)' }}>Limited-time offers — grab before they're gone!</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-rose-600 rounded-xl px-3 py-1.5">
            <Clock size={14} className="text-white" />
            <span className="text-white text-xs font-semibold">Ends in:</span>
          </div>
          <div className="flex gap-1.5">
            <CountdownBox value={h} label="hrs" />
            <CountdownBox value={m} label="min" />
            <CountdownBox value={s} label="sec" />
          </div>
        </div>
      </div>
      <HorizontalScroll>
        {discounted.map(p => (
          <div key={p.id} className="flex-shrink-0 w-52 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </HorizontalScroll>
    </section>
  );
}

/* ── Main page component ────────────────────────────────────────── */
export default function HomePage() {
  const { items: recentlyViewed } = useRecentlyViewed();

  const [featured,   setFeatured]   = useState([]);
  const [discounted, setDiscounted] = useState([]);
  const [newest,     setNewest]     = useState([]);
  const [trending,   setTrending]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [email,      setEmail]      = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [heroIdx,    setHeroIdx]    = useState(0);
  const [heroProductIdx, setHeroProductIdx] = useState(0);

  /* Flash deal timer — fixed end time, won't shift on re-renders */
  const dealEndRef = useRef(new Date(Date.now() + 6 * 3600 * 1000).toISOString());
  const { h, m, s } = useCountdown(dealEndRef.current);

  /* Hero auto-advance — stable dependency: HERO_SLIDES.length is constant */
  useEffect(() => {
    const id = setInterval(() => setHeroIdx(i => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);                          /* ← empty deps — safe because HERO_SLIDES is module-level */

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(
      () => setHeroProductIdx(i => (i + 1) % HERO_PRODUCTS.length),
      1800,
    );
    return () => clearInterval(id);
  }, []);

  /* Fetch homepage products — runs once on mount */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/api/products/?sort=featured&page=1`).then(r => r.json()),
      fetch(`${BASE}/api/products/?sort=newest&page=1`).then(r => r.json()),
    ]).then(([feat, newArr]) => {
      if (cancelled) return;
      setFeatured((feat.results  || []).filter(p => p.is_featured).slice(0, 10));
      setNewest((newArr.results  || []).slice(0, 10));
      setTrending((feat.results  || []).slice(0, 10));
      setDiscounted((feat.results|| []).filter(p => p.discount_percent > 0).slice(0, 8));
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };   /* cleanup prevents state update on unmount */
  }, []);

  const slide = HERO_SLIDES[heroIdx];

  return (
    <div style={{ background: 'var(--vyora-bg)' }} className="pb-20 md:pb-0">

      {/* Announcement bar */}
      <div className="announcement-bar text-white text-center text-xs font-semibold py-2 tracking-wide">
        Free Shipping Above ₹500 &nbsp;•&nbsp; Secure Payments &nbsp;•&nbsp; 7-Day Easy Returns
      </div>

      {/* Hero */}
      <section className="relative hero-gradient overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="relative z-10 max-w-2xl">
              <span className="hero-text-1 inline-block text-sm font-semibold text-indigo-300 bg-white/10 rounded-full px-4 py-1.5 mb-5">
                {slide.badge}
              </span>
              <h1 className="hero-text-2 text-4xl sm:text-5xl xl:text-6xl font-extrabold text-white leading-tight whitespace-pre-line mb-5 tracking-tight">
                {slide.title}
              </h1>
              <p className="hero-text-3 text-indigo-200 text-lg mb-8 max-w-lg leading-relaxed">
                {slide.sub}
              </p>
              <div className="hero-text-4 flex flex-wrap gap-3">
                <Link to={slide.cta1.to}
                  className="px-7 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2">
                  {slide.cta1.label} <ArrowRight size={16} />
                </Link>
                <Link to={slide.cta2.to}
                  className="px-7 py-3.5 border-2 border-white/30 text-white font-bold rounded-2xl hover:bg-white/10 transition-all duration-200">
                  {slide.cta2.label}
                </Link>
              </div>
              <div className="flex gap-2 mt-8">
                {HERO_SLIDES.map((_, i) => (
                  <button key={i} onClick={() => setHeroIdx(i)}
                    aria-label={`Show hero slide ${i + 1}`}
                    aria-current={i === heroIdx ? 'true' : undefined}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === heroIdx ? 'w-8 bg-white' : 'w-3 bg-white/30'}`} />
                ))}
              </div>
            </div>
            <div className="hero-product-stage mx-auto w-full max-w-[440px] min-h-[210px] sm:min-h-[300px] lg:min-h-[390px] pointer-events-none select-none" aria-hidden="true">
              <div className="hero-product-halo" />
              <span className="hero-product-bubble hero-product-bubble--top">✦</span>
              <span className="hero-product-bubble hero-product-bubble--left">✧</span>
              <span className="hero-product-bubble hero-product-bubble--right">✦</span>
              <div className="hero-product-float">
                <div key={HERO_PRODUCTS[heroProductIdx].id} className="hero-product-enter">
                  <div className="hero-product-card">
                    <span className="hero-product-illustration">
                      {HERO_PRODUCTS[heroProductIdx].illustration}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </section>

      {/* Perks bar */}
      <section className="border-b" style={{ background: 'var(--vyora-card)', borderColor: 'var(--vyora-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PERKS.map(p => (
              <div key={p.title} className="flex items-center gap-3">
                <span className="text-indigo-500 flex-shrink-0">{p.icon}</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--vyora-text)' }}>{p.title}</p>
                  <p className="text-xs" style={{ color: 'var(--vyora-muted)' }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">

        {/* Categories */}
        <section>
          <SectionHeader title="Shop by Category" subtitle="Browse our wide range of categories" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {CATEGORIES.map(cat => (
              <Link key={cat.slug} to={`/shop?category=${cat.slug}`}
                className="vyora-card flex flex-col items-center gap-2.5 p-4 cursor-pointer group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform duration-200`}>
                  {cat.icon}
                </div>
                <span className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--vyora-text)' }}>
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Flash Deals — uses proper component so hook rules are satisfied */}
        <FlashDealsSection discounted={discounted} h={h} m={m} s={s} />

        {/* Product rows */}
        <ProductRow title="Trending Now"    subtitle="Most popular products this week" viewAll="/shop?sort=featured" products={trending}  loading={loading} />

        {/* Promo banner */}
        <section className="rounded-3xl overflow-hidden promo-gradient p-8 sm:p-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-block text-indigo-200 text-xs font-bold uppercase tracking-widest mb-3">Limited Offer</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">Upgrade Your Everyday</h2>
              <p className="text-indigo-200 mb-6">
                Premium products at better prices. Use code{' '}
                <strong className="text-white bg-white/20 px-2 py-0.5 rounded-lg">WELCOME10</strong>{' '}
                for 10% off your first order.
              </p>
              <Link to="/shop" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Shop Collection <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hidden sm:flex justify-end gap-4">
              {['📱','🎧','💻'].map((e, i) => (
                <div key={i} className="text-5xl animate-float" style={{ animationDelay: `${i * 0.3}s` }}>{e}</div>
              ))}
            </div>
          </div>
        </section>

        <ProductRow title="Featured Picks"  subtitle="Hand-picked products you'll love"   viewAll="/shop?sort=featured" products={featured} loading={loading} />
        <ProductRow title="New Arrivals"    subtitle="Just landed in our catalog"          viewAll="/shop?sort=newest"   products={newest}   loading={loading} />

        {recentlyViewed.length > 0 && (
          <ProductRow title="Recently Viewed" subtitle="Pick up where you left off" products={recentlyViewed.slice(0, 10)} loading={false} />
        )}

        {/* Testimonials */}
        <section>
          <SectionHeader title="What Our Customers Say" subtitle="Real reviews from real shoppers" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="vyora-card p-5">
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={14} className={s <= t.rating ? 'star-filled' : 'star-empty'} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-4 line-clamp-3" style={{ color: 'var(--vyora-text)' }}>"{t.text}"</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--vyora-text)' }}>{t.name}</p>
                    <p className="text-xs" style={{ color: 'var(--vyora-muted)' }}>Bought: {t.product}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="rounded-3xl border py-12 px-6 sm:px-12 text-center"
          style={{ background: 'var(--vyora-card)', borderColor: 'var(--vyora-border)' }}>
          <div className="max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--vyora-text)' }}>Get 10% OFF Your First Order</h2>
            <p className="mb-6 text-sm" style={{ color: 'var(--vyora-muted)' }}>
              Subscribe for exclusive deals, new arrivals, and style tips.
            </p>
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold">
                <CheckCircle size={20} /> You're subscribed! Check your inbox.
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); if (email.trim()) setSubscribed(true); }}
                className="flex gap-2 max-w-sm mx-auto">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required className="vyora-input flex-1" />
                <button type="submit" className="btn-primary px-5 text-sm flex-shrink-0">Subscribe</button>
              </form>
            )}
            <p className="text-xs mt-3" style={{ color: 'var(--vyora-muted)' }}>No spam, ever. Unsubscribe anytime.</p>
          </div>
        </section>

      </div>
    </div>
  );
}
