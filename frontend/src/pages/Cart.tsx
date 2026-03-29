import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight, Tag, AlertTriangle, Package, Store } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/contexts/ProductContext";
import { fetchRecommendations, trackEvent } from "@/api";
import type { Product } from "@/contexts/ProductContext";
import RecommendationRow from "@/components/RecommendationRow";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Cart() {
  const { items, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const { sessionId, userId } = useProducts();
  const navigate = useNavigate();
  // Track which product IDs had price changes — compare as strings
  const [changedPriceIds, setChangedPriceIds] = useState<Set<string>>(new Set());
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  // Track price changes at add-time vs current price (no extra API call needed for Amazon products)
  useEffect(() => {
    const changed = new Set<string>();
    items.forEach((item) => {
      if (item.addedPrice !== item.product.livePrice) {
        changed.add(String(item.product.id));
      }
    });
    setChangedPriceIds(changed);
  }, [items]);

  // Fetch recommendations for first cart item (local products only)
  useEffect(() => {
    if (items.length === 0) return;
    const firstId = items[0].product.id;
    if (typeof firstId !== 'number') return; // skip Amazon products
    fetchRecommendations(sessionId, firstId)
      .then(setRecommendations)
      .catch(() => {});
  }, [items.length, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalMrp = items.reduce((s, i) => s + i.product.mrp * i.quantity, 0);
  const savings = totalMrp - cartTotal;

  const handleRemove = (productId: string | number) => {
    removeFromCart(productId);
    trackEvent("remove_from_cart", productId, sessionId, userId);
  };

  const handleCheckout = async () => {
    try {
      await Promise.all(
        items.map((item) =>
          trackEvent("purchase", item.product.id, sessionId, userId, {
            quantity: item.quantity,
            price: item.product.livePrice * item.quantity,  // total price for this line
            productName: item.product.name,
            category: item.product.category,
            source: item.product.source || 'local',
            sourceId: item.product.sourceId || null,
          })
        )
      );
    } catch { /* non-blocking */ }
    clearCart();
    toast.success(`Order placed! You saved ₹${savings.toLocaleString("en-IN")} 🎉`);
    navigate("/");
  };

  if (items.length === 0) {
    return (
      <div className="container py-20 flex flex-col items-center space-y-4 animate-fade-in">
        <ShoppingCart size={80} className="text-muted-foreground/40" />
        <h2 className="text-2xl font-bold text-foreground">Your cart is empty</h2>
        <p className="text-muted-foreground">Looks like you haven't added anything yet</p>
        <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-accent-foreground font-semibold transition-transform hover:scale-105">
          Start Shopping <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Shopping Cart ({items.length})</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const priceChanged = changedPriceIds.has(String(item.product.id));
            return (
              <div key={String(item.product.id)} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                <Link to={`/product/${item.product.id}`}>
                  <div className="w-20 h-20 rounded-md overflow-hidden bg-white flex-shrink-0">
                    <img src={item.product.images?.[0] || ''} alt={item.product.name}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                    />
                  </div>
                </Link>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-start gap-2">
                    <Link to={`/product/${item.product.id}`} className="font-semibold text-card-foreground hover:text-accent text-sm flex-1 line-clamp-2">{item.product.name}</Link>
                    {item.product.source === 'amazon' && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                        <Package size={7} /> Amazon
                      </span>
                    )}
                    {item.product.source === 'flipkart' && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
                        <Store size={7} /> Flipkart
                      </span>
                    )}
                  </div>
                  {priceChanged && (
                    <div className="flex items-center gap-1 text-[11px] text-warning">
                      <AlertTriangle size={12} /> Price changed since you added this item
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-success">₹{item.product.livePrice.toLocaleString("en-IN")}</span>
                    <span className="text-xs text-muted-foreground line-through">₹{item.product.mrp.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-border rounded-md">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1.5 text-muted-foreground hover:text-foreground"><Minus size={14} /></button>
                      <span className="px-3 text-sm font-medium text-foreground">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1.5 text-muted-foreground hover:text-foreground"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => handleRemove(item.product.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4 sticky top-24">
            <h3 className="font-bold text-foreground text-lg">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{totalMrp.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-success"><span>Discount</span><span>-₹{savings.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span className="text-success">FREE</span></div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground text-lg">
                <span>Total</span><span>₹{cartTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {savings > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-success/10 p-2 text-sm text-success">
                <Tag size={14} /> You're saving ₹{savings.toLocaleString("en-IN")} today!
              </div>
            )}

            <button onClick={handleCheckout} className="w-full rounded-lg bg-accent py-3 text-accent-foreground font-bold text-lg transition-transform hover:scale-[1.02]">
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>

      {recommendations.length > 0 && <RecommendationRow title="Complete Your Order" products={recommendations} />}
    </div>
  );
}
