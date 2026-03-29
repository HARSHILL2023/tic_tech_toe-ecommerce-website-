import React, { createContext, useContext, useState, useCallback } from "react";
import type { Product } from "@/data/products";
import { toast } from "sonner";

export interface CartItem {
  product: Product;
  quantity: number;
  addedPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);
export const useCart = () => useContext(CartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("priceiq-cart") || "[]"); } catch { return []; }
  });

  const save = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem("priceiq-cart", JSON.stringify(newItems));
  };

  const addToCart = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      const next = existing
        ? prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, quantity: 1, addedPrice: product.livePrice }];
      localStorage.setItem("priceiq-cart", JSON.stringify(next));
      return next;
    });
    toast.success(`${product.name} added to cart`);
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.product.id !== productId);
      localStorage.setItem("priceiq-cart", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: number, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    setItems((prev) => {
      const next = prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i);
      localStorage.setItem("priceiq-cart", JSON.stringify(next));
      return next;
    });
  }, [removeFromCart]);

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = items.reduce((s, i) => s + i.product.livePrice * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart: () => save([]), cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};
