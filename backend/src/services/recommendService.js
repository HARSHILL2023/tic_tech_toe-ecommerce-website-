import Product from '../models/Product.js';
import { redisLRange } from '../config/redis.js';

/**
 * Get 10 recommendations for a product/session.
 * Priority: 1) Same category, 2) Trending, 3) Random fill
 */
export async function getRecommendations(sessionId, productId) {
  const all = await Product.find({}).lean();
  const current = all.find((p) => p.id === productId);

  const exclude = new Set([productId]);
  const result = [];

  // 1) Same category (top 4)
  if (current) {
    const sameCategory = all
      .filter((p) => p.category === current.category && !exclude.has(p.id))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 4);

    sameCategory.forEach((p) => {
      result.push(p);
      exclude.add(p.id);
    });
  }

  // Add recently viewed from Redis
  const viewedRaw = await redisLRange(`viewed:${sessionId}`, 0, 9);
  const viewedIds = viewedRaw.map(Number).filter((id) => !exclude.has(id));
  const viewedProducts = all.filter((p) => viewedIds.includes(p.id));
  viewedProducts.forEach((p) => {
    if (result.length < 10 && !exclude.has(p.id)) {
      result.push(p);
      exclude.add(p.id);
    }
  });

  // 2) Trending (top by viewCount)
  const trending = all
    .filter((p) => !exclude.has(p.id))
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 3);

  trending.forEach((p) => {
    if (result.length < 10) {
      result.push(p);
      exclude.add(p.id);
    }
  });

  // 3) Random fill
  const remaining = all.filter((p) => !exclude.has(p.id)).sort(() => Math.random() - 0.5);
  for (const p of remaining) {
    if (result.length >= 10) break;
    result.push(p);
  }

  return result.slice(0, 10);
}
