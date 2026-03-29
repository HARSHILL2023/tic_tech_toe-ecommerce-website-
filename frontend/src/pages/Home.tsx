import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Zap, ShoppingCart, ChevronLeft, ChevronRight, SlidersHorizontal, SearchX,
  AlertCircle, X, Flame, TrendingUp, Tag, Smartphone, Shirt, Sparkles, BookOpen, Gamepad2,
} from "lucide-react";
import { useProducts, CATEGORY_SLUGS } from "@/contexts/ProductContext";
import type { Product } from "@/contexts/ProductContext";
import { useCart } from "@/contexts/CartContext";
import { trackEvent } from "@/api";
import ProductCard from "@/components/ProductCard";

interface HomeProps {
  searchQuery: string;
  activeCategory: string;
  onCategoryChange?: (cat: string) => void;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800 overflow-hidden animate-pulse min-h-[340px]">
      <div className="h-52 bg-gray-700/60" />
      <div className="p-3 space-y-2">
        <div className="h-2 bg-gray-700 rounded w-1/3" />
        <div className="h-3 bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-700 rounded w-2/4" />
        <div className="h-7 bg-gray-700 rounded mt-2" />
      </div>
    </div>
  );
}

// ── Row source label ──────────────────────────────────────────────────────────
function SourceLabel({ source }: { source: "amazon" | "flipkart" | "mix" }) {
  if (source === "amazon")   return <span className="text-[10px] text-amber-400/80 font-medium">Amazon powered</span>;
  if (source === "flipkart") return <span className="text-[10px] text-blue-400/80 font-medium">Flipkart powered</span>;
  return <span className="text-[10px] text-gray-500 font-medium">Marketplace mix</span>;
}

// ── Horizontal scroll row ─────────────────────────────────────────────────────
function ProductRow({
  title, products, icon, loading: rowLoading, sourceHint,
}: {
  title: string;
  products: Product[];
  icon?: React.ReactNode;
  loading?: boolean;
  sourceHint?: "amazon" | "flipkart" | "mix";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 680, behavior: "smooth" });

  if (rowLoading) return (
    <section className="space-y-3">
      <div className="h-6 w-48 bg-gray-700 rounded animate-pulse" />
      <div className="flex gap-4 overflow-x-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-w-[200px] flex-shrink-0"><SkeletonCard /></div>
        ))}
      </div>
    </section>
  );
  // Never render a section with fewer than 4 products
  if (products.length < 4) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="text-base md:text-lg font-bold text-foreground leading-tight">{title}</h2>
            {sourceHint && <SourceLabel source={sourceHint} />}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">({products.length})</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scroll(-1)} className="rounded-full border border-border/60 p-1.5 text-muted-foreground hover:text-accent hover:border-accent transition-colors bg-card">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll(1)} className="rounded-full border border-border/60 p-1.5 text-muted-foreground hover:text-accent hover:border-accent transition-colors bg-card">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {products.map(p => (
          <div key={p.id} className="min-w-[190px] max-w-[190px] md:min-w-[210px] md:max-w-[210px] flex-shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Hero banner ───────────────────────────────────────────────────────────────
function HeroBanner({ countdown }: { countdown: number }) {
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0533 0%, #0d1b4f 50%, #0a2240 100%)", minHeight: 240 }}>
      <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-10 right-10 h-48 w-48 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #e11d48 0%, transparent 70%)" }} />
      <div className="container relative z-10 py-10 md:py-16 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            <Zap size={12} className="fill-accent" /> AI-Powered Dynamic Pricing
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
            Best price.<br className="hidden md:block" /> <span className="text-accent">Right now.</span>
          </h1>
          <p className="text-white/60 text-sm md:text-base max-w-md">
            Amazon + Flipkart unified. PriceIQ AI surfaces the lowest live price across both marketplaces.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
            <Link to="#products" className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-accent-foreground font-bold text-sm transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/30">
              <ShoppingCart size={16} /> Shop Live Deals
            </Link>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-white/60 text-xs">Cache refresh:</span>
              <span className="font-mono text-sm font-bold text-accent">
                {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 grid grid-cols-2 gap-3">
          {[
            { label: "Amazon + Flipkart", value: "2x",   icon: <Tag size={14} />,       color: "text-cyan-400" },
            { label: "Avg Savings",       value: "28%",  icon: <TrendingUp size={14} />, color: "text-green-400" },
            { label: "Flash Deals",       value: "12+",  icon: <Flame size={14} />,      color: "text-rose-400" },
            { label: "Categories",        value: "8",    icon: <Zap size={14} />,        color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center space-y-1">
              <div className={`flex justify-center ${s.color}`}>{s.icon}</div>
              <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home({ searchQuery, activeCategory, onCategoryChange: _onCategoryChange }: HomeProps) {
  const {
    products, marketplaceFeed, feedSource, loading, apiError,
    categoryProducts, categoryLoading, loadCategory, sessionId, userId,
  } = useProducts();
  const { addToCart: _addToCart } = useCart();
  const [sortBy, setSortBy] = useState("relevance");
  const [countdown, setCountdown] = useState(10 * 60);
  const [errorDismissed, setErrorDismissed] = useState(false);

  // Countdown
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c <= 0 ? 10 * 60 : c - 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Track page view
  useEffect(() => { trackEvent("page_view", null, sessionId, userId); }, [sessionId, userId]);

  // Load category products when active category changes
  useEffect(() => {
    if (activeCategory && activeCategory !== "All") {
      const slug = CATEGORY_SLUGS[activeCategory] || activeCategory.toLowerCase().replace(/\s+&\s+|\s+/g, (m) => m.includes("&") ? "-" : "-");
      loadCategory(slug);
    }
  }, [activeCategory, loadCategory]);

  // ── Section data ─────────────────────────────────────────────────────────
  const feed = marketplaceFeed;
  const flashDealsRow  = feed?.flashDeals  ?? [];
  const electronicsRow = feed?.electronics ?? [];
  const fashionRow     = feed?.fashion     ?? [];
  const beautyRow      = feed?.beauty      ?? [];
  const booksRow       = feed?.books       ?? [];
  const toysRow        = feed?.toys        ?? [];
  const toysAvailable  = feed?.toysAvailable ?? false;

  // ── Filtered grid (category view / search) ────────────────────────────────
  let displayProducts: Product[] = [];
  if (activeCategory && activeCategory !== "All") {
    displayProducts = categoryProducts.length > 0
      ? categoryProducts
      : products.filter(p => p.category === activeCategory || p.category === activeCategory.replace(/ & /g, " & "));
  } else {
    displayProducts = [...products];
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    displayProducts = displayProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q)
    );
  }
  if (sortBy === "price-low") displayProducts.sort((a, b) => a.livePrice - b.livePrice);
  else if (sortBy === "price-high") displayProducts.sort((a, b) => b.livePrice - a.livePrice);

  const isSearchOrFilter = !!(searchQuery || (activeCategory && activeCategory !== "All"));
  const showLiveBanner   = !apiError && feedSource === "live"   && !isSearchOrFilter;
  const showCachedBanner = !apiError && feedSource === "cached" && !isSearchOrFilter;
  const isFiltering      = categoryLoading || (!categoryProducts.length && activeCategory !== "All" && loading);

  return (
    <div className="animate-fade-in min-h-screen bg-background">
      {/* API error */}
      {apiError && !errorDismissed && (
        <div className="flex items-center justify-between gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-sm text-amber-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>Showing local catalog — Live marketplace unavailable. Prices from last known data.</span>
          </div>
          <button onClick={() => setErrorDismissed(true)}><X size={14} /></button>
        </div>
      )}

      {showLiveBanner && (
        <div className="bg-accent/5 border-b border-accent/10 px-4 py-1.5 text-xs text-accent/80 text-center">
          🛍️ Live marketplace — Amazon + Flipkart · Cache refresh in&nbsp;
          <span className="font-mono font-bold">{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}</span>
        </div>
      )}
      {showCachedBanner && (
        <div className="bg-blue-500/5 border-b border-blue-500/10 px-4 py-1.5 text-xs text-blue-400/80 text-center">
          📦 Showing recently cached marketplace data — results may be a few minutes old
        </div>
      )}

      {!isSearchOrFilter && <HeroBanner countdown={countdown} />}

      <div className="container py-6 space-y-10" id="products">

        {/* Category / Search view */}
        {isSearchOrFilter ? (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <SlidersHorizontal size={15} />
                <span>
                  {isFiltering ? "Loading…" : `${displayProducts.length} results`}
                  {searchQuery && ` for "${searchQuery}"`}
                  {activeCategory && activeCategory !== "All" && ` in ${activeCategory}`}
                </span>
              </div>
              <select
                value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-accent"
              >
                <option value="relevance">Best Match</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
              </select>
            </div>
            {isFiltering ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : displayProducts.length === 0 ? (
              activeCategory === 'Toys' ? (
                /* Toys-specific empty state */
                <div className="flex flex-col items-center justify-center py-28 space-y-4">
                  <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center space-y-4 max-w-sm mx-auto">
                    <Gamepad2 size={52} className="mx-auto text-purple-400/60" />
                    <h3 className="text-lg font-bold text-foreground">No toys available right now</h3>
                    <p className="text-sm text-muted-foreground">Our toy catalog is refreshing. Try another category or search for a specific toy.</p>
                    <div className="flex gap-2 justify-center flex-wrap pt-1">
                      <button onClick={() => { loadCategory('electronics'); _onCategoryChange?.('Electronics'); }}
                        className="text-xs px-3 py-1.5 rounded-full border border-accent/40 text-accent hover:bg-accent/10 transition-colors">
                        Browse Electronics
                      </button>
                      <button onClick={() => { loadCategory('sports'); _onCategoryChange?.('Sports'); }}
                        className="text-xs px-3 py-1.5 rounded-full border border-accent/40 text-accent hover:bg-accent/10 transition-colors">
                        Browse Sports
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Generic empty state */
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <SearchX size={64} className="text-muted-foreground/30" />
                  <h3 className="text-lg font-semibold text-foreground">No products found in {activeCategory}</h3>
                  <p className="text-muted-foreground text-sm">Try a different category or search for something specific</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* ── 5 rows max on home ── */}

            {/* 1. Flash Deals */}
            <ProductRow
              title="⚡ Flash Deals"
              products={flashDealsRow}
              loading={loading && !flashDealsRow.length}
              sourceHint="mix"
              icon={<span className="relative flex h-2.5 w-2.5 flex-shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75"/><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"/></span>}
            />

            {/* 2. Electronics */}
            <ProductRow
              title="📱 Electronics"
              products={electronicsRow}
              loading={loading && !electronicsRow.length}
              sourceHint="amazon"
              icon={<Smartphone size={18} className="text-blue-400 flex-shrink-0" />}
            />

            {/* 3. Fashion */}
            <ProductRow
              title="👗 Fashion & Footwear"
              products={fashionRow}
              loading={loading && !fashionRow.length}
              sourceHint="flipkart"
              icon={<Shirt size={18} className="text-pink-400 flex-shrink-0" />}
            />

            {/* 4. Beauty */}
            <ProductRow
              title="✨ Beauty & Skincare"
              products={beautyRow}
              loading={loading && !beautyRow.length}
              sourceHint="flipkart"
              icon={<Sparkles size={18} className="text-rose-400 flex-shrink-0" />}
            />

            {/* 5. Books */}
            <ProductRow
              title="📚 Books"
              products={booksRow}
              loading={loading && !booksRow.length}
              sourceHint="amazon"
              icon={<BookOpen size={18} className="text-purple-400 flex-shrink-0" />}
            />

            {/* 6. Toys — only when toysAvailable === true AND >= 4 products */}
            {toysAvailable && toysRow.length >= 4 && (
              <ProductRow
                title="🎮 Toys & Games"
                products={toysRow}
                loading={loading && !toysRow.length}
                sourceHint="mix"
                icon={<Gamepad2 size={18} className="text-violet-400 flex-shrink-0" />}
              />
            )}

            {/* Browse more hint */}
            <div className="rounded-xl border border-border/50 bg-card/50 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-foreground">Browse more categories</p>
                <p className="text-xs text-muted-foreground mt-0.5">Home & Kitchen, Sports, and more — use the category bar above</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["Home & Kitchen", "Sports", "Electronics", "Beauty"].map(cat => (
                  <button key={cat}
                    onClick={() => loadCategory(CATEGORY_SLUGS[cat] || cat.toLowerCase())}
                    className="text-xs px-3 py-1.5 rounded-full border border-accent/40 text-accent hover:bg-accent/10 transition-colors">
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* All Products grid */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                  <TrendingUp size={18} className="text-accent" /> All Products
                  <span className="text-sm font-normal text-muted-foreground">({products.length})</span>
                </h2>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="rounded-lg border border-input bg-card px-3 py-1.5 text-xs text-foreground">
                  <option value="relevance">Best Match</option>
                  <option value="price-low">Price: Low → High</option>
                  <option value="price-high">Price: High → Low</option>
                </select>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {displayProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
