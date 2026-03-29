import { Link } from "react-router-dom";
import { Heart, Trash2, ShoppingCart, ArrowRight, X, Package, Store } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/contexts/ProductContext";
import { trackEvent } from "@/api";
import { toast } from "sonner";
import type { Product } from "@/contexts/ProductContext";

export default function Wishlist() {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { sessionId, userId } = useProducts();

  const handleMoveToCart = (p: Product) => {
    addToCart(p);
    removeFromWishlist(p.id);
    trackEvent("add_to_cart", p.id, sessionId, userId, {
      productName: p.name,
      category: p.category,
      price: p.livePrice,
      source: p.source || "local",
      sourceId: p.sourceId || null,
    });
    toast.success("Moved to cart!");
  };

  const handleRemove = (p: Product) => {
    removeFromWishlist(p.id); // accepts string | number
  };

  if (items.length === 0) {
    return (
      <div className="container py-20 flex flex-col items-center space-y-4 animate-fade-in">
        <Heart size={80} className="text-muted-foreground/40" />
        <h2 className="text-2xl font-bold text-foreground">Your wishlist is empty</h2>
        <p className="text-muted-foreground">Save your favorite products for later</p>
        <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-accent-foreground font-semibold transition-transform hover:scale-105">
          Browse Products <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart size={24} className="text-destructive fill-destructive" />
          <h1 className="text-2xl font-bold text-foreground">My Wishlist</h1>
          <span className="text-muted-foreground">({items.length} items)</span>
        </div>
        <button
          onClick={clearWishlist}
          className="flex items-center gap-1 text-sm text-destructive hover:underline"
        >
          <Trash2 size={14} /> Clear All
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p) => {
          const image = p.images?.[0] || null;
          return (
            <div key={String(p.id)} className="relative rounded-lg border border-border bg-card overflow-hidden group">
              {/* Remove button */}
              <button
                onClick={() => handleRemove(p)}
                className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-destructive transition-colors shadow-sm"
                aria-label="Remove from wishlist"
              >
                <X size={14} />
              </button>

              {/* Discount badge */}
              {p.discount > 0 && (
                <span className="absolute top-2 left-2 z-10 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  -{p.discount}%
                </span>
              )}

              <Link to={`/product/${p.id}`}>
                <div className="aspect-square bg-white overflow-hidden">
                  {image ? (
                    <img
                      src={image}
                      alt={p.name}
                      className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                      <ShoppingCart size={40} />
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-3 space-y-2">
                <Link
                  to={`/product/${p.id}`}
                  className="text-sm font-semibold text-card-foreground line-clamp-2 hover:text-accent transition-colors"
                >
                  {p.name}
                </Link>

                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-success">
                    ₹{p.livePrice.toLocaleString("en-IN")}
                  </span>
                  {p.mrp > p.livePrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      ₹{p.mrp.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {p.source === "amazon" && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Package size={8} /> Amazon
                  </span>
                )}
                {p.source === "flipkart" && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <Store size={8} /> Flipkart
                  </span>
                )}

                <button
                  onClick={() => handleMoveToCart(p)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-md bg-accent py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity active:scale-95"
                >
                  <ShoppingCart size={14} /> Move to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
