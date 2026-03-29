import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { products as initialProducts, type Product } from "@/data/products";
import { toast } from "sonner";

interface ProductContextType {
  products: Product[];
}

const ProductContext = createContext<ProductContextType>({ products: initialProducts });
export const useProducts = () => useContext(ProductContext);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const productsRef = useRef(products);
  productsRef.current = products;

  const simulatePriceChange = useCallback(() => {
    const indices = Array.from({ length: Math.random() > 0.5 ? 2 : 1 }, () =>
      Math.floor(Math.random() * productsRef.current.length)
    );
    setProducts((prev) =>
      prev.map((p, i) => {
        if (!indices.includes(i)) return p;
        const change = 1 + (Math.random() - 0.5) * 0.15;
        const newPrice = Math.round(p.mrp * (1 - p.discount / 100) * change);
        const clampedPrice = Math.max(Math.round(p.mrp * 0.5), Math.min(p.mrp, newPrice));
        const newDiscount = Math.round(((p.mrp - clampedPrice) / p.mrp) * 100);
        const dropped = clampedPrice < p.livePrice;

        if (clampedPrice !== p.livePrice) {
          const icon = dropped ? "↓" : "↑";
          toast(
            `${icon} ${p.name}: ₹${p.livePrice.toLocaleString("en-IN")} → ₹${clampedPrice.toLocaleString("en-IN")}`,
            { duration: dropped ? 5000 : 4000 }
          );
        }

        const reasons: Product["priceReason"][] = ["High Demand", "Limited Stock", "Competitor Match", "Standard Price"];
        return {
          ...p,
          livePrice: clampedPrice,
          discount: newDiscount,
          priceReason: clampedPrice < p.livePrice ? reasons[Math.floor(Math.random() * 2)] : p.priceReason,
        };
      })
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(simulatePriceChange, 45000);
    return () => clearInterval(interval);
  }, [simulatePriceChange]);

  return <ProductContext.Provider value={{ products }}>{children}</ProductContext.Provider>;
};
