import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import PriceBadge from "./PriceBadge";

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  return (
    <div className="group relative rounded-lg border border-border bg-card overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5">
      {/* Wishlist button */}
      <button
        onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur transition-transform hover:scale-110"
      >
        <Heart size={16} className={wishlisted ? "fill-destructive text-destructive animate-scale-pop" : "text-muted-foreground"} />
      </button>

      {/* Discount badge */}
      {product.discount > 0 && (
        <span className="absolute top-2 left-2 z-10 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
          -{product.discount}% OFF
        </span>
      )}

      {/* Image */}
      <Link to={`/product/${product.id}`}>
        <div className="overflow-hidden aspect-square bg-secondary">
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </Link>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-[11px] text-muted-foreground">{product.brand}</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm font-semibold text-card-foreground line-clamp-2 leading-tight hover:text-accent transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <Star size={12} className="fill-warning text-warning" />
          <span className="text-xs text-muted-foreground">{product.rating} ({product.reviewCount.toLocaleString()})</span>
        </div>

        {/* Prices */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-success">₹{product.livePrice.toLocaleString("en-IN")}</span>
          <span className="text-xs text-muted-foreground line-through">₹{product.mrp.toLocaleString("en-IN")}</span>
        </div>

        {/* Price reason badge */}
        <PriceBadge reason={product.priceReason} />

        {/* Demand badge */}
        {product.demandBadge && (
          <p className="text-[11px] font-medium text-warning">{product.demandBadge === "High Demand" ? "High Demand" : `Only ${product.stock} left`}</p>
        )}

        {/* Add to cart */}
        <button
          onClick={() => addToCart(product)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-accent py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
        >
          <ShoppingCart size={14} /> Add to Cart
        </button>
      </div>
    </div>
  );
}
