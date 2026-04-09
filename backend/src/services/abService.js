import { redisGet, redisSet } from '../config/redis.js';
import Session from '../models/Session.js';
import ABAssignment from '../models/ABAssignment.js';

const EXPERIMENTS = ['pricing-v1', 'rec-ml-v1'];

/**
 * Deterministically assign an A/B variant for a userId across multiple experiments.
 * Checks Redis first, then MongoDB, then computes deterministically.
 */
export async function assignVariant(userId, experiment = 'pricing-v1') {
  if (!EXPERIMENTS.includes(experiment)) {
    experiment = 'pricing-v1';
  }

  const cacheKey = `ab:${userId}:${experiment}`;

  // 1. Check Redis Cache
  const cached = await redisGet(cacheKey);
  if (cached) {
    return { variant: cached, from: 'cache' };
  }

  // 2. Check MongoDB Persistent Store
  const persistence = await ABAssignment.findOne({ userId, experiment }).lean();
  if (persistence) {
    await redisSet(cacheKey, persistence.variant, 24 * 60 * 60); // 24h cache
    return { variant: persistence.variant, from: 'db' };
  }

  // 3. Deterministic Hashing (user + salt)
  const salt = experiment;
  const combined = `${userId}:${salt}`;
  const hash = combined.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const variant = hash % 2 === 0 ? 'control' : 'treatment';

  // 4. Persist Assignment
  try {
    await ABAssignment.findOneAndUpdate(
      { userId, experiment },
      { variant, assignedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await redisSet(cacheKey, variant, 24 * 60 * 60);

    // Legacy sync to session for pricing-v1 backwards compatibility
    if (experiment === 'pricing-v1') {
      await Session.findOneAndUpdate(
        { sessionId: userId },
        { abVariant: variant }
      );
    }
  } catch (err) {
    console.error('AB Assignment persistence error:', err.message);
  }

  return { variant, from: 'new_assignment' };
}

/**
 * Get all active experiment assignments for a user.
 */
export async function getAllVariants(userId) {
  const results = {};
  for (const exp of EXPERIMENTS) {
    const { variant } = await assignVariant(userId, exp);
    results[exp] = variant;
  }
  return results;
}
