import React, { createContext, useContext, useState, useCallback } from "react";
import type { Product } from "@/data/products";
import { toast } from "sonner";

interface WishlistContextType {
  items: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: number) => void;
  isWishlisted: (productId: number) => boolean;
  toggleWishlist: (product: Product) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType>({} as WishlistContextType);
export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Product[]>(() => {
    try { return JSON.parse(localStorage.getItem("priceiq-wishlist") || "[]"); } catch { return []; }
  });

  const save = (next: Product[]) => {
    setItems(next);
    localStorage.setItem("priceiq-wishlist", JSON.stringify(next));
  };

  const isWishlisted = useCallback((id: number) => items.some((i) => i.id === id), [items]);

  const addToWishlist = useCallback((product: Product) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === product.id)) return prev;
      const next = [...prev, product];
      localStorage.setItem("priceiq-wishlist", JSON.stringify(next));
      toast.success(`Added to wishlist`);
      return next;
    });
  }, []);

  const removeFromWishlist = useCallback((id: number) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem("priceiq-wishlist", JSON.stringify(next));
      toast("Removed from wishlist");
      return next;
    });
  }, []);

  const toggleWishlist = useCallback((product: Product) => {
    if (items.some((i) => i.id === product.id)) removeFromWishlist(product.id);
    else addToWishlist(product);
  }, [items, addToWishlist, removeFromWishlist]);

  return (
    <WishlistContext.Provider value={{ items, addToWishlist, removeFromWishlist, isWishlisted, toggleWishlist, clearWishlist: () => save([]) }}>
      {children}
    </WishlistContext.Provider>
  );
};
