import { products, type Product } from "@/data/products";

export async function trackEvent(eventType: string, productId: number | null, sessionId: string) {
  console.log("Event tracked:", { eventType, productId, sessionId });
  return { success: true };
}

export async function fetchPrice(productId: number, _sessionId: string) {
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  return {
    price: product.livePrice,
    originalPrice: product.mrp,
    reason: product.priceReason,
    discount: product.discount,
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchRecommendations(_sessionId: string, productId?: number): Promise<Product[]> {
  return products
    .filter((p) => p.id !== productId)
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);
}

export async function fetchABVariant(userId: string) {
  const hash = userId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return { variant: hash % 2 === 0 ? "control" : "treatment" };
}

export async function fetchDashboardMetrics() {
  return {
    totalRevenue: { value: 284750, change: 12.4 },
    conversionRate: { control: 3.2, treatment: 4.7 },
    avgOrderValue: { value: 2849, change: 8.1 },
    activeSessions: Math.floor(Math.random() * 200) + 150,
  };
}

const indianCities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"];

export function generateRandomEvent(): string {
  const templates = [
    () => {
      const p = products[Math.floor(Math.random() * products.length)];
      return `User #${Math.floor(1000 + Math.random() * 9000)} added ${p.name} to cart`;
    },
    () => {
      const p = products[Math.floor(Math.random() * products.length)];
      const change = Math.floor(p.livePrice * (Math.random() * 0.1));
      const dir = Math.random() > 0.5;
      return `Price updated: ₹${(p.livePrice + (dir ? change : 0)).toLocaleString("en-IN")} → ₹${(p.livePrice - (dir ? 0 : change)).toLocaleString("en-IN")} (${p.priceReason})`;
    },
    () => {
      const device = Math.random() > 0.5 ? "Mobile" : "Desktop";
      const city = indianCities[Math.floor(Math.random() * indianCities.length)];
      return `New session started — ${device}, ${city}`;
    },
    () => {
      const p = products[Math.floor(Math.random() * products.length)];
      return `User #${Math.floor(1000 + Math.random() * 9000)} purchased ${p.name}`;
    },
    () => {
      const p = products[Math.floor(Math.random() * products.length)];
      return `Flash deal triggered: ${p.name} — ${p.discount}% OFF`;
    },
  ];
  return templates[Math.floor(Math.random() * templates.length)]();
}

export function generatePriceHistory() {
  const topProducts = products.slice(0, 5);
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  return hours.map((hour) => {
    const point: Record<string, string | number> = { hour };
    topProducts.forEach((p) => {
      const fluctuation = 1 + (Math.random() - 0.5) * 0.3;
      point[p.name.split(" ").slice(0, 2).join(" ")] = Math.round(p.livePrice * fluctuation);
    });
    return point;
  });
}
