import { Router } from 'express';
import Event from '../models/Event.js';
import Product from '../models/Product.js';
import Session from '../models/Session.js';
import { redisLPush, redisSet, redisGet } from '../config/redis.js';

const router = Router();

// ── Engagement score weights ─────────────────────────────────────────────────
const ENGAGEMENT_WEIGHTS = {
  page_view: 1,
  search: 2,
  wishlist_add: 2,
  add_to_cart: 3,
  purchase: 5,
  remove_from_cart: 0,
};

// ── User segment from session data ──────────────────────────────────────────
function computeSegment(session) {
  const eng = session.engagementScore || 0;
  const intent = session.purchaseIntentScore || 0;
  const affinity = session.categoryAffinity || {};
  const electronicsAffinity = affinity instanceof Map
    ? (affinity.get('Electronics') || 0)
    : (affinity['Electronics'] || 0);

  if (eng > 15 || electronicsAffinity > 5) return 'premium_intent';
  if (intent < 0.2 && eng < 5) return 'value_seeker';
  return 'standard';
}

// POST /api/track
router.post('/', async (req, res, next) => {
  try {
    const {
      eventType,
      productId,
      sessionId = 'anonymous',
      userId,
      metadata = {},
      device,
      city,
    } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'BadRequest', message: 'eventType is required' });
    }

    // Save event
    await Event.create({
      sessionId,
      userId,
      eventType,
      productId: productId || null,
      metadata,
      device: device || metadata.device || 'Unknown',
      city: city || metadata.city || 'Unknown',
    });

    // Update product counters
    if (productId) {
      if (eventType === 'add_to_cart') {
        await Product.findOneAndUpdate({ id: productId }, { $inc: { cartAddCount: 1 } });
      } else if (eventType === 'purchase') {
        await Product.findOneAndUpdate(
          { id: productId },
          { $inc: { purchaseCount: 1, stock: -1 } }
        );
      } else if (eventType === 'page_view') {
        await Product.findOneAndUpdate({ id: productId }, { $inc: { viewCount: 1 } });
        // Track in Redis for recommendations
        if (sessionId !== 'anonymous') {
          await redisLPush(`viewed:${sessionId}`, String(productId));
        }
      }
    }

    // ── Update session with analytics ─────────────────────────────────────────
    if (sessionId !== 'anonymous') {
      // Fetch current session for category affinity update
      const session = await Session.findOne({ sessionId }).lean();
      const currentAffinity = session?.categoryAffinity ? Object.fromEntries(
        session.categoryAffinity instanceof Map
          ? session.categoryAffinity
          : Object.entries(session.categoryAffinity)
      ) : {};

      // Derive category from product if possible
      const productCategory = metadata.category || null;
      if (productCategory) {
        currentAffinity[productCategory] = (currentAffinity[productCategory] || 0) + 1;
      }

      // Compute new engagement score increment
      const engDelta = ENGAGEMENT_WEIGHTS[eventType] || 0;

      // Compute purchase intent from aggregated event counts
      const eventCounts = await Event.aggregate([
        { $match: { sessionId } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]);
      const counts = {};
      eventCounts.forEach(e => { counts[e._id] = e.count; });
      const rawIntent =
        (counts['add_to_cart'] || 0) * 0.30 +
        (counts['wishlist_add'] || 0) * 0.15 +
        (counts['page_view'] || 0) * 0.03 +
        (counts['purchase'] || 0) * 0.50;
      const purchaseIntentScore = Math.min(1.0, rawIntent);

      // Compute total engagement score
      const totalEngagement = (session?.engagementScore || 0) + engDelta;

      const sessionUpdate = {
        lastSeen: new Date(),
        isActive: true,
        engagementScore: totalEngagement,
        categoryAffinity: currentAffinity,
        purchaseIntentScore,
        ...(userId && { userId }),
      };

      const updatedSession = await Session.findOneAndUpdate(
        { sessionId },
        sessionUpdate,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Compute and persist user segment
      const userSegment = computeSegment({ ...updatedSession.toObject(), categoryAffinity: currentAffinity });
      await Session.findOneAndUpdate({ sessionId }, { userSegment });

      // Mirror engagement score to Redis for fast reads
      await redisSet(`sess:eng:${sessionId}`, String(totalEngagement), 60 * 30); // 30 min TTL
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
