import Redis from 'ioredis';

let redis = null;
let redisAvailable = false;

export function getRedis() {
  return redis;
}

export function isRedisAvailable() {
  return redisAvailable;
}

export async function connectRedis() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const isTLS = url.startsWith('rediss://');

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 8000,
      lazyConnect: true,
      // Required for Upstash (rediss://) — TLS with self-signed certs allowed
      ...(isTLS && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    });

    redis.on('connect', () => {
      redisAvailable = true;
      console.log('✅ Redis connected' + (isTLS ? ' (TLS/Upstash)' : ''));
    });

    redis.on('error', (err) => {
      redisAvailable = false;
      console.warn('⚠️  Redis error (falling back to DB):', err.message);
    });

    redis.on('close', () => {
      redisAvailable = false;
    });

    await redis.connect();
  } catch (err) {
    redisAvailable = false;
    console.warn('⚠️  Redis unavailable, continuing without cache:', err.message);
  }
}

// ── Safe wrappers — all ops are no-ops if Redis is down ──────────────────────

export async function redisGet(key) {
  if (!redisAvailable || !redis) return null;
  try { return await redis.get(key); } catch { return null; }
}

export async function redisSet(key, value, exSeconds) {
  if (!redisAvailable || !redis) return;
  try {
    if (exSeconds) await redis.set(key, value, 'EX', exSeconds);
    else await redis.set(key, value);
  } catch { /* silent */ }
}

export async function redisDel(key) {
  if (!redisAvailable || !redis) return;
  try { await redis.del(key); } catch { /* silent */ }
}

export async function redisLPush(key, value) {
  if (!redisAvailable || !redis) return;
  try {
    await redis.lpush(key, value);
    await redis.ltrim(key, 0, 9); // keep max 10
  } catch { /* silent */ }
}

export async function redisLRange(key, start, stop) {
  if (!redisAvailable || !redis) return [];
  try { return await redis.lrange(key, start, stop); } catch { return []; }
}

export async function redisIncr(key) {
  if (!redisAvailable || !redis) return 0;
  try { return await redis.incr(key); } catch { return 0; }
}

export async function redisExpire(key, seconds) {
  if (!redisAvailable || !redis) return;
  try { await redis.expire(key, seconds); } catch { /* silent */ }
}

export async function redisGetInt(key) {
  const val = await redisGet(key);
  return val ? parseInt(val, 10) : 0;
}
