import { redisLPush } from '../config/redis.js';

/**
 * Middleware to track request latency and store it in Redis for p99 analysis.
 */
export function latencyMiddleware(req, res, next) {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeInMs = parseFloat(((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2));

    // Store in Redis (keep last 100 samples)
    redisLPush('perf:latency', timeInMs.toString());
  });

  next();
}
