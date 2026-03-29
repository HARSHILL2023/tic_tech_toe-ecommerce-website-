const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Core fetch helper ─────────────────────────────────────────────────────────
async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}


// ── 1. Products ───────────────────────────────────────────────────────────────
export async function fetchProducts(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${BASE_URL}/api/products${query ? `?${query}` : ""}`);
}

export async function fetchProduct(id: number | string) {
  // Guard against NaN or invalid IDs
  if (id === undefined || id === null || String(id) === 'undefined' || String(id) === 'NaN') {
    throw new Error(`Invalid product ID: ${id}`);
  }
  return apiFetch(`${BASE_URL}/api/products/${id}`);
}

// ── 2. Live Price ─────────────────────────────────────────────────────────────
export async function fetchPrice(productId: number, sessionId: string) {
  return apiFetch(
    `${BASE_URL}/api/price?product_id=${productId}&session_id=${sessionId}`
  );
}

// ── 3. Event Tracking ────────────────────────────────────────────────────────
export interface TrackEventMeta {
  productName?: string;
  category?: string;
  price?: number;
  asin?: string;
  source?: string;
  query?: string;
  [key: string]: unknown;
}

export async function trackEvent(
  eventType: string,
  productId: string | number | null,
  sessionId: string,
  userId?: string,
  metadata: TrackEventMeta = {}
) {
  try {
    const enriched: TrackEventMeta = {
      ...metadata,
      device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
      city: "India",
    };
    return await apiFetch(`${BASE_URL}/api/track`, {
      method: "POST",
      body: JSON.stringify({ eventType, productId, sessionId, userId, metadata: enriched }),
    });
  } catch {
    return { success: false };
  }
}

// ── 4. Recommendations ───────────────────────────────────────────────────────
export async function fetchRecommendations(sessionId: string, productId?: number) {
  const params = new URLSearchParams({ session_id: sessionId });
  if (productId) params.set("product_id", String(productId));
  return apiFetch(`${BASE_URL}/api/recommend?${params}`);
}

// ── 5. A/B Variant ────────────────────────────────────────────────────────────
export async function fetchABVariant(userId: string) {
  return apiFetch(`${BASE_URL}/api/ab/assign?user_id=${userId}`);
}

// ── 6. Dashboard Metrics ─────────────────────────────────────────────────────
export async function fetchDashboardMetrics() {
  return apiFetch(`${BASE_URL}/api/dashboard/metrics`);
}

export async function fetchFairnessAudit() {
  return apiFetch(`${BASE_URL}/api/dashboard/fairness`);
}

// ── 6b. Home Feed (cached, rate-limit safe) ───────────────────────────────────
export async function fetchHomeFeed() {
  return apiFetch(`${BASE_URL}/api/home-feed`);
}

// ── 6c. Flipkart Search ───────────────────────────────────────────────────────
export async function searchFlipkart(query: string, page = 1) {
  try {
    return await apiFetch(`${BASE_URL}/api/flipkart?q=${encodeURIComponent(query)}&page=${page}`);
  } catch {
    return [];
  }
}

// ── 6d. Unified Marketplace API ───────────────────────────────────────────────
export async function fetchMarketplaceHome() {
  return apiFetch(`${BASE_URL}/api/marketplace/home`);
}

export async function fetchMarketplaceCategory(category: string) {
  // category slug: electronics | fashion | home-kitchen | beauty | books | sports
  return apiFetch(`${BASE_URL}/api/marketplace/category/${encodeURIComponent(category)}`);
}

export async function searchMarketplaceProducts(query: string) {
  try {
    return await apiFetch(`${BASE_URL}/api/marketplace/search?q=${encodeURIComponent(query)}`);
  } catch {
    return [];
  }
}

export async function fetchMarketplaceProduct(id: string) {
  // Works for amz_ and fk_ prefixed IDs
  return apiFetch(`${BASE_URL}/api/marketplace/product/${encodeURIComponent(id)}`);
}

// ── 7. Price History — Marketplace-backed ──────────────────────────────────────────────
export async function fetchMarketplaceHistory() {
  const res = await fetch(`${BASE_URL}/api/dashboard/marketplace-history`);
  if (!res.ok) throw new Error('Failed to fetch marketplace history');
  return res.json();
}

/** @deprecated Use fetchMarketplaceHistory — kept only for legacy callers */
export async function fetchPriceHistory(_productIds?: number[]) {
  return fetchMarketplaceHistory();
}

// ── 8. SSE Live Events ────────────────────────────────────────────────────────
export function connectLiveEvents(
  onMessage: (data: { message: string; timestamp: string }) => void
): EventSource {
  const es = new EventSource(`${BASE_URL}/api/events/live`);
  es.addEventListener("message", (e) => {
    try { onMessage(JSON.parse(e.data)); } catch { /* ignore malformed */ }
  });
  es.onerror = () => {
    // EventSource auto-reconnects — no manual close needed for transient errors
  };
  return es; // caller must call es.close() on unmount
}

// ── 9. Session helpers (deterministic fallbacks) ──────────────────────────────
export function getOrCreateSessionId(): string {
  const key = "priceiq-session-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getOrCreateUserId(): string {
  const key = "priceiq-user-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = "user_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

// ── 10. Local fallbacks ───────────────────────────────────────────────────────
/** @deprecated — dummy data removed; marketplace history is real */
export function generatePriceHistory() { return []; }

export function generateRandomEvent(): string {
  const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune"];
  const items = ["Sony WH-1000XM5", "Apple iPhone 15", "Nike Air Max 270", "Atomic Habits", "boAt Rockerz 450"];
  const p = items[Math.floor(Math.random() * items.length)];
  const templates = [
    `User #${Math.floor(1000 + Math.random() * 9000)} added ${p} to cart`,
    `Price updated: ₹${Math.floor(Math.random() * 50000)} → ₹${Math.floor(Math.random() * 50000)} (High Demand)`,
    `New session started — ${Math.random() > 0.5 ? "Mobile" : "Desktop"}, ${cities[Math.floor(Math.random() * cities.length)]}`,
    `User #${Math.floor(1000 + Math.random() * 9000)} purchased ${p}`,
    `Flash deal triggered: ${p} — ${Math.floor(Math.random() * 30 + 10)}% OFF`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ── Image types ───────────────────────────────────────────────────────────────
export interface ProductImage {
  url: string;
  thumb: string;
  alt: string;
  credit?: string;
  creditLink?: string;
}

// ── 11. Unsplash product images ───────────────────────────────────────────────
export async function fetchProductImages(productId: number): Promise<ProductImage[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/images/product/${productId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.images ?? [];
  } catch {
    return [];
  }
}

// ── 12. Batch image fetch ─────────────────────────────────────────────────────
export async function fetchBatchImages(
  productIds: number[]
): Promise<Record<number, ProductImage[]>> {
  if (productIds.length === 0) return {};
  try {
    const res = await fetch(`${BASE_URL}/api/images/batch?ids=${productIds.join(",")}`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

// ── 13. Deterministic picsum fallback (no API needed) ─────────────────────────
export function getPicsumImage(productId: number, variant = "a"): ProductImage {
  const seed = `piq${productId}${variant}`;
  return {
    url: `https://picsum.photos/seed/${seed}/400/400`,
    thumb: `https://picsum.photos/seed/${seed}/100/100`,
    alt: `Product ${productId}`,
  };
}

// ── 14. Amazon Real-Time Search (via backend proxy → RapidAPI) ────────────────
export async function searchRealProducts(query: string, page = 1) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/search?q=${encodeURIComponent(query)}&page=${page}`
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getRealProduct(asin: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/search/product/${asin}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getRealProductReviews(asin: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/search/reviews/${asin}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
