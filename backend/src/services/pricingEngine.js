import { redisGetInt } from '../config/redis.js';

/**
 * Compute user segment from session object.
 * Uses ONLY non-discriminatory behavioral/commercial signals.
 * Excluded: gender, caste, religion, city, income bracket.
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
 * @param {Object} product  - Mongoose product document (plain object)
 * @param {Object} sessionData - { abVariant, userSegment }
 * @param {Number} recentViews - views in last 15 min from Redis
 * @returns {{ price, reason, discount, userSegment }}
 */
export function calculate(product, sessionData = {}, recentViews = 0) {
  let price = product.basePrice;
  let reason = 'Standard Price';
  const segment = sessionData.userSegment || 'standard';

  // Rule 1 — Limited Stock
  if (product.stock <= 5) {
    price = price * 1.12; // +12% urgency
    reason = 'Limited Stock';
  }

  // Rule 2 — High Demand (views in last 15 min)
  if (recentViews >= 30) {
    price = price * 1.15; // +15% demand surge
    reason = 'High Demand';
  } else if (recentViews >= 15) {
    price = price * 1.08; // +8%
    reason = 'High Demand';
  }

  // Rule 3 — A/B Variant: control gets flat base price
  if (sessionData.abVariant === 'control') {
    price = product.basePrice;
    reason = 'Standard Price';
  }

  // Rule 4 — Competitor Match (every 5th product by id)
  if (product.id % 5 === 0) {
    price = price * 0.95; // -5% competitor match
    reason = 'Competitor Match';
  }

  // Rule 5 — Low stock + high demand = max surge
  if (product.stock <= 3 && recentViews >= 20) {
    price = product.basePrice * 1.22;
    reason = 'Limited Stock';
  }

  // Rule 6 — User Willingness-to-Pay Segment (non-discriminatory behavioral signal)
  if (segment === 'value_seeker' && sessionData.abVariant !== 'control') {
    price = price * 0.97; // -3% for low-engagement / price-sensitive users
    if (reason === 'Standard Price') reason = 'Standard Price';
  }
  // premium_intent: no extra markup — we keep price fair

  // Floor: never below 70% of MRP; Ceiling: never above 100% MRP
  price = Math.max(price, product.mrp * 0.7);
  price = Math.min(price, product.mrp);
  price = Math.round(price);

  const discount = Math.round(((product.mrp - price) / product.mrp) * 100);

  return { price, reason, discount, userSegment: segment };
}

/**
 * Convenience: get recentViews from Redis and calculate price.
 */
export async function calculateWithRedis(product, sessionData = {}) {
  const recentViews = await redisGetInt(`views:15m:${product.id}`);
  return calculate(product, sessionData, recentViews);
}

