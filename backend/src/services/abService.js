import { redisGet, redisSet } from '../config/redis.js';
import Session from '../models/Session.js';

/**
 * Deterministically assign an A/B variant for a userId.
 * Checks Redis first (TTL 7 days), then computes deterministically.
 */
export async function assignVariant(userId) {
  const cacheKey = `ab:${userId}`;

  // Check cache
  const cached = await redisGet(cacheKey);
  if (cached) {
    return { variant: cached, fromCache: true };
  }

  // Deterministic hash
  const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const variant = hash % 2 === 0 ? 'control' : 'treatment';

  // Cache for 7 days
  await redisSet(cacheKey, variant, 7 * 24 * 60 * 60);

  // Upsert session record
  try {
    await Session.findOneAndUpdate(
      { sessionId: userId },
      { abVariant: variant, lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch {
    // non-blocking
  }

  return { variant, fromCache: false };
}
