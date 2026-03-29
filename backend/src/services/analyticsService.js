import Event from '../models/Event.js';
import Product from '../models/Product.js';
import Session from '../models/Session.js';

/**
 * Compute full dashboard metrics.
 */
export async function getDashboardMetrics() {
  const now = new Date();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since5min = new Date(now - 5 * 60 * 1000);

  // ── Total Revenue (last 24h purchases) ──────────────────────────────────
  const purchaseEvents = await Event.find({
    eventType: 'purchase',
    timestamp: { $gte: since24h },
  }).lean();

  let totalRevenue = 0;
  for (const ev of purchaseEvents) {
    if (ev.productId) {
      const product = await Product.findOne({ id: ev.productId }).lean();
      if (product) {
        totalRevenue += product.livePrice;
      }
    }
  }

  // ── Conversion Rate by AB Variant ──────────────────────────────────────
  const sessions = await Session.find({}).lean();
  const sessionMap = {};
  sessions.forEach((s) => {
    const variant = s.abVariant || 'control';
    if (!sessionMap[variant]) sessionMap[variant] = { total: 0, purchases: 0 };
    sessionMap[variant].total += 1;
  });

  const purchasesByVariant = await Event.aggregate([
    { $match: { eventType: 'purchase', timestamp: { $gte: since24h } } },
    {
      $lookup: {
        from: 'sessions',
        localField: 'sessionId',
        foreignField: 'sessionId',
        as: 'session',
      },
    },
    { $unwind: { path: '$session', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$session.abVariant',
        count: { $sum: 1 },
      },
    },
  ]);

  purchasesByVariant.forEach((r) => {
    const v = r._id || 'control';
    if (sessionMap[v]) sessionMap[v].purchases = r.count;
  });

  const conversionRate = {};
  for (const [variant, data] of Object.entries(sessionMap)) {
    conversionRate[variant] =
      data.total > 0 ? parseFloat(((data.purchases / data.total) * 100).toFixed(2)) : 0;
  }

  // ── Average Order Value by Variant (last 24h) ───────────────────────────
  const aovAgg = await Event.aggregate([
    { $match: { eventType: 'purchase', timestamp: { $gte: since24h } } },
    {
      $lookup: {
        from: 'sessions',
        localField: 'sessionId',
        foreignField: 'sessionId',
        as: 'session',
      },
    },
    { $unwind: { path: '$session', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: 'id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$session.abVariant',
        avgValue: { $avg: '$product.livePrice' },
        total: { $sum: '$product.livePrice' },
        count: { $sum: 1 },
      },
    },
  ]);

  const avgOrderValue = {};
  aovAgg.forEach((r) => {
    avgOrderValue[r._id || 'control'] = Math.round(r.avgValue || 0);
  });

  // Overall AOV
  const overallAOV =
    purchaseEvents.length > 0 ? Math.round(totalRevenue / purchaseEvents.length) : 0;

  // ── Active Sessions ──────────────────────────────────────────────────────
  const activeSessions = await Session.countDocuments({
    isActive: true,
    lastSeen: { $gte: since5min },
  });

  // ── Top 5 Products by purchaseCount ─────────────────────────────────────
  const topProducts = await Product.find({})
    .sort({ purchaseCount: -1 })
    .limit(5)
    .select('id name brand category livePrice purchaseCount viewCount')
    .lean();

  return {
    totalRevenue: {
      value: Math.round(totalRevenue),
      change: purchaseEvents.length > 0 ? 12.4 : 0, // simulated change %
    },
    conversionRate,
    avgOrderValue: {
      value: overallAOV,
      byVariant: avgOrderValue,
      change: 8.1,
    },
    activeSessions,
    topProducts,
    generatedAt: now.toISOString(),
  };
}
