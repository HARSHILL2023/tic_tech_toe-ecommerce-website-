import { Link } from "react-router-dom";
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight, Tag, AlertTriangle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/contexts/ProductContext";
import RecommendationRow from "@/components/RecommendationRow";
import { useMemo } from "react";

export default function Cart() {
  const { items, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { products } = useProducts();

  const totalMrp = items.reduce((s, i) => s + i.product.mrp * i.quantity, 0);
  const savings = totalMrp - cartTotal;

  const recommendations = useMemo(() => products.sort(() => Math.random() - 0.5).slice(0, 10), [products]);

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
            const priceChanged = item.addedPrice !== item.product.livePrice;
            return (
              <div key={item.product.id} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                <Link to={`/product/${item.product.id}`}>
                  <img src={item.product.images[0]} alt={item.product.name} className="w-20 h-20 rounded-md object-cover" />
                </Link>
                <div className="flex-1 space-y-2">
                  <Link to={`/product/${item.product.id}`} className="font-semibold text-card-foreground hover:text-accent text-sm">{item.product.name}</Link>
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
                    <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-destructive transition-colors">
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

            <button className="w-full rounded-lg bg-accent py-3 text-accent-foreground font-bold text-lg transition-transform hover:scale-[1.02]">
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>

      <RecommendationRow title="Complete Your Order" products={recommendations} />
    </div>
  );
}
