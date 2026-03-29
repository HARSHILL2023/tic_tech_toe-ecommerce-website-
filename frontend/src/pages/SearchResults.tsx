import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ShoppingCart, Heart, Star, ExternalLink, Search, Zap, AlertCircle, Package, Store } from "lucide-react";
import { searchMarketplaceProducts, trackEvent } from "@/api";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useProducts } from "@/contexts/ProductContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Product } from "@/contexts/ProductContext";

// ── Skeleton matching ProductCard min-h-[340px] ───────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800 animate-pulse overflow-hidden min-h-[340px]">
      <div className="h-52 bg-gray-700" />
      <div className="p-3 space-y-2">
        <div className="h-2 bg-gray-700 rounded w-1/3" />
        <div className="h-4 bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-700 rounded w-3/4" />
        <div className="h-6 bg-gray-700 rounded w-1/2 mt-2" />
      </div>
    </div>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source?: string }) {
  if (source === "amazon") return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
      <Package size={8} /> Amazon
    </span>
  );
  if (source === "flipkart") return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
      <Store size={8} /> Flipkart
    </span>
  );
  return null;
}

// ── Product card for search results ──────────────────────────────────────────
function SearchProductCard({
  product, onAddToCart, onWishlist, isWishlisted,
}: {
  product: Product;
  onAddToCart: (p: Product) => void;
  onWishlist: (p: Product) => void;
  isWishlisted: boolean;
}) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const image = product.images?.[0];

  return (
    <div
      className="group rounded-xl border border-gray-700/50 bg-gray-800 overflow-hidden hover:shadow-lg hover:border-orange-500/30 hover:-translate-y-1 transition-all duration-200 flex flex-col cursor-pointer min-h-[340px]"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* Image — white bg, object-contain */}
      <div className="relative bg-white h-52 flex items-center justify-center overflow-hidden flex-shrink-0">
        {image && !imgError ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400/40">
            <ShoppingCart size={40} />
            <span className="text-xs">{product.category}</span>
          </div>
        )}

        {/* Discount badge */}
        {product.discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{product.discount}%
          </div>
        )}

        {/* Source badge top-right on image */}
        <div className="absolute top-2 right-2">
          <SourceBadge source={product.source} />
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide truncate">{product.brand}</p>

        <p className="text-sm font-semibold text-white line-clamp-2 leading-snug min-h-[2.5rem] hover:text-orange-400 transition-colors">
          {product.name}
        </p>

        {/* Stars */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={10} className={i < Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "text-gray-600"} />
          ))}
          <span className="text-[10px] text-gray-500 ml-1">({product.reviewCount.toLocaleString("en-IN")})</span>
        </div>

        {/* Price — tabular-nums */}
        <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
          <span className="text-base font-bold text-green-400 tabular-nums">₹{product.livePrice.toLocaleString("en-IN")}</span>
          {product.mrp > product.livePrice && (
            <span className="text-xs text-gray-500 line-through tabular-nums">₹{product.mrp.toLocaleString("en-IN")}</span>
          )}
          {product.discount > 0 && (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0 rounded-full font-semibold">
              {product.discount}% off
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-accent/80 font-medium">
          <Zap size={9} /> PriceIQ Dynamic Pricing
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 pt-0 flex gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onAddToCart(product)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-orange-600 transition-colors active:scale-95"
        >
          <ShoppingCart size={13} /> Add to Cart
        </button>
        <button
          onClick={() => onWishlist(product)}
          className={`w-9 flex items-center justify-center border rounded-lg transition-colors ${
            isWishlisted ? "border-rose-500 text-rose-500" : "border-gray-600 text-gray-400 hover:text-rose-400 hover:border-rose-400"
          }`}
        >
          <Heart size={14} className={isWishlisted ? "fill-rose-500" : ""} />
        </button>
        {product.productUrl && (
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 flex items-center justify-center border border-gray-600 rounded-lg text-gray-400 hover:text-orange-400 hover:border-orange-400 transition-colors"
            title="View on marketplace"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main SearchResults ─────────────────────────────────────────────────────────
export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults]   = useState<Product[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const { addToCart }                                       = useCart();
  const { isWishlisted, toggleWishlist }                    = useWishlist();
  const { sessionId, userId }                               = useProducts();

  // Re-fetch whenever URL ?q= changes (triggered by debounced navigation or Enter key)
  const doSearch = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchMarketplaceProducts(q) as Product[];
      const list = Array.isArray(data) ? data : [];
      setResults(list);
      if (list.length > 0) {
        trackEvent("search", null, sessionId, userId, { query: q, resultCount: list.length });
      }
    } catch {
      setError("Search failed. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, userId]);

  // Re-runs every time `query` changes in the URL
  useEffect(() => {
    doSearch(query);
  }, [query, doSearch]);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    trackEvent("add_to_cart", product.id, sessionId, userId, {
      productName: product.name, category: product.category,
      price: product.livePrice, source: product.source || "local",
      sourceId: product.sourceId,
    });
    toast.success("Added to cart!");
  };

  const handleWishlist = (product: Product) => {
    toggleWishlist(product);
    toast(isWishlisted(product.id) ? "Removed from wishlist" : "Added to wishlist!");
  };

  const popularSearches = ["iPhone 15", "boAt headphones", "laptop", "Samsung TV", "Nike shoes", "yoga mat", "serum", "kurta"];

  // Source breakdown
  const amazonCount   = results.filter(p => p.source === "amazon").length;
  const flipkartCount = results.filter(p => p.source === "flipkart").length;

  return (
    <div className="container py-6 min-h-screen space-y-5">

      {/* ── Result count + source breakdown ── */}
      {query && !loading && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {results.length > 0
                ? `${results.length} results for "${query}"`
                : `No results for "${query}"`}
            </h1>
            {results.length > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1"><Package size={12} className="text-amber-400" /> {amazonCount} Amazon</span>
                <span className="flex items-center gap-1"><Store size={12} className="text-blue-400" /> {flipkartCount} Flipkart</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive">
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* ── Loading skeletons — 8 cards matching ProductCard height ── */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Results grid ── */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {results.map(product => (
            <SearchProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              onWishlist={handleWishlist}
              isWishlisted={isWishlisted(product.id)}
            />
          ))}
        </div>
      )}

      {/* ── No results ── */}
      {!loading && !error && query && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Search size={56} className="text-muted-foreground/30" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">No products found</h2>
            <p className="text-sm text-muted-foreground mt-1">Try different keywords or check spelling</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {popularSearches.map(s => (
              <button key={s} onClick={() => setSearchParams({ q: s, page: "1" })}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty prompt — no query yet ── */}
      {!loading && !query && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Search size={56} className="text-muted-foreground/30" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Search Amazon + Flipkart</h2>
            <p className="text-sm text-muted-foreground mt-1">Unified results with PriceIQ dynamic pricing</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {popularSearches.map(s => (
              <button key={s} onClick={() => setSearchParams({ q: s, page: "1" })}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
