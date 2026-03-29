import { Router } from 'express';
import Event from '../models/Event.js';
import Product from '../models/Product.js';
import Session from '../models/Session.js';
import { redisLPush } from '../config/redis.js';

const router = Router();

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
      device: device || 'Unknown',
      city: city || 'Unknown',
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

    // Update session lastSeen
    if (sessionId !== 'anonymous') {
      await Session.findOneAndUpdate(
        { sessionId },
        { lastSeen: new Date(), isActive: true, ...(userId && { userId }) },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
