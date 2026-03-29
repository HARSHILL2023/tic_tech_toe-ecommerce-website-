import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';
import { runSeed } from './src/data/seed.js';
import Product from './src/models/Product.js';
import PriceHistory from './src/models/PriceHistory.js';
import Session from './src/models/Session.js';
import { calculateWithRedis } from './src/services/pricingEngine.js';
import { redisSet } from './src/config/redis.js';
import { broadcastSSE } from './src/routes/products.js';

const PORT = process.env.PORT || 5000;

async function start() {
  // 1. Connect DB and Redis
  await connectDB();
  await connectRedis();

  // 2. Seed if needed
  await runSeed();

  // 3. Start server
  app.listen(PORT, () => {
    console.log(`🚀 PriceIQ server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // ── Background Job 1: Price Simulation (every 45 seconds) ─────────────────
  setInterval(async () => {
    try {
      const count = await Product.countDocuments();
      if (count === 0) return;

      // Pick 2-3 random products
      const numToUpdate = Math.floor(Math.random() * 2) + 2;
      const allProducts = await Product.find({}).lean();
      const shuffled = allProducts.sort(() => Math.random() - 0.5).slice(0, numToUpdate);

      for (const product of shuffled) {
        const { price, reason, discount } = await calculateWithRedis(product);

        const oldPrice = product.livePrice;

        // Update MongoDB
        await Product.findOneAndUpdate(
          { id: product.id },
          { livePrice: price, discount, priceReason: reason, updatedAt: new Date() }
        );

        // Update Redis cache
        await redisSet(
          `price:${product.id}`,
          JSON.stringify({ price, reason, discount, lastUpdated: new Date().toISOString() }),
          30
        );

        // Save PriceHistory
        await PriceHistory.create({ productId: product.id, price, reason });

        // Broadcast to SSE clients if price changed
        if (price !== oldPrice) {
          broadcastSSE({
            message: `Price updated: ₹${oldPrice.toLocaleString('en-IN')} → ₹${price.toLocaleString('en-IN')} — ${product.name} (${reason})`,
            productId: product.id,
            oldPrice,
            newPrice: price,
            reason,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Price simulation error:', err.message);
    }
  }, 45_000);

  // ── Background Job 2: Active Session Cleanup (every 5 minutes) ─────────────
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000);
      const result = await Session.updateMany(
        { isActive: true, lastSeen: { $lt: cutoff } },
        { isActive: false }
      );
      if (result.modifiedCount > 0) {
        console.log(`🧹 Marked ${result.modifiedCount} sessions inactive`);
      }
    } catch (err) {
      console.error('Session cleanup error:', err.message);
    }
  }, 5 * 60_000);

  // ── Background Job 3: View Counter Flush (every 60 seconds) ──────────────
  // Redis view keys `views:15m:{productId}` auto-expire via TTL (15 min)
  // This job just logs the state for debugging
  setInterval(async () => {
    // Keys auto-expire in Redis — nothing extra needed
    // Could sync to MongoDB here if needed
  }, 60_000);
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
