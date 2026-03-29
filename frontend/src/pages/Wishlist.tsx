import { Link } from "react-router-dom";
import { Heart, Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";

export default function Wishlist() {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="container py-20 flex flex-col items-center space-y-4 animate-fade-in">
        <Heart size={80} className="text-muted-foreground/40" />
        <h2 className="text-2xl font-bold text-foreground">Your wishlist is empty</h2>
        <p className="text-muted-foreground">Save your favorite products for later</p>
        <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-accent-foreground font-semibold">
          Browse Products <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart size={24} className="text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">My Wishlist</h1>
          <span className="text-muted-foreground">({items.length} items)</span>
        </div>
        <button onClick={clearWishlist} className="flex items-center gap-1 text-sm text-destructive hover:underline">
          <Trash2 size={14} /> Clear All
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-card overflow-hidden">
            <Link to={`/product/${p.id}`}>
              <img src={p.images[0]} alt={p.name} className="aspect-square w-full object-cover" loading="lazy" />
            </Link>
            <div className="p-3 space-y-2">
              <Link to={`/product/${p.id}`} className="text-sm font-semibold text-card-foreground line-clamp-2 hover:text-accent">{p.name}</Link>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-success">₹{p.livePrice.toLocaleString("en-IN")}</span>
                <span className="text-xs text-muted-foreground line-through">₹{p.mrp.toLocaleString("en-IN")}</span>
              </div>
              <button
                onClick={() => { addToCart(p); removeFromWishlist(p.id); }}
                className="w-full flex items-center justify-center gap-1.5 rounded-md bg-accent py-2 text-sm font-semibold text-accent-foreground"
              >
                <ShoppingCart size={14} /> Move to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
