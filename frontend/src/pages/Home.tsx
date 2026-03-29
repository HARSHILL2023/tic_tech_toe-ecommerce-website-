import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Zap, ShoppingCart, ChevronLeft, ChevronRight, SlidersHorizontal, SearchX } from "lucide-react";
import { useProducts } from "@/contexts/ProductContext";
import { useCart } from "@/contexts/CartContext";
import ProductCard from "@/components/ProductCard";

interface HomeProps {
  searchQuery: string;
  activeCategory: string;
}

export default function Home({ searchQuery, activeCategory }: HomeProps) {
  const { products } = useProducts();
  const { addToCart } = useCart();
  const [sortBy, setSortBy] = useState("relevance");
  const [countdown, setCountdown] = useState(14 * 60 + 32);

  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => (c <= 0 ? 45 * 60 : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  const flashDeals = useMemo(() => products.filter((p) => p.discount >= 25).slice(0, 8), [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== "All") list = list.filter((p) => p.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "price-low": return [...list].sort((a, b) => a.livePrice - b.livePrice);
      case "price-high": return [...list].sort((a, b) => b.livePrice - a.livePrice);
      case "trending": return [...list].sort((a, b) => b.reviewCount - a.reviewCount);
      case "new": return [...list].reverse();
      default: return list;
    }
  }, [products, activeCategory, searchQuery, sortBy]);

  const flashRef = { current: null as HTMLDivElement | null };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent/20 py-16 md:py-24">
        <div className="container text-center space-y-4 relative z-10">
          <div className="flex items-center justify-center gap-2">
            <Zap size={32} className="text-accent" />
            <h1 className="text-3xl md:text-5xl font-extrabold text-primary-foreground">
              Prices Change in Real Time
            </h1>
          </div>
          <p className="text-primary-foreground/80 text-lg">Get the best deal before someone else does</p>
          <div className="flex items-center justify-center gap-2 text-primary-foreground/70 text-sm">
            <span>Deal refreshes in:</span>
            <span className="font-mono text-lg font-bold text-accent bg-background/10 rounded px-2 py-1">
              00:{mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
            </span>
          </div>
          <Link
            to="#products"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-3 text-accent-foreground font-bold text-lg transition-transform hover:scale-105"
          >
            <ShoppingCart size={20} /> Shop Now
          </Link>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--accent)/0.15),transparent_50%)]" />
      </section>

      <div className="container py-8 space-y-10">
        {/* Flash Deals */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-accent" />
              <h2 className="text-lg font-bold text-foreground">Flash Deals — Prices Updating Live</h2>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => flashRef.current?.scrollBy({ left: -300, behavior: "smooth" })} className="rounded-full border border-border p-1 text-muted-foreground hover:text-accent">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => flashRef.current?.scrollBy({ left: 300, behavior: "smooth" })} className="rounded-full border border-border p-1 text-muted-foreground hover:text-accent">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div ref={(el) => { flashRef.current = el; }} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {flashDeals.map((p) => (
              <div key={p.id} className="min-w-[200px] max-w-[200px]">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>

        {/* Product Grid */}
        <section id="products" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SlidersHorizontal size={16} />
              <span>Showing {filtered.length} products{searchQuery && ` for "${searchQuery}"`}</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-accent"
            >
              <option value="relevance">Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="trending">Trending</option>
              <option value="new">New Arrivals</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <SearchX size={72} className="text-muted-foreground/40" />
              <h3 className="text-xl font-semibold text-foreground">No products found{searchQuery && ` for "${searchQuery}"`}</h3>
              <p className="text-muted-foreground text-sm">Try different keywords or browse categories</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
