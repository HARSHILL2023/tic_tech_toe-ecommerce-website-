import React, { createContext, useContext, useState, useCallback } from "react";
import type { Product } from "@/contexts/ProductContext";
import { toast } from "sonner";

export interface CartItem {
  product: Product;
  quantity: number;
  addedPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string | number) => void;
  updateQuantity: (productId: string | number, qty: number) => void;
  updateCartItemPrice: (productId: string | number, newPrice: number) => void;
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
      const existing = prev.find((i) => String(i.product.id) === String(product.id));
      const next = existing
        ? prev.map((i) => String(i.product.id) === String(product.id) ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, quantity: 1, addedPrice: product.livePrice }];
      localStorage.setItem("priceiq-cart", JSON.stringify(next));
      return next;
    });
    toast.success(`${product.name.substring(0, 40)} added to cart`);
  }, []);

  const removeFromCart = useCallback((productId: string | number) => {
    setItems((prev) => {
      const next = prev.filter((i) => String(i.product.id) !== String(productId));
      localStorage.setItem("priceiq-cart", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string | number, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    setItems((prev) => {
      const next = prev.map((i) => String(i.product.id) === String(productId) ? { ...i, quantity: qty } : i);
      localStorage.setItem("priceiq-cart", JSON.stringify(next));
      return next;
    });
  }, [removeFromCart]);

  const updateCartItemPrice = useCallback((productId: string | number, newPrice: number) => {
    setItems((prev) => {
      const next = prev.map((i) =>
        String(i.product.id) === String(productId)
          ? { ...i, product: { ...i.product, livePrice: newPrice } }
          : i
      );
      localStorage.setItem("priceiq-cart", JSON.stringify(next));
      return next;
    });
  }, []);

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = items.reduce((s, i) => s + i.product.livePrice * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity, updateCartItemPrice,
      clearCart: () => save([]), cartCount, cartTotal,
    }}>
      {children}
    </CartContext.Provider>
  );
};
