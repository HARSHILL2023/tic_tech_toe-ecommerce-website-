import { getRedis } from '../config/redis.js';
import Product from '../models/Product.js';

/**
 * Predicts stock-out dates for products based on real-time velocity.
 * Formula: Predicted Days = Current Stock / Daily Purchase Velocity
 */
export async function getInventoryPredictions() {
  const redis = getRedis();
  const products = await Product.find({ stock: { $lte: 50 } }).lean();
  const currentHour = new Date().getHours();

  const predictions = [];

  for (const p of products) {
    // Collect last 24 hour keys
    const keys = [];
    for (let i = 0; i < 24; i++) {
        const h = (currentHour - i + 24) % 24;
        keys.push(`v:purchase:${p.id}:${h}`);
    }
    
    // Mget is more efficient but keys might not exist
    const velocities = await Promise.all(keys.map(k => redis.get(k)));
    const dailyVelocity = velocities.reduce((sum, v) => sum + (parseInt(v) || 0), 0);
    
    // Fallback to long-term average if real-time velocity is 0 but stock is low
    const effectiveVelocity = dailyVelocity || (p.purchaseCount / 30) || 0.1; 

    const daysToStockout = p.stock / effectiveVelocity;
    
    // Confidence based on sample size
    const confidence = dailyVelocity > 5 ? 0.9 : 0.6;

    predictions.push({
      productId: p.id,
      name: p.name,
      currentStock: p.stock,
      dailyVelocity: parseFloat(effectiveVelocity.toFixed(2)),
      daysRemaining: parseFloat(daysToStockout.toFixed(1)),
      restockIn: p.restockDays,
      critical: daysToStockout < p.restockDays,
      confidence
    });
  }

  return predictions.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
