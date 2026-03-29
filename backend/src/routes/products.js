import { Router } from 'express';
import Product from '../models/Product.js';
import PriceHistory from '../models/PriceHistory.js';
import Event from '../models/Event.js';
import { redisGet } from '../config/redis.js';

const router = Router();

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const { category, search, sort, inStock } = req.query;

    let query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { brand: regex }, { description: regex }];
    }

    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    let products = await Product.find(query).lean();

    // Apply Redis live prices if available
    products = await Promise.all(
      products.map(async (p) => {
        const cached = await redisGet(`price:${p.id}`);
        if (cached) {
          const cached_data = JSON.parse(cached);
          return { ...p, livePrice: cached_data.price };
        }
        return p;
      })
    );

    // Sort
    if (sort === 'price_asc') {
      products.sort((a, b) => a.livePrice - b.livePrice);
    } else if (sort === 'price_desc') {
      products.sort((a, b) => b.livePrice - a.livePrice);
    } else if (sort === 'trending') {
      products.sort((a, b) => b.viewCount - a.viewCount);
    } else if (sort === 'new') {
      products.sort((a, b) => b.id - a.id);
    }

    res.json(products);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id — handles numeric local IDs and Amazon ASIN strings
router.get('/:id', async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const numId = parseInt(rawId, 10);

    // If id looks like an ASIN (non-numeric, e.g. "B08N5WRWNW") proxy to Amazon search route
    if (isNaN(numId) || rawId.startsWith('amz_') || /^[A-Z0-9]{10}$/.test(rawId)) {
      const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
      const RAPIDAPI_HOST = 'real-time-amazon-data.p.rapidapi.com';
      try {
        const asinToFetch = rawId.startsWith('amz_') ? rawId.replace('amz_', '') : rawId;
        const response = await fetch(
          `https://${RAPIDAPI_HOST}/product-details?asin=${asinToFetch}&country=IN`,
          { headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST } }
        );
        if (!response.ok) throw new Error(`RapidAPI ${response.status}`);
        const data = await response.json();
        const item = data.data || {};
        const livePrice = parseFloat(String(item.product_price || '0').replace(/[^0-9.]/g, '')) || 0;
        const mrp = parseFloat(String(item.product_original_price || '0').replace(/[^0-9.]/g, '')) || livePrice;
        return res.json({
          id: asinToFetch,
          name: item.product_title || '',
          brand: item.brand || (item.product_title || '').split(' ')[0],
          category: item.product_category || 'Electronics',
          mrp, livePrice, basePrice: livePrice,
          rating: parseFloat(item.product_star_rating) || 4.0,
          reviewCount: typeof item.product_num_ratings === 'number' ? item.product_num_ratings : parseInt(String(item.product_num_ratings || '0').replace(/[^0-9]/g, '')) || 0,
          stock: parseInt(item.stock_quantity) || 10,
          images: (item.product_photos?.length ? item.product_photos : [item.product_photo]).filter(Boolean),
          description: Array.isArray(item.about_product) ? item.about_product.join(' ') : (item.product_title || ''),
          specs: item.product_details || {},
          discount: mrp > livePrice ? Math.round(((mrp - livePrice) / mrp) * 100) : 0,
          priceReason: 'Standard Price',
          demandBadge: null,
          source: 'amazon',
          amazonUrl: item.product_url || '',
          asin: asinToFetch,
        });
      } catch (err) {
        return res.status(404).json({ error: 'NotFound', message: 'Amazon product not found' });
      }
    }

    // Local MongoDB product lookup
    const product = await Product.findOne({ id: numId }).lean();
    if (!product) {
      return res.status(404).json({ error: 'NotFound', message: 'Product not found' });
    }

    // Apply Redis live price if available
    const cached = await redisGet(`price:${numId}`);
    if (cached) {
      const cachedData = JSON.parse(cached);
      product.livePrice = cachedData.price;
    }

    // Last 24h price history
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const priceHistory = await PriceHistory.find({
      productId: numId,
      timestamp: { $gte: since24h },
    })
      .sort({ timestamp: 1 })
      .lean();

    res.json({ ...product, priceHistory });
  } catch (err) {
    next(err);
  }
});

// GET /api/price-history?product_ids=1,2,3,4,5
router.get('/price-history/chart', async (req, res, next) => {
  try {
    const rawIds = req.query.product_ids || '1,2,3,4,5';
    const productIds = rawIds.split(',').map(Number).filter(Boolean);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const history = await PriceHistory.find({
      productId: { $in: productIds },
      timestamp: { $gte: since24h },
    })
      .sort({ timestamp: 1 })
      .lean();

    // Group by productId
    const grouped = {};
    productIds.forEach((id) => (grouped[id] = []));
    history.forEach((entry) => {
      if (grouped[entry.productId]) {
        grouped[entry.productId].push({
          price: entry.price,
          reason: entry.reason,
          timestamp: entry.timestamp,
        });
      }
    });

    // Build hourly chart data (24 points)
    const hours = Array.from({ length: 24 }, (_, i) => {
      const d = new Date();
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() - (23 - i));
      return d;
    });

    const products = await Product.find({ id: { $in: productIds } })
      .select('id name livePrice')
      .lean();
    const productMap = {};
    products.forEach((p) => (productMap[p.id] = p));

    const chartData = hours.map((hourDate) => {
      const point = { hour: `${hourDate.getHours()}:00` };
      productIds.forEach((pid) => {
        const p = productMap[pid];
        // Find closest price entry for this hour
        const entries = grouped[pid];
        const match = entries.find(
          (e) => Math.abs(new Date(e.timestamp) - hourDate) < 30 * 60 * 1000
        );
        if (match) {
          point[p ? p.name.split(' ').slice(0, 2).join(' ') : pid] = match.price;
        } else if (p) {
          // Fallback to live price with small random fluctuation
          const fluctuation = 1 + (Math.random() - 0.5) * 0.05;
          point[p.name.split(' ').slice(0, 2).join(' ')] = Math.round(p.livePrice * fluctuation);
        }
      });
      return point;
    });

    res.json({ chartData, grouped });
  } catch (err) {
    next(err);
  }
});

// SSE live events — GET /api/events/live
const sseClients = new Set();

router.get('/events/live', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial heartbeat
  res.write('event: connected\ndata: {"message":"Connected to PriceIQ live feed"}\n\n');

  const interval = setInterval(async () => {
    try {
      const event = await generateLiveEvent();
      res.write(`event: message\ndata: ${JSON.stringify(event)}\n\n`);
    } catch {
      // silent
    }
  }, 3000);

  req.on('close', () => {
    clearInterval(interval);
    sseClients.delete(res);
  });
});

// Export so server.js can broadcast price updates
export function broadcastSSE(data) {
  const payload = `event: message\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  });
}

const indianCities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad'];
const productNames = [
  'Sony WH-1000XM5', 'Samsung 65" 4K QLED TV', 'Apple iPhone 15', 'Nike Air Max 270',
  "Levi's 511 Slim Jeans", 'Instant Pot Duo', 'Dyson V15', 'Adidas Ultraboost 22',
  'Yoga Mat Premium', 'Maybelline Fit Me Foundation', "L'Oreal Revitalift Serum",
  'Atomic Habits', 'The Psychology of Money', 'boAt Rockerz 450', 'Xiaomi Smart Band 8',
  'Puma T-Shirt Pack of 3', 'Prestige Mixer Grinder', 'Boldfit Dumbbell Set',
  'Nykaa Lip Kit', 'Rich Dad Poor Dad',
];

async function generateLiveEvent() {
  // Try to pull real data from MongoDB
  let eventText;

  try {
    const recentEvent = await Event.findOne({}).sort({ timestamp: -1 }).lean();
    const randomProduct = await Product.findOne({
      id: Math.floor(Math.random() * 20) + 1,
    }).lean();

    const templates = [
      () => `User #${Math.floor(1000 + Math.random() * 9000)} added ${randomProduct?.name || productNames[0]} to cart`,
      () => {
        const base = randomProduct?.livePrice || 9999;
        const change = Math.floor(base * 0.05 * Math.random());
        const up = Math.random() > 0.5;
        return `Price updated: ₹${(base + (up ? change : 0)).toLocaleString('en-IN')} → ₹${(base - (up ? 0 : change)).toLocaleString('en-IN')} (${randomProduct?.priceReason || 'High Demand'})`;
      },
      () => {
        const device = Math.random() > 0.5 ? 'Mobile' : 'Desktop';
        const city = indianCities[Math.floor(Math.random() * indianCities.length)];
        return `New session started — ${device}, ${city}`;
      },
      () => `User #${Math.floor(1000 + Math.random() * 9000)} purchased ${randomProduct?.name || productNames[0]}`,
      () => `Flash deal triggered: ${randomProduct?.name || productNames[0]} — ${randomProduct?.discount || 20}% OFF`,
    ];

    eventText = templates[Math.floor(Math.random() * templates.length)]();
  } catch {
    eventText = `New session started — Mobile, Mumbai`;
  }

  return {
    message: eventText,
    timestamp: new Date().toISOString(),
  };
}

export default router;
