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

  const prev24h = new Date(now - 48 * 60 * 60 * 1000);
  const prevPurchaseEvents = await Event.find({
    eventType: 'purchase',
    timestamp: { $gte: prev24h, $lt: since24h },
  }).lean();

  async function calculateRevenue(events) {
    let rev = 0;
    for (const ev of events) {
      if (ev.productId) {
        const product = await Product.findOne({ id: ev.productId }).lean();
        if (product) rev += product.livePrice;
      }
    }
    return rev;
  }

  const totalRevenue = await calculateRevenue(purchaseEvents);
  const prevRevenue = await calculateRevenue(prevPurchaseEvents);
  const revenueChange = prevRevenue > 0 
    ? parseFloat((((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
    : (totalRevenue > 0 ? 100 : 0);

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
  const prevAOV = 
    prevPurchaseEvents.length > 0 ? Math.round(prevRevenue / prevPurchaseEvents.length) : 0;
  const aovChange = prevAOV > 0 
    ? parseFloat((((overallAOV - prevAOV) / prevAOV) * 100).toFixed(1))
    : (overallAOV > 0 ? 100 : 0);

  // ── Engagement & Intent Analytics ─────────────────────────────────────────
  const activeSessions = await Session.find({
    isActive: true,
    lastSeen: { $gte: since5min },
  }).lean();

  const avgEngagementScore = activeSessions.length > 0
    ? parseFloat((activeSessions.reduce((s, sess) => s + (sess.engagementScore || 0), 0) / activeSessions.length).toFixed(2))
    : 0;

  const avgPurchaseIntent = activeSessions.length > 0
    ? parseFloat((activeSessions.reduce((s, sess) => s + (sess.purchaseIntentScore || 0), 0) / activeSessions.length).toFixed(3))
    : 0;

  // Top products by purchase count (last 24h)
  const topProductsAgg = await Event.aggregate([
    { $match: { eventType: 'purchase', timestamp: { $gte: since24h } } },
    { $group: { _id: '$productId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $project: {
        name: '$product.name',
        sales: '$count',
        revenue: { $multiply: ['$count', '$product.livePrice'] },
      },
    },
  ]);
  const topProducts = topProductsAgg;

  // Top categories by affinity across all active sessions
  const catAccum = {};
  activeSessions.forEach(sess => {
    const aff = sess.categoryAffinity || {};
    Object.entries(aff).forEach(([cat, count]) => {
      catAccum[cat] = (catAccum[cat] || 0) + count;
    });
  });
  const topCategoryAffinity = Object.entries(catAccum)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  // ── A/B Statistical Significance (two-proportion z-test) ─────────────────
  function normalCDF(z) {
    // Approximation of the normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    const phi = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
    return z >= 0 ? phi : 1 - phi;
  }

  const nControl = sessionMap['control']?.total || 0;
  const nTreatment = sessionMap['treatment']?.total || 0;
  const p1 = nControl > 0 ? (sessionMap['control']?.purchases || 0) / nControl : 0;
  const p2 = nTreatment > 0 ? (sessionMap['treatment']?.purchases || 0) / nTreatment : 0;
  const nTotal = nControl + nTreatment;
  const pPool = nTotal > 0 ? ((sessionMap['control']?.purchases || 0) + (sessionMap['treatment']?.purchases || 0)) / nTotal : 0;

  let abSignificance = { zScore: null, pValue: null, significant: false, note: 'Need more data (< 30 sessions per variant)' };
  if (nControl >= 10 && nTreatment >= 10 && pPool > 0 && pPool < 1) {
    const se = Math.sqrt(pPool * (1 - pPool) * (1 / nControl + 1 / nTreatment));
    if (se > 0) {
      const zScore = parseFloat(((p2 - p1) / se).toFixed(3));
      const pValue = parseFloat((2 * (1 - normalCDF(Math.abs(zScore)))).toFixed(4));
      const significant = pValue < 0.05;
      abSignificance = {
        zScore,
        pValue,
        significant,
        note: significant
          ? `Statistically significant (p=${pValue}, 95% CI)`
          : `Not yet significant (p=${pValue}) — collect more sessions`,
      };
    }
  }

  // ── Segment Distribution ────────────────────────────────────────────────────
  const allSessions = await Session.find({}).lean();
  const segmentDist = { value_seeker: 0, standard: 0, premium_intent: 0 };
  allSessions.forEach(s => {
    const seg = s.userSegment || 'standard';
    if (segmentDist[seg] !== undefined) segmentDist[seg]++;
    else segmentDist['standard']++;
  });

  return {
    totalRevenue: {
      value: Math.round(totalRevenue),
      change: revenueChange,
    },
    conversionRate,
    avgOrderValue: {
      value: overallAOV,
      byVariant: avgOrderValue,
      change: aovChange,
    },
    activeSessions: activeSessions.length,
    topProducts,
    avgEngagementScore,
    avgPurchaseIntent,
    topCategoryAffinity,
    abSignificance,
    segmentDistribution: segmentDist,
    generatedAt: now.toISOString(),
  };
}

