import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

interface CountdownBadgeProps {
  stock: number;
}

export default function CountdownBadge({ stock }: CountdownBadgeProps) {
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds

  useEffect(() => {
    if (stock > 5) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [stock]);

  if (stock > 5) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 animate-pulse">
      <Timer size={18} className="text-destructive" />
      <div>
        <p className="text-xs font-bold text-destructive uppercase tracking-wider">
          Critical Stock: {stock} left
        </p>
        <p className="text-xl font-mono font-black text-destructive">
          {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
        </p>
        <p className="text-[10px] text-destructive/80 font-medium">
          Price may surge when timer hits zero
        </p>
      </div>
    </div>
  );
}
