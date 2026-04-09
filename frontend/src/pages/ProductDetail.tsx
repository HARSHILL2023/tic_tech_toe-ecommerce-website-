import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Star, Heart, GitCompare, Truck, Info, ShoppingCart, PackageCheck, Package, Store } from "lucide-react";
import { useState, useEffect } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { fetchProduct, fetchPrice, fetchRecommendations, fetchCategoryRecommendations, trackEvent, fetchProductImages, fetchMarketplaceProduct, type ProductImage } from "@/api";
import type { Product } from "@/contexts/ProductContext";
import PriceBadge from "@/components/PriceBadge";
import CountdownBadge from "@/components/CountdownBadge";
import RecommendationRow from "@/components/RecommendationRow";
import { toast } from "sonner";

function fallbackImages(id: string | number): import("@/api").ProductImage[] {
  const seed = String(id).replace(/[^a-z0-9]/gi, '').substring(0, 8) || 'piq';
  return ["a", "b", "c", "d"].map((v) => ({
    url: `https://picsum.photos/seed/${seed}${v}/400/400`,
    thumb: `https://picsum.photos/seed/${seed}${v}/100/100`,
    alt: `Product ${id}`,
  }));
}

export default function ProductDetail() {
  const { id } = useParams();
  const { sessionId, userId, getProductById } = useProducts();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [livePrice, setLivePrice] = useState<number>(0);
  const [priceReason, setPriceReason] = useState<Product["priceReason"]>("Standard Price");
  const [discount, setDiscount] = useState<number>(0);
  const [priceFlash, setPriceFlash] = useState(false);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "reviews">("desc");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── Fetch product on id change ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    if (id === 'undefined' || id === 'NaN' || id === 'null') { navigate('/'); return; }
    setLoading(true);
    setActiveImage(0);

    const isMarketplace = id.startsWith('amz_') || id.startsWith('fk_');
    const isAmazon      = id.startsWith('amz_');
    const isFlipkart    = id.startsWith('fk_');
    const asin          = isAmazon ? id.replace(/^amz_/, '') : null;
    const source        = isAmazon ? 'amazon' : isFlipkart ? 'flipkart' : 'local';

    // For Flipkart: try context cache first (fastest, no API call)
    if (isFlipkart) {
      const cached = getProductById(id);
      if (cached) {
        setProduct(cached);
        setLivePrice(cached.livePrice);
        setPriceReason(cached.priceReason ?? 'Standard Price');
        setDiscount(cached.discount);
        if (Array.isArray(cached.images) && cached.images.length > 0) {
          setImages(cached.images.map(url => ({ url, thumb: url, alt: cached.name })));
        }
        setLoading(false);
        trackEvent('page_view', id, sessionId, userId, { productId: id, source, productName: cached.name, category: cached.category, price: cached.livePrice });
        return;
      }
    }

    // For marketplace products (amz_ / fk_): use unified marketplace endpoint first
    const marketplaceFetch = isMarketplace
      ? fetchMarketplaceProduct(id).catch(() => null)
      : Promise.resolve(null);

    marketplaceFetch.then(async (mpData) => {
      const data = mpData ?? await fetchProduct(id);
      setProduct(data);
      setLivePrice(data.livePrice ?? 0);
      setPriceReason(data.priceReason ?? 'Standard Price');
      setDiscount(data.discount ?? 0);
      if (isMarketplace && Array.isArray(data.images) && data.images.length > 0) {
        setImages(data.images.map((url: string) => ({ url, thumb: url, alt: data.name })));
      }
    })
    .catch(() => toast.error('Failed to load product.'))
    .finally(() => setLoading(false));

    trackEvent('page_view', id, sessionId, userId, {
      productId: id, asin, source,
      productName: product?.name,
      category: product?.category,
      price: livePrice,
    });
  }, [id, sessionId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch Unsplash images (local products only) ────────────────────────────────
  useEffect(() => {
    if (!product) return;
    if (typeof product.id === 'string') return; // Amazon products set images in the fetch above
    const numId = product.id as number;
    setImages([]);
    fetchProductImages(numId)
      .then((imgs) => {
        setImages(imgs.length >= 4 ? imgs : [...imgs, ...fallbackImages(numId)].slice(0, 4));
      })
      .catch(() => setImages(fallbackImages(numId)));
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch live price after product loads (local products only) ───────────────────
  useEffect(() => {
    if (!product || typeof product.id === 'string') return;
    const numId = product.id as number;
    fetchPrice(numId, sessionId)
      .then((data) => {
        if (data.price !== livePrice) {
          setPriceFlash(true);
          setTimeout(() => setPriceFlash(false), 2000);
        }
        setLivePrice(data.price);
        setPriceReason(data.reason);
        setDiscount(data.discount);
      })
      .catch(() => {});
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll live price every 30s (local products only) ──────────────────────────────
  useEffect(() => {
    if (!product || typeof product.id === 'string') return;
    const numId = product.id as number;
    const interval = setInterval(() => {
      fetchPrice(numId, sessionId)
        .then((data) => {
          if (data.price !== livePrice) {
            setPriceFlash(true);
            setTimeout(() => setPriceFlash(false), 2000);
            if (data.price < livePrice) toast.success(`Price dropped to ₹${data.price.toLocaleString("en-IN")}! 🎉`);
            setLivePrice(data.price);
            setPriceReason(data.reason);
            setDiscount(data.discount);
          }
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [product, livePrice, sessionId]);

  // ── Fetch recommendations (Task 8: Marketplace + Local support) ───────────────────
  useEffect(() => {
    if (!product) return;
    
    // For local products, use standard session-based recs
    if (typeof product.id !== 'string') {
      fetchRecommendations(sessionId, product.id as number)
        .then((data: Product[]) => {
          setRecommendations(data.slice(0, 10));
          setTrending(data.filter((p: Product) => p.category === product.category).slice(0, 10));
        })
        .catch(() => {});
    } else {
      // For marketplace products (Amazon/Flipkart), use category-based fallback
      fetchCategoryRecommendations(product.category)
        .then((data: Product[]) => {
          setRecommendations(data.slice(0, 10));
          setTrending(data.slice(0, 10));
        })
        .catch(() => {});
    }
  }, [product, sessionId]);

  const handleAddToCart = () => {
    if (!product) return;
    const productWithLivePrice = { ...product, livePrice };
    for (let i = 0; i < quantity; i++) addToCart(productWithLivePrice);
    trackEvent("add_to_cart", product.id, sessionId, userId, {
      productName: product.name,
      category: product.category,
      price: livePrice,
      asin: product.asin,
      source: product.source || 'local',
    });
  };

  const handleWishlist = () => {
    if (!product) return;
    toggleWishlist({ ...product, livePrice });
    trackEvent("wishlist_add", product.id, sessionId, userId, {
      productName: product.name,
      category: product.category,
      price: livePrice,
      asin: product.asin,
      source: product.source || 'local',
    });
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container py-6 space-y-6 animate-pulse">
        <div className="h-4 bg-secondary rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-secondary rounded-lg" />
          <div className="space-y-4">
            <div className="h-8 bg-secondary rounded w-3/4" />
            <div className="h-4 bg-secondary rounded w-1/2" />
            <div className="h-24 bg-secondary rounded" />
            <div className="h-12 bg-secondary rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return (
    <div className="container py-20 text-center">
      <h1 className="text-2xl font-bold text-foreground">Product not found</h1>
      <Link to="/" className="text-accent mt-4 inline-block">Back to Home</Link>
    </div>
  );

  const wishlisted = isWishlisted(product.id);
  const stockPercent = Math.min(100, (product.stock / 50) * 100);
  const displayImages = images.length > 0 ? images : fallbackImages(product.id);
  const specsEntries: [string, string][] = product.specs
    ? Object.entries(product.specs as Record<string, string>)
    : [];

  return (
    <div className="container py-6 space-y-10 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-accent"><ChevronLeft size={14} className="inline" /> Home</Link>
        <span>/</span><span>{product.category}</span>
        <span>/</span><span className="text-foreground truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="aspect-square overflow-hidden rounded-xl bg-secondary border border-border relative group">
            <img
              src={displayImages[activeImage]?.url || fallbackImages(product.id)[0].url}
              alt={displayImages[activeImage]?.alt || product.name}
              className="h-full w-full object-cover hover:scale-110 transition-transform duration-500"
              loading="lazy"
              onError={(e) => { e.currentTarget.src = fallbackImages(product.id)[activeImage].url; }}
            />
            {/* Unsplash credit */}
            {displayImages[activeImage]?.credit && (
              <a
                href={displayImages[activeImage].creditLink}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 right-2 text-[9px] text-white/60 hover:text-white bg-black/30 px-1.5 py-0.5 rounded"
              >
                📷 {displayImages[activeImage].credit} / Unsplash
              </a>
            )}
          </div>

          {/* Thumbnail strip — 4 images */}
          <div className="flex gap-2">
            {displayImages.slice(0, 4).map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  i === activeImage
                    ? "border-accent scale-105 shadow-md shadow-accent/20"
                    : "border-border opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={img.thumb || img.url}
                  alt={`${img.alt} thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = fallbackImages(product.id)[i].thumb; }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              {product.brand} · SKU: PIQ-{String(product.id).padStart(4, "0")}
              {product.source === 'amazon' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Package size={8} /> Amazon
                </span>
              )}
              {product.source === 'flipkart' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Store size={8} /> Flipkart
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex">{Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16} className={i < Math.floor(product.rating) ? "fill-warning text-warning" : "text-muted-foreground"} />
            ))}</div>
            <span className="text-sm text-muted-foreground">({product.reviewCount.toLocaleString()} reviews)</span>
          </div>

          {/* Price */}
          {product.stock <= 5 && <CountdownBadge stock={product.stock} />}
          <div className={`space-y-3 rounded-lg border bg-card p-4 transition-all duration-500 ${priceFlash ? "border-accent shadow-lg shadow-accent/20" : "border-border"}`}>
            <div className="flex items-baseline gap-3">
              <span className={`text-3xl font-extrabold transition-colors ${priceFlash ? "text-accent" : "text-success"}`}>
                ₹{livePrice.toLocaleString("en-IN")}
              </span>
              <span className="text-lg text-muted-foreground line-through">₹{product.mrp.toLocaleString("en-IN")}</span>
              <span className="rounded-full bg-destructive px-2.5 py-0.5 text-sm font-bold text-destructive-foreground">{discount}% OFF</span>
            </div>
            {priceFlash && <p className="text-xs font-semibold text-accent animate-pulse">⚡ Price just updated!</p>}

            <div className="rounded-md bg-secondary p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Info size={14} className="text-accent" /> Why this price?
              </div>
              <p className="text-xs text-muted-foreground">
                {priceReason === "High Demand" && "High viewership detected — price adjusted for demand"}
                {priceReason === "Limited Stock" && `Only ${product.stock} units remaining — price reflects scarcity`}
                {priceReason === "Competitor Match" && "Price matched with competitor listings for best value"}
                {priceReason === "Standard Price" && "Regular pricing based on market analysis"}
              </p>
              <PriceBadge reason={priceReason} />
            </div>
            <p className="text-[11px] text-muted-foreground">Price updates in real-time</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-border rounded-md">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 text-muted-foreground hover:text-foreground">-</button>
              <span className="px-3 py-2 text-foreground font-medium">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-2 text-muted-foreground hover:text-foreground">+</button>
            </div>
            <button onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent py-3 text-accent-foreground font-bold text-lg transition-transform hover:scale-[1.02]">
              <ShoppingCart size={20} /> Add to Cart
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={handleWishlist}
              className={`flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm transition-colors ${wishlisted ? "border-destructive text-destructive" : "border-border text-muted-foreground hover:border-accent hover:text-accent"}`}>
              <Heart size={16} className={wishlisted ? "fill-destructive" : ""} /> {wishlisted ? "Saved" : "Add to Wishlist"}
            </button>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent">
              <GitCompare size={16} /> Compare
            </button>
          </div>

          {/* Stock & Delivery */}
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm text-foreground"><Truck size={16} className="text-success" /> Free delivery by Tomorrow</div>
            <div className="flex items-center gap-2 text-sm text-foreground"><PackageCheck size={16} className="text-accent" /> 7-day return policy</div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Only {product.stock} left in stock</p>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className={`h-full rounded-full transition-all ${stockPercent < 20 ? "bg-destructive" : "bg-success"}`} style={{ width: `${stockPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-1 border-b border-border">
          {(["desc", "specs", "reviews"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tab === "desc" ? "Description" : tab === "specs" ? "Specifications" : "Reviews"}
            </button>
          ))}
        </div>
        {activeTab === "desc" && <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>}
        {activeTab === "specs" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {specsEntries.map(([k, v]) => (
              <div key={k} className="flex justify-between rounded-md bg-secondary px-3 py-2 text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium text-foreground">{v}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === "reviews" && (
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const pct = star === 5 ? 60 : star === 4 ? 25 : star === 3 ? 10 : star === 2 ? 3 : 2;
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 w-12 text-muted-foreground">{star} <Star size={12} className="fill-warning text-warning" /></span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && <RecommendationRow title="Recommended For You" products={recommendations} />}
      {trending.length > 0 && <RecommendationRow title={`Trending in ${product.category}`} products={trending} />}
    </div>
  );
}
