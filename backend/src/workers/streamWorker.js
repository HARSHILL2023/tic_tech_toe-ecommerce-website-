import { connectDB } from '../config/db.js';
import { connectRedis, getRedis, redisLPush, redisSet } from '../config/redis.js';
import Product from '../models/Product.js';
import Session from '../models/Session.js';
import Event from '../models/Event.js';
import dotenv from 'dotenv';

dotenv.config(); // looks in CWD (backend/)

const ENGAGEMENT_WEIGHTS = {
  page_view: 1,
  search: 2,
  wishlist_add: 2,
  add_to_cart: 3,
  purchase: 5,
  remove_from_cart: 0,
};

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

async function processEvent(data) {
  const { eventType, productId, sessionId, userId, metadata } = data;

  try {
    // 1. Update product counters (heavy ops moved here)
    if (productId) {
      if (eventType === 'add_to_cart') {
        await Product.findOneAndUpdate({ id: productId }, { $inc: { cartAddCount: 1 } });
      } else if (eventType === 'purchase') {
        await Product.findOneAndUpdate(
          { id: productId },
          { $inc: { purchaseCount: 1, stock: -1 } }
        );
        // Track velocity in Redis (24h window)
        const vKey = `v:purchase:${productId}:${new Date().getHours()}`;
        const redis = getRedis();
        await redis.incr(vKey);
        await redis.expire(vKey, 3600 * 25);
      } else if (eventType === 'page_view') {
        await Product.findOneAndUpdate({ id: productId }, { $inc: { viewCount: 1 } });
        if (sessionId && sessionId !== 'anonymous') {
          await redisLPush(`viewed:${sessionId}`, String(productId));
        }
      }
    }

    // 2. Update session with analytics
    if (sessionId && sessionId !== 'anonymous') {
      const session = await Session.findOne({ sessionId }).lean();
      const currentAffinity = session?.categoryAffinity ? Object.fromEntries(
        session.categoryAffinity instanceof Map
          ? session.categoryAffinity
          : Object.entries(session.categoryAffinity)
      ) : {};

      const productCategory = metadata?.category || null;
      if (productCategory) {
        currentAffinity[productCategory] = (currentAffinity[productCategory] || 0) + 1;
      }

      const engDelta = ENGAGEMENT_WEIGHTS[eventType] || 0;

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

      const totalEngagement = (session?.engagementScore || 0) + engDelta;

      const sessionUpdate = {
        lastSeen: new Date(),
        isActive: true,
        engagementScore: totalEngagement,
        categoryAffinity: currentAffinity,
        purchaseIntentScore,
        deviceType: metadata?.device || 'desktop',
        referralSource: metadata?.referral || 'direct',
        city: metadata?.city || 'Unknown',
        ...(userId && { userId }),
      };

      const updatedSession = await Session.findOneAndUpdate(
        { sessionId },
        sessionUpdate,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const userSegment = computeSegment({ ...updatedSession.toObject(), categoryAffinity: currentAffinity });
      await Session.findOneAndUpdate({ sessionId }, { userSegment });

      await redisSet(`sess:eng:${sessionId}`, String(totalEngagement), 60 * 30);
    }

    // 3. Automated Retraining Trigger (Task 3)
    const redis = getRedis();
    const eventCount = await redis.incr('perf:event_count');
    if (eventCount % 500 === 0) {
      console.log(`[Re-train] Event threshold (${eventCount}) reached. Triggering ML update...`);
      const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      fetch(`${mlUrl}/train`, { method: 'POST' }).catch(err => console.error('ML Retrain failed:', err.message));
    }
  } catch (err) {
    console.error('Worker process error:', err.message);
  }
}

async function startWorker() {
  await connectDB();
  await connectRedis();
  const redis = getRedis();

  console.log('🚀 Clickstream Worker started. Listening for events...');
  let lastId = '$';

  while (true) {
    try {
      const streams = await redis.xread('BLOCK', 5000, 'STREAMS', 'clickstream', lastId);
      if (streams) {
        for (const [stream, messages] of streams) {
          for (const [id, [_, dataStr]] of messages) {
            const data = JSON.parse(dataStr);
            console.log(`Processing ${data.eventType} for session ${data.sessionId}`);
            await processEvent(data);
            lastId = id;
          }
        }
      }
    } catch (err) {
      console.error('Worker loop error:', err.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

startWorker();
