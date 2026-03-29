import React, { createContext, useContext, useState, useCallback } from "react";
import type { Product } from "@/contexts/ProductContext";
import { toast } from "sonner";

interface WishlistContextType {
  items: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string | number) => void;
  isWishlisted: (productId: string | number) => boolean;
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

  // Always compare as strings so amz_ IDs and numeric IDs both work
  const isWishlisted = useCallback(
    (id: string | number) => items.some((i) => String(i.id) === String(id)),
    [items]
  );

  const addToWishlist = useCallback((product: Product) => {
    setItems((prev) => {
      if (prev.some((i) => String(i.id) === String(product.id))) return prev;
      const next = [...prev, product];
      localStorage.setItem("priceiq-wishlist", JSON.stringify(next));
      toast.success("Added to wishlist");
      return next;
    });
  }, []);

  const removeFromWishlist = useCallback((id: string | number) => {
    setItems((prev) => {
      const next = prev.filter((i) => String(i.id) !== String(id));
      localStorage.setItem("priceiq-wishlist", JSON.stringify(next));
      toast("Removed from wishlist");
      return next;
    });
  }, []);

  const toggleWishlist = useCallback(
    (product: Product) => {
      if (items.some((i) => String(i.id) === String(product.id))) {
        removeFromWishlist(product.id);
      } else {
        addToWishlist(product);
      }
    },
    [items, addToWishlist, removeFromWishlist]
  );

  return (
    <WishlistContext.Provider value={{
      items, addToWishlist, removeFromWishlist, isWishlisted, toggleWishlist,
      clearWishlist: () => save([]),
    }}>
      {children}
    </WishlistContext.Provider>
  );
};
