import Product from '../models/Product.js';
import Event from '../models/Event.js';
import { redisLRange, redisGet, redisSet } from '../config/redis.js';

// ── Time-of-day category preferences for cold-start ─────────────────────────
function getTimeBasedCategories() {
  const hour = new Date().getHours(); // 0-23
  if (hour >= 6 && hour < 10) return ['Books', 'Health', 'Sports'];
  if (hour >= 10 && hour < 14) return ['Electronics', 'Fashion', 'Beauty'];
  if (hour >= 14 && hour < 20) return ['Electronics', 'Home', 'Gaming'];
  return ['Books', 'Home', 'Fashion'];
}

// ── Item-item collaborative filtering via co-view signals ────────────────────
async function getCoviewedProducts(productId) {
  // Try cache first (5 min TTL)
  const cacheKey = `coview:${productId}`;
  try {
    const cached = await redisGet(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  try {
    // Find sessions that viewed this product
    const viewerSessions = await Event.distinct('sessionId', {
      eventType: 'page_view',
      productId: String(productId),
    });

    if (!viewerSessions.length) return [];

    // Find what else those sessions viewed
    const coViewEvents = await Event.find({
      sessionId: { $in: viewerSessions },
      eventType: 'page_view',
      productId: { $ne: null, $ne: String(productId) },
    }).lean();

    // Count co-occurrence frequencies
    const freq = {};
    coViewEvents.forEach(e => {
      const pid = parseInt(e.productId, 10);
      if (pid && !isNaN(pid)) freq[pid] = (freq[pid] || 0) + 1;
    });

    // Sort by frequency, return top 5 IDs
    const topCoviewed = Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => parseInt(id, 10));

    // Cache result for 5 minutes
    try { await redisSet(cacheKey, JSON.stringify(topCoviewed), 300); } catch {}

    return topCoviewed;
  } catch {
    return [];
  }
}

/**
 * Get 10 recommendations for a product/session.
 * Priority order:
 *  1) Co-viewed (collaborative filtering)
 *  2) Same category (content-based)
 *  3) Session recently-viewed history
 *  4) Trending by viewCount
 *  5) Contextual cold-start (time-of-day categories)
 *  6) Random fill
 */
export async function getRecommendations(sessionId, productId, context = {}) {
  const all = await Product.find({}).lean();
  const current = all.find((p) => p.id === productId);
  const exclude = new Set([productId]);
  const result = [];

  // ── 1. Collaborative filtering: co-viewed products ──────────────────────
  if (productId) {
    const coviewedIds = await getCoviewedProducts(productId);
    const coviewedProducts = all.filter(p => coviewedIds.includes(p.id) && !exclude.has(p.id));
    coviewedProducts.forEach(p => {
      result.push({ ...p, _recReason: 'co-viewed' });
      exclude.add(p.id);
    });
  }

  // ── 2. Same category (content-based) ────────────────────────────────────
  if (current) {
    const sameCategory = all
      .filter((p) => p.category === current.category && !exclude.has(p.id))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 4);
    sameCategory.forEach((p) => {
      result.push({ ...p, _recReason: 'same-category' });
      exclude.add(p.id);
    });
  }

  // ── 3. Session recently-viewed history from Redis ────────────────────────
  if (sessionId && sessionId !== 'anonymous') {
    const viewedRaw = await redisLRange(`viewed:${sessionId}`, 0, 9);
    const viewedIds = viewedRaw.map(Number).filter((id) => !exclude.has(id));
    const viewedProducts = all.filter((p) => viewedIds.includes(p.id));
    viewedProducts.forEach((p) => {
      if (result.length < 10 && !exclude.has(p.id)) {
        result.push({ ...p, _recReason: 'session-history' });
        exclude.add(p.id);
      }
    });
  }

  // ── 4. Trending (top by viewCount) ──────────────────────────────────────
  const trending = all
    .filter((p) => !exclude.has(p.id))
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 3);
  trending.forEach((p) => {
    if (result.length < 10) {
      result.push({ ...p, _recReason: 'trending' });
      exclude.add(p.id);
    }
  });

  // ── 5. Contextual cold-start (time-of-day based) ─────────────────────────
  if (result.length < 6) {
    const timeCategories = context.timeCategories || getTimeBasedCategories();
    const contextualProducts = all
      .filter(p => !exclude.has(p.id) && timeCategories.includes(p.category))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 4);
    contextualProducts.forEach(p => {
      if (result.length < 10) {
        result.push({ ...p, _recReason: 'contextual' });
        exclude.add(p.id);
      }
    });
  }

  // ── 6. Random fill ──────────────────────────────────────────────────────
  const remaining = all.filter((p) => !exclude.has(p.id)).sort(() => Math.random() - 0.5);
  for (const p of remaining) {
    if (result.length >= 10) break;
    result.push({ ...p, _recReason: 'random' });
  }

  return result.slice(0, 10);
}
