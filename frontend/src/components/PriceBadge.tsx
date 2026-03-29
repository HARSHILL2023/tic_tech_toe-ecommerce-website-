import { Zap, AlertTriangle, GitCompare } from "lucide-react";
import type { Product } from "@/data/products";

const config: Record<Product["priceReason"], { icon: React.ReactNode; bg: string }> = {
  "High Demand": { icon: <Zap size={10} />, bg: "bg-accent text-accent-foreground" },
  "Limited Stock": { icon: <AlertTriangle size={10} />, bg: "bg-destructive text-destructive-foreground" },
  "Competitor Match": { icon: <GitCompare size={10} />, bg: "bg-primary text-primary-foreground" },
  "Standard Price": { icon: null, bg: "bg-secondary text-secondary-foreground" },
};

export default function PriceBadge({ reason }: { reason: Product["priceReason"] }) {
  const c = config[reason];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.bg}`}>
      {c.icon} {reason}
    </span>
  );
}
