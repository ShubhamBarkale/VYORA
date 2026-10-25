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
    badge: 'New season arrivals',
    title: 'Style Meets\nYour Lifestyle',
    sub:   'Discover thoughtful fashion, everyday essentials, and the latest tech in one place.',
    cta1:  { label: 'Shop Now',     to: '/shop' },
    cta2:  { label: 'Explore Deals',to: '/shop?sort=featured' },
    art:   '🛍️',
  },
  {
    badge: 'Featured essentials',
    title: 'Smarter Finds\nfor Every Day',
    sub:   'Explore useful technology and carefully selected essentials for your routine.',
    cta1:  { label: 'Shop Electronics', to: '/shop?category=electronics' },
    cta2:  { label: 'New Arrivals',      to: '/shop?sort=newest' },
    art:   '📱',
  },
  {
    badge: 'Fresh finds for you',
    title: 'Find Your Next\nFavorite Thing',
    sub:   'Fresh arrivals across fashion, electronics, and home, picked for the way you live.',
    cta1:  { label: 'Shop Fashion', to: '/shop?category=fashion' },
    cta2:  { label: 'View All',     to: '/shop' },
    art:   '👗',
  },
];

const HERO_PRODUCT_KEYWORDS = [
  'dress',
  'headphones',
  'sneakers',
  'backpack',
  'sunglasses',
  'earbuds',
  'fitness band',
  'speaker',
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}><ProductCardSkeleton /></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.slice(0, 10).map((p, i) => (
            <div key={p.id}
              style={{ animation: `reveal-up 350ms ${Math.min(i * 50, 400)}ms cubic-bezier(.4,0,.2,1) both` }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
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
  const [heroProducts, setHeroProducts] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [email,      setEmail]      = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [heroIdx,    setHeroIdx]    = useState(0);

  /* Flash deal timer — fixed end time, won't shift on re-renders */
  const dealEndRef = useRef(new Date(Date.now() + 6 * 3600 * 1000).toISOString());
  const { h, m, s } = useCountdown(dealEndRef.current);

  /* Hero auto-advance — stable dependency: HERO_SLIDES.length is constant */
  useEffect(() => {
    const id = setInterval(() => setHeroIdx(i => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);                          /* ← empty deps — safe because HERO_SLIDES is module-level */

  /* Fetch homepage products — runs once on mount */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/api/products/?sort=featured&page=1&page_size=100`).then(r => r.json()),
      fetch(`${BASE}/api/products/?sort=newest&page=1&page_size=100`).then(r => r.json()),
    ]).then(([feat, newArr]) => {
      if (cancelled) return;
      setFeatured((feat.results  || []).filter(p => p.is_featured).slice(0, 10));
      setNewest((newArr.results  || []).slice(0, 10));
      setTrending((feat.results  || []).slice(0, 10));
      setDiscounted((feat.results|| []).filter(p => p.discount_percent > 0).slice(0, 8));
      const catalog = [...(feat.results || []), ...(newArr.results || [])]
        .filter((product, index, products) =>
          product.image_url && products.findIndex(item => item.id === product.id) === index
        );
      const curated = HERO_PRODUCT_KEYWORDS
        .map(keyword => catalog.find(product => product.name.toLowerCase().includes(keyword)))
        .filter(Boolean);
      setHeroProducts(
        [...new Map([...curated, ...catalog].map(product => [product.id, product])).values()]
          .slice(0, 8)
      );
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };   /* cleanup prevents state update on unmount */
  }, []);

  const slide = HERO_SLIDES[heroIdx];
  const catalogProducts = [...heroProducts, ...newest, ...featured];
  const imageForCategory = (category) => {
    const imageProduct = catalogProducts.find(product =>
      product.category?.slug === category.slug && product.image_url
    ) || catalogProducts.find(product =>
      product.category?.name?.toLowerCase().includes(category.name.toLowerCase()) &&
      product.image_url
    );
    return imageProduct?.image_url;
  };

  return (
    <div style={{ background: 'var(--vyora-bg)' }} className="pb-20 md:pb-0">

      {/* Announcement bar */}
      <div className="announcement-bar text-white text-center text-xs font-semibold py-2 tracking-wide">
        Free Shipping Above ₹500 &nbsp;•&nbsp; Secure Payments &nbsp;•&nbsp; 7-Day Easy Returns
      </div>

      {/* Hero */}
      <section className="home-hero relative hero-gradient overflow-hidden">
        <div className="home-hero-backdrop" aria-hidden="true">
          <img
            src="/images/home-hero.jpg"
            alt=""
          />
        </div>
        <div className="home-hero-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="home-hero-copy">
              <span className="hero-text-1 inline-block text-xs sm:text-sm font-semibold text-indigo-200 bg-white/10 rounded-full px-4 py-1.5 mb-5">
                {slide.badge}
              </span>
              <h1 className="home-hero-title hero-text-2 text-4xl sm:text-5xl xl:text-6xl font-extrabold text-white leading-tight whitespace-pre-line mb-5 tracking-tight">
                {slide.title}
              </h1>
              <p className="hero-text-3 text-stone-200 text-base sm:text-lg mb-8 max-w-lg leading-relaxed">
                {slide.sub}
              </p>
              <div className="hero-text-4 flex flex-wrap gap-3">
                <Link to={slide.cta1.to}
                  className="home-hero-primary px-7 py-3.5 text-stone-950 font-bold rounded-full hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2">
                  {slide.cta1.label} <ArrowRight size={16} />
                </Link>
                <Link to={slide.cta2.to}
                  className="px-7 py-3.5 border border-white/40 text-white font-semibold rounded-full hover:bg-white/10 transition-all duration-200">
                  {slide.cta2.label}
                </Link>
              </div>
            <div className="flex gap-2 mt-8" role="group" aria-label="Choose a featured collection">
              {HERO_SLIDES.map((_, i) => (
                <button key={i} onClick={() => setHeroIdx(i)}
                  aria-label={`Show hero slide ${i + 1}`}
                  aria-current={i === heroIdx ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === heroIdx ? 'w-8 bg-white' : 'w-3 bg-white/30'}`} />
              ))}
            </div>
          </div>
          <div className="home-hero-gallery" aria-label="Featured products from the catalog">
            <span className="home-hero-script" aria-hidden="true">Better choices<br />for every day</span>
            {heroProducts.length ? heroProducts.slice(0, 4).map((product, index) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className={`home-hero-product home-hero-product-${index + 1}`}
                aria-label={`View ${product.name}`}
              >
                <img
                  src={product.image_url}
                  alt=""
                  onError={event => {
                    event.currentTarget.closest('a').style.display = 'none';
                  }}
                />
                <span>{product.name}</span>
              </Link>
            )) : (
              <div className="home-hero-empty" aria-hidden="true">
                <span>{slide.art}</span>
              </div>
            )}
            <div className="home-hero-glow" aria-hidden="true" />
          </div>
        </div>
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

      <div className="home-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Categories */}
        <section>
          <SectionHeader title="Shop by Category" subtitle="Browse our wide range of categories" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {CATEGORIES.map(cat => {
              const imageUrl = imageForCategory(cat);
              return (
                <Link key={cat.slug} to={`/shop?category=${cat.slug}`}
                  className="home-category-card vyora-card cursor-pointer group">
                  <div className="home-category-image">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt=""
                          loading="lazy"
                          onError={event => {
                            event.currentTarget.style.display = 'none';
                            event.currentTarget.nextElementSibling.style.display = 'grid';
                          }}
                        />
                        <span className={`bg-gradient-to-br ${cat.color}`} style={{ display: 'none' }}>
                          {cat.icon}
                        </span>
                      </>
                    ) : (
                      <span className={`bg-gradient-to-br ${cat.color}`}>{cat.icon}</span>
                    )}
                  </div>
                  <span className="home-category-name">{cat.name}</span>
                  <ArrowRight size={14} className="home-category-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Product rows */}
        <ProductRow title="Handpicked for You" subtitle="A few customer favorites from our catalog" viewAll="/shop?sort=featured" products={trending} loading={loading} />

        {/* Flash Deals — uses proper component so hook rules are satisfied */}
        <FlashDealsSection discounted={discounted} h={h} m={m} s={s} />

        {/* Promo banner */}
        <section className="home-promo rounded-3xl overflow-hidden promo-gradient p-8 sm:p-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-block text-amber-200 text-xs font-bold uppercase tracking-widest mb-3">Curated for your everyday</span>
              <h2 className="home-promo-title text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">Upgrade Your Style</h2>
              <p className="text-stone-200 mb-6">
                Find a fresh favorite in our latest fashion, home, and tech collections.
              </p>
              <Link to="/shop?sort=newest" className="home-hero-primary inline-flex items-center gap-2 text-stone-950 font-bold px-6 py-3 rounded-full transition-all">
                Explore new arrivals <ArrowRight size={16} />
              </Link>
            </div>
            <div className="home-promo-gallery">
              {heroProducts.slice(4, 7).map((product, index) => (
                <Link key={product.id} to={`/product/${product.id}`} className={`home-promo-product home-promo-product-${index + 1}`} aria-label={`Shop ${product.name}`}>
                  <img src={product.image_url} alt={product.name} loading="lazy" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <ProductRow title="Featured Picks"  subtitle="More highlights from our catalog" viewAll="/shop?sort=featured" products={featured} loading={loading} />
        <ProductRow title="New Arrivals"    subtitle="Just landed in our catalog" viewAll="/shop?sort=newest" products={newest} loading={loading} />

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
