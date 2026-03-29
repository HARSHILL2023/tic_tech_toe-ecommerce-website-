import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Product } from "@/data/products";
import ProductCard from "./ProductCard";

export default function RecommendationRow({ title, products }: { title: string; products: Product[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <div className="flex gap-1">
          <button onClick={() => scroll(-1)} className="rounded-full border border-border p-1 text-muted-foreground hover:text-accent hover:border-accent transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => scroll(1)} className="rounded-full border border-border p-1 text-muted-foreground hover:text-accent hover:border-accent transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div ref={ref} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {products.map((p) => (
          <div key={p.id} className="min-w-[200px] max-w-[200px]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
