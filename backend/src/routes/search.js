import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '../../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'search-cache.json');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'real-time-amazon-data.p.rapidapi.com';

const headers = {
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
  'Content-Type': 'application/json',
};

// ── In-memory cache (5 min TTL) ───────────────────────────────────────────────
const cache = new Map(); // key: query_page, value: { data, timestamp }
const CACHE_TTL = 5 * 60 * 1000;

// Load persisted cache from disk on startup
let diskCache = {};
try {
  if (fs.existsSync(CACHE_FILE)) {
    diskCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }
} catch { /* ignore parse errors */ }

function saveToDisk() {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(diskCache, null, 2));
  } catch { /* ignore write errors */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parsePrice(val) {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseCount(val) {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return val;
  const n = parseInt(String(val).replace(/[^0-9]/g, ''));
  return isNaN(n) ? 0 : n;
}

function detectCategory(title = '') {
  const t = title.toLowerCase();
  if (t.includes('phone') || t.includes('mobile') || t.includes('iphone') ||
      t.includes('samsung') || t.includes('oppo') || t.includes('vivo') ||
      t.includes('xiaomi') || t.includes('realme') || t.includes('oneplus') ||
      t.includes('laptop') || t.includes('computer') || t.includes('tablet') ||
      t.includes('headphone') || t.includes('earphone') || t.includes('earbuds') ||
      t.includes('speaker') || t.includes('tv') || t.includes('television') ||
      t.includes('camera') || t.includes('charger') || t.includes('powerbank') ||
      t.includes('watch') || t.includes('band') || t.includes('bluetooth') ||
      t.includes('router') || t.includes('mouse') || t.includes('keyboard')) return 'Electronics';
  if (t.includes('shirt') || t.includes('jean') || t.includes('shoe') ||
      t.includes('dress') || t.includes('kurta') || t.includes('saree') ||
      t.includes('sneaker') || t.includes('jacket') || t.includes('hoodie') ||
      t.includes('trouser') || t.includes('pant') || t.includes('top') ||
      t.includes('tshirt') || t.includes('t-shirt') || t.includes('legging') ||
      t.includes('sandal') || t.includes('slipper') || t.includes('cap') ||
      t.includes('bag') || t.includes('wallet') || t.includes('sunglasses')) return 'Fashion';
  if (t.includes('kitchen') || t.includes('cooker') || t.includes('mixer') ||
      t.includes('grinder') || t.includes('pan') || t.includes('pot') ||
      t.includes('iron') || t.includes('vacuum') || t.includes('blender') ||
      t.includes('toaster') || t.includes('kettle') || t.includes('airfryer') ||
      t.includes('washing machine') || t.includes('refrigerator') || t.includes('fan')) return 'Home & Kitchen';
  if (t.includes('book') || t.includes('novel') || t.includes('guide') ||
      t.includes('autobiography') || t.includes('biography')) return 'Books';
  if (t.includes('gym') || t.includes('yoga') || t.includes('fitness') ||
      t.includes('dumbbell') || t.includes('exercise') || t.includes('cricket') ||
      t.includes('football') || t.includes('badminton') || t.includes('cycle') ||
      t.includes('treadmill') || t.includes('protein') || t.includes('whey')) return 'Sports';
  if (t.includes('cream') || t.includes('serum') || t.includes('makeup') ||
      t.includes('lipstick') || t.includes('foundation') || t.includes('perfume') ||
      t.includes('shampoo') || t.includes('moisturizer') || t.includes('sunscreen') ||
      t.includes('face wash') || t.includes('deodorant') || t.includes('body wash')) return 'Beauty';
  return 'Electronics'; // default — most amazon products are electronics
}

function normalizeProduct(item, idx) {
  const asin = item.asin || `noasin_${idx}`;
  const livePrice = parsePrice(item.product_price);
  if (livePrice < 50) return null; // filter invalid/too-cheap items
  const originalPrice = parsePrice(item.product_original_price);
  const mrp = originalPrice > livePrice ? originalPrice : Math.round(livePrice * 1.2);
  const discount = mrp > livePrice ? Math.round(((mrp - livePrice) / mrp) * 100) : 0;

  return {
    id: `amz_${asin}`,          // stable ID — no timestamp
    asin,
    name: (item.product_title || '').substring(0, 100),
    brand: (item.product_title || '').split(' ')[0],
    category: detectCategory(item.product_title),
    mrp,
    livePrice,
    basePrice: livePrice,
    discount,
    rating: parseFloat(item.product_star_rating) || 4.0,
    reviewCount: parseCount(item.product_num_ratings),
    stock: Math.floor(Math.random() * 50) + 5,
    images: [item.product_photo, item.product_photo, item.product_photo, item.product_photo].filter(Boolean),
    description: item.product_title || '',
    priceReason: discount > 20 ? 'High Demand' : 'Standard Price',
    demandBadge: discount > 30 ? 'Hot Deal' : null,
    specs: {},
    source: 'amazon',
    amazonUrl: item.product_url || '',
  };
}

// ── GET /api/search?q=sony+headphones&page=1 ─────────────────────────────────
router.get('/', async (req, res) => {
  const { q, page = 1 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const cacheKey = `${q}_${page}`;

  // 1. Check fresh in-memory cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/search?query=${encodeURIComponent(q)}&page=${page}&country=IN&sort_by=RELEVANCE`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`RapidAPI ${response.status}`);
    const data = await response.json();

    const products = (data.data?.products || [])
      .filter(item => item.product_title && item.product_photo && item.product_price)
      .map(normalizeProduct)
      .filter(Boolean);

    // Save to both caches
    const entry = { data: products, timestamp: Date.now() };
    cache.set(cacheKey, entry);
    diskCache[cacheKey] = entry;
    saveToDisk();

    return res.json(products);
  } catch (error) {
    console.error('Amazon search error:', error.message);

    // 2. Return stale in-memory cache
    if (cache.has(cacheKey)) {
      console.log(`Returning stale memory cache for "${q}"`);
      return res.json(cache.get(cacheKey).data);
    }

    // 3. Return disk cache
    if (diskCache[cacheKey]) {
      console.log(`Returning disk cache for "${q}"`);
      return res.json(diskCache[cacheKey].data);
    }

    // 4. Return empty — no fake data
    return res.json([]);
  }
});

// ── GET /api/search/product/:asin ─────────────────────────────────────────────
router.get('/product/:asin', async (req, res) => {
  const { asin } = req.params;
  const cacheKey = `product_${asin}`;

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) return res.json(cached.data);
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/product-details?asin=${asin}&country=IN`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`RapidAPI ${response.status}`);
    const data = await response.json();
    const item = data.data || {};

    const livePrice = parsePrice(item.product_price);
    const mrp = parsePrice(item.product_original_price) || Math.round(livePrice * 1.2);

    const product = {
      id: `amz_${asin}`,
      asin,
      name: item.product_title || '',
      brand: item.brand || (item.product_title || '').split(' ')[0],
      category: detectCategory(item.product_title),
      mrp, livePrice, basePrice: livePrice,
      rating: parseFloat(item.product_star_rating) || 4.0,
      reviewCount: parseCount(item.product_num_ratings),
      stock: parseCount(item.stock_quantity) || 10,
      images: (item.product_photos?.length ? item.product_photos : [item.product_photo]).filter(Boolean),
      description: Array.isArray(item.about_product) ? item.about_product.join(' ') : (item.product_title || ''),
      specs: item.product_details || {},
      discount: mrp > livePrice ? Math.round(((mrp - livePrice) / mrp) * 100) : 0,
      priceReason: 'Standard Price',
      demandBadge: null,
      source: 'amazon',
      amazonUrl: item.product_url || '',
    };

    cache.set(cacheKey, { data: product, timestamp: Date.now() });
    return res.json(product);
  } catch (error) {
    console.error('Amazon product detail error:', error.message);
    if (cache.has(cacheKey)) return res.json(cache.get(cacheKey).data);
    return res.status(500).json({ error: 'Product fetch failed' });
  }
});

// ── GET /api/search/reviews/:asin ─────────────────────────────────────────────
router.get('/reviews/:asin', async (req, res) => {
  const { asin } = req.params;
  const cacheKey = `reviews_${asin}`;

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) return res.json(cached.data);
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/top-product-reviews?asin=${asin}&country=IN`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`RapidAPI ${response.status}`);
    const data = await response.json();
    const reviews = data.data?.reviews || [];
    cache.set(cacheKey, { data: reviews, timestamp: Date.now() });
    return res.json(reviews);
  } catch (error) {
    console.error('Amazon reviews error:', error.message);
    return res.json([]);
  }
});

export default router;
