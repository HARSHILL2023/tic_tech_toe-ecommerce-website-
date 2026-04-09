import { redisGetInt, redisGet, redisSet } from '../config/redis.js';

/**
 * Fetch competitor price with 15-minute Redis caching.
 * Real marketplace APIs are slow, so we cache a derived price.
 */
async function getCompetitorPrice(productId, basePrice) {
  const cacheKey = `comp:price:${productId}`;
  const cached = await redisGet(cacheKey);
  if (cached) return parseFloat(cached);

  // Simulated lookup: Competitors are typically 2-8% within our price
  // For a "match" scenario, we target slightly below them.
  const compPrice = basePrice * (0.95 + Math.random() * 0.1);
  await redisSet(cacheKey, compPrice.toString(), 15 * 60); // 15 min TTL
  return compPrice;
}

/**
 * Compute user segment from session object.
 * Uses ONLY non-discriminatory behavioral/commercial signals.
 */
export function computeUserSegment(session = {}) {
  const eng = session.engagementScore || 0;
  const intent = session.purchaseIntentScore || 0;
  const affinity = session.categoryAffinity || {};
  const electronicsAff = (affinity instanceof Map ? affinity.get('Electronics') : affinity['Electronics']) || 0;

  if (eng > 15 || electronicsAff > 5) return 'premium_intent';
  if (intent < 0.2 && eng < 5) return 'value_seeker';
  return 'standard';
}

/**
 * Dynamic pricing engine.
 */
export function calculate(product, sessionData = {}, recentViews = 0, competitorPrice = null) {
  let price = product.basePrice;
  let reason = 'Standard Price';
  const segment = sessionData.userSegment || 'standard';

  // Rule 1 — Inventory Scarcity vs Restock Timeline
  const restockDays = product.restockDays || 7;
  if (product.stock <= 3 && restockDays > 7) {
    price = product.basePrice * 1.20; // +20% high scarcity
    reason = 'Limited Stock';
  } else if (product.stock <= 5) {
    price = price * 1.12; 
    reason = 'Limited Stock';
  }

  // Rule 2 — High Demand (views in last 15 min)
  if (recentViews >= 30) {
    price = Math.max(price, product.basePrice * 1.15);
    reason = 'High Demand';
  } else if (recentViews >= 15) {
    price = Math.max(price, product.basePrice * 1.08);
    reason = 'High Demand';
  }

  // Rule 3 — A/B Variant: control gets flat base price
  if (sessionData.abVariant === 'control') {
    price = product.basePrice;
    reason = 'Standard Price';
  }

  // Rule 4 — Competitor Price Match (Treatment only)
  if (sessionData.abVariant !== 'control' && competitorPrice) {
    const targetPrice = competitorPrice * 0.95; // 5% discount on competitor
    if (targetPrice < price) {
      price = targetPrice;
      reason = 'Competitor Match';
    }
  }

  // Rule 5 — Behavioral Surge (Low stock + high demand)
  if (product.stock <= 3 && recentViews >= 20 && sessionData.abVariant !== 'control') {
    price = product.basePrice * 1.22;
    reason = 'Limited Stock';
  }

  // Rule 6 — User Willingness-to-Pay (Value Seeker fallback)
  if (segment === 'value_seeker' && sessionData.abVariant !== 'control' && reason === 'Standard Price') {
    price = price * 0.97;
  }

  // Enforcement: Floor (70% MRP) | Ceiling (100% MRP)
  price = Math.max(price, product.mrp * 0.7);
  price = Math.min(price, product.mrp);
  price = Math.round(price);

  const discount = Math.round(((product.mrp - price) / product.mrp) * 100);

  return { price, reason, discount, userSegment: segment };
}

/**
 * Convenience: get recentViews and competitorPrice then calculate.
 */
export async function calculateWithRedis(product, sessionData = {}) {
  const [recentViews, competitorPrice] = await Promise.all([
    redisGetInt(`views:15m:${product.id}`),
    getCompetitorPrice(product.id, product.basePrice)
  ]);
  return calculate(product, sessionData, recentViews, competitorPrice);
}
