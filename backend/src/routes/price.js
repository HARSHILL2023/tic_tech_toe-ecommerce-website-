import { Router } from 'express';
import Product from '../models/Product.js';
import PriceHistory from '../models/PriceHistory.js';
import Session from '../models/Session.js';
import { calculateWithRedis } from '../services/pricingEngine.js';
import { redisGet, redisSet, redisIncr, redisExpire } from '../config/redis.js';

const router = Router();

// GET /api/price?product_id=&session_id=
router.get('/', async (req, res, next) => {
  try {
    const productId = parseInt(req.query.product_id, 10);
    const sessionId = req.query.session_id || 'anonymous';

    if (!productId) {
      return res.status(400).json({ error: 'BadRequest', message: 'product_id is required' });
    }

    const product = await Product.findOne({ id: productId }).lean();
    if (!product) {
      return res.status(404).json({ error: 'NotFound', message: 'Product not found' });
    }

    // Check Redis cache
    const cacheKey = `price:${productId}`;
    const cached = await redisGet(cacheKey);
    let priceData;
    let priceFlash = false;

    // Get session data for A/B variant
    const session = await Session.findOne({ sessionId }).lean();
    const sessionData = { abVariant: session?.abVariant || 'control' };

    if (cached) {
      const parsedCache = JSON.parse(cached);
      const freshCalc = await calculateWithRedis(product, sessionData);
      priceFlash = freshCalc.price !== parsedCache.price;
      priceData = parsedCache;
    } else {
      // Cache miss → run pricing engine
      priceData = await calculateWithRedis(product, sessionData);

      await redisSet(cacheKey, JSON.stringify({
        price: priceData.price,
        reason: priceData.reason,
        discount: priceData.discount,
        lastUpdated: new Date().toISOString(),
      }), 30); // 30 second TTL
    }

    // Increment view count
    await Product.findOneAndUpdate({ id: productId }, { $inc: { viewCount: 1 } });

    // Increment 15-min view counter in Redis
    const viewKey = `views:15m:${productId}`;
    await redisIncr(viewKey);
    await redisExpire(viewKey, 15 * 60); // 15 min TTL

    // Save PriceHistory
    await PriceHistory.create({
      productId,
      price: priceData.price,
      reason: priceData.reason,
    });

    // Update session lastSeen
    if (sessionId !== 'anonymous') {
      await Session.findOneAndUpdate(
        { sessionId },
        { lastSeen: new Date(), isActive: true },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    res.json({
      price: priceData.price,
      originalPrice: product.mrp,
      reason: priceData.reason,
      discount: priceData.discount,
      lastUpdated: priceData.lastUpdated || new Date().toISOString(),
      priceFlash,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
