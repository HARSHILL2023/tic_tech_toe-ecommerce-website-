import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Star, Heart, GitCompare, Truck, Info, ShoppingCart, PackageCheck } from "lucide-react";
import { useState, useMemo } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import PriceBadge from "@/components/PriceBadge";
import RecommendationRow from "@/components/RecommendationRow";

export default function ProductDetail() {
  const { id } = useParams();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const product = products.find((p) => p.id === Number(id));
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "reviews">("desc");

  const recommendations = useMemo(() => products.filter((p) => p.id !== product?.id).sort(() => Math.random() - 0.5).slice(0, 10), [products, product?.id]);
  const trending = useMemo(() => products.filter((p) => p.category === product?.category && p.id !== product?.id).slice(0, 10), [products, product]);

  if (!product) return (
    <div className="container py-20 text-center">
      <h1 className="text-2xl font-bold text-foreground">Product not found</h1>
      <Link to="/" className="text-accent mt-4 inline-block">Back to Home</Link>
    </div>
  );

  const wishlisted = isWishlisted(product.id);
  const stockPercent = Math.min(100, (product.stock / 50) * 100);

  return (
    <div className="container py-6 space-y-10 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-accent"><ChevronLeft size={14} className="inline" /> Home</Link>
        <span>/</span>
        <span>{product.category}</span>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-lg bg-secondary border border-border">
            <img src={product.images[selectedImage]} alt={product.name} className="h-full w-full object-cover hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="flex gap-2">
            {product.images.map((img, i) => (
              <button key={i} onClick={() => setSelectedImage(i)}
                className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${i === selectedImage ? "border-accent" : "border-border"}`}>
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{product.brand} · SKU: PIQ-{product.id.toString().padStart(4, "0")}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex">{Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16} className={i < Math.floor(product.rating) ? "fill-warning text-warning" : "text-muted-foreground"} />
            ))}</div>
            <span className="text-sm text-muted-foreground">({product.reviewCount.toLocaleString()} reviews)</span>
          </div>

          {/* Price section */}
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-success">₹{product.livePrice.toLocaleString("en-IN")}</span>
              <span className="text-lg text-muted-foreground line-through">₹{product.mrp.toLocaleString("en-IN")}</span>
              <span className="rounded-full bg-destructive px-2.5 py-0.5 text-sm font-bold text-destructive-foreground">{product.discount}% OFF</span>
            </div>

            {/* Price reason box */}
            <div className="rounded-md bg-secondary p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Info size={14} className="text-accent" /> Why this price?
              </div>
              <p className="text-xs text-muted-foreground">
                {product.priceReason === "High Demand" && `${Math.floor(Math.random() * 50 + 20)} people viewed this in the last 15 mins — price adjusted for demand`}
                {product.priceReason === "Limited Stock" && `Only ${product.stock} units remaining — price reflects scarcity`}
                {product.priceReason === "Competitor Match" && "Price matched with competitor listings for best value"}
                {product.priceReason === "Standard Price" && "Regular pricing based on market analysis"}
              </p>
              <PriceBadge reason={product.priceReason} />
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
            <button onClick={() => { for (let i = 0; i < quantity; i++) addToCart(product); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent py-3 text-accent-foreground font-bold text-lg transition-transform hover:scale-[1.02]">
              <ShoppingCart size={20} /> Add to Cart
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => toggleWishlist(product)}
              className={`flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm transition-colors ${wishlisted ? "border-destructive text-destructive" : "border-border text-muted-foreground hover:border-accent hover:text-accent"}`}>
              <Heart size={16} className={wishlisted ? "fill-destructive" : ""} /> {wishlisted ? "Saved" : "Add to Wishlist"}
            </button>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent">
              <GitCompare size={16} /> Compare
            </button>
          </div>

          {/* Delivery & stock */}
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Truck size={16} className="text-success" /> Free delivery by Tomorrow
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <PackageCheck size={16} className="text-accent" /> 7-day return policy
            </div>
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
            {Object.entries(product.specs).map(([k, v]) => (
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
      <RecommendationRow title="Recommended For You" products={recommendations} />
      {trending.length > 0 && <RecommendationRow title={`Trending in ${product.category}`} products={trending} />}
    </div>
  );
}
