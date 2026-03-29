import express from 'express';

const router = express.Router();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'real-time-amazon-data.p.rapidapi.com';

const headers = {
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
  'Content-Type': 'application/json',
};

// ── In-memory cache (10 min TTL) ──────────────────────────────────────────────
let homeFeedCache = null;
let homeFeedCachedAt = 0;
const HOME_CACHE_TTL = 10 * 60 * 1000;

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

// ── Smarter category detection ────────────────────────────────────────────────
function detectCategory(title = '') {
  const t = title.toLowerCase();
  if (t.includes('phone') || t.includes('mobile') || t.includes('iphone') ||
      t.includes('samsung') || t.includes('oppo') || t.includes('vivo') ||
      t.includes('xiaomi') || t.includes('realme') || t.includes('oneplus') ||
      t.includes('laptop') || t.includes('computer') || t.includes('tablet') ||
      t.includes('headphone') || t.includes('earphone') || t.includes('earbuds') ||
      t.includes('speaker') || t.includes('tv') || t.includes('television') ||
      t.includes('camera') || t.includes('charger') || t.includes('powerbank') ||
      t.includes('smartwatch') || t.includes('fitness band') || t.includes('bluetooth') ||
      t.includes('router') || t.includes('mouse') || t.includes('keyboard')) return 'Electronics';
  if (t.includes('shirt') || t.includes('jean') || t.includes('shoe') ||
      t.includes('dress') || t.includes('kurta') || t.includes('saree') ||
      t.includes('sneaker') || t.includes('jacket') || t.includes('hoodie') ||
      t.includes('trouser') || t.includes('pant') || t.includes('tshirt') ||
      t.includes('t-shirt') || t.includes('legging') || t.includes('sandal') ||
      t.includes('slipper') || t.includes('cap') || t.includes('wallet') ||
      t.includes('sunglasses') || t.includes('clothing') || t.includes('apparel')) return 'Fashion';
  if (t.includes('kitchen') || t.includes('cooker') || t.includes('mixer') ||
      t.includes('grinder') || t.includes('pan') || t.includes('pot') ||
      t.includes('iron') || t.includes('vacuum') || t.includes('blender') ||
      t.includes('toaster') || t.includes('kettle') || t.includes('airfryer') ||
      t.includes('washing machine') || t.includes('refrigerator') || t.includes('fan') ||
      t.includes('vessel') || t.includes('juicer')) return 'Home & Kitchen';
  if (t.includes('gym') || t.includes('yoga') || t.includes('fitness') ||
      t.includes('dumbbell') || t.includes('exercise') || t.includes('cricket') ||
      t.includes('football') || t.includes('badminton') || t.includes('cycle') ||
      t.includes('treadmill') || t.includes('protein') || t.includes('whey') ||
      t.includes('sports') || t.includes('resistance band')) return 'Sports';
  if (t.includes('cream') || t.includes('serum') || t.includes('makeup') ||
      t.includes('lipstick') || t.includes('foundation') || t.includes('perfume') ||
      t.includes('shampoo') || t.includes('moisturizer') || t.includes('sunscreen') ||
      t.includes('face wash') || t.includes('deodorant') || t.includes('body wash') ||
      t.includes('skincare') || t.includes('conditioner')) return 'Beauty';
  if (t.includes('book') || t.includes('novel') || t.includes('guide') ||
      t.includes('autobiography') || t.includes('biography') || t.includes('edition') ||
      t.includes('author') || t.includes('published') || t.includes('manual')) return 'Books';
  if (t.includes('toy') || t.includes('lego') || t.includes('puzzle') ||
      t.includes('doll') || t.includes('kids game') || t.includes('board game') ||
      t.includes('action figure') || t.includes('remote control car')) return 'Toys';
  return 'Electronics'; // default
}

// ── Category relevance validation ─────────────────────────────────────────────
const CATEGORY_WORDS = {
  Electronics: ['phone', 'laptop', 'tablet', 'headphone', 'earphone', 'earbuds', 'speaker',
    'tv', 'television', 'camera', 'charger', 'powerbank', 'smartwatch', 'bluetooth',
    'router', 'mouse', 'keyboard', 'computer', 'monitor', 'mobile', 'iphone', 'samsung',
    'oneplus', 'realme', 'oppo', 'vivo', 'xiaomi', 'laptop', 'airpod', 'projector'],
  Fashion: ['shirt', 'pant', 'jean', 'dress', 'shoe', 'boot', 'kurta', 'saree', 'top',
    'jacket', 't-shirt', 'tshirt', 'legging', 'sandal', 'slipper', 'sneaker', 'hoodie',
    'cap', 'clothing', 'apparel', 'trouser', 'formal', 'casual', 'wear', 'outfit'],
  'Home & Kitchen': ['cooker', 'mixer', 'grinder', 'blender', 'pan', 'vessel', 'kettle',
    'juicer', 'toaster', 'airfryer', 'kitchen', 'cookware', 'utensil', 'fridge', 'fan'],
  Sports: ['gym', 'dumbbell', 'yoga', 'sport', 'fitness', 'cricket', 'football',
    'exercise', 'treadmill', 'protein', 'whey', 'badminton', 'cycle', 'resistance'],
  Beauty: ['cream', 'serum', 'lipstick', 'foundation', 'shampoo', 'conditioner',
    'moisturizer', 'sunscreen', 'face', 'skin', 'makeup', 'cosmetic', 'deodorant'],
  Books: ['book', 'novel', 'guide', 'manual', 'edition', 'author', 'published', 'story',
    'biography', 'autobiography', 'fiction', 'non-fiction', 'textbook'],
  Toys: ['toy', 'lego', 'puzzle', 'doll', 'game', 'action figure', 'kids', 'children'],
};

// Junk words that should NOT appear in specific categories
const JUNK_FOR_ELECTRONICS = ['towel', 'cloth', 'adapter plug', 'meter', 'wire connector', 'cable connector', 'rope'];

function isRelevantForCategory(title, targetCategory) {
  const t = title.toLowerCase();

  // Reject obvious junk for electronics
  if (targetCategory === 'Electronics') {
    if (JUNK_FOR_ELECTRONICS.some(j => t.includes(j))) return false;
  }
  // Fashion: reject extreme prices (likely not clothing)
  // (price check happens outside this fn — handled in normalizeProduct)

  const words = CATEGORY_WORDS[targetCategory];
  if (!words) return true;
  return words.some(w => t.includes(w));
}

function normalizeProduct(item, idx) {
  const asin = item.asin || `noasin_${idx}`;
  const livePrice = parsePrice(item.product_price);
  if (livePrice < 50) return null;
  const originalPrice = parsePrice(item.product_original_price);
  const mrp = originalPrice > livePrice ? originalPrice : Math.round(livePrice * 1.2);
  const discount = mrp > livePrice ? Math.round(((mrp - livePrice) / mrp) * 100) : 0;

  return {
    id: `amz_${asin}`,
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

async function fetchQuery(query) {
  const url = `https://${RAPIDAPI_HOST}/search?query=${encodeURIComponent(query)}&page=1&country=IN&sort_by=RELEVANCE`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`RapidAPI ${response.status}`);
  const data = await response.json();
  return (data.data?.products || [])
    .filter(item => item.product_title && item.product_photo && item.product_price)
    .map(normalizeProduct)
    .filter(Boolean);
}

// ── GET /api/home-feed ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  if (homeFeedCache && Date.now() - homeFeedCachedAt < HOME_CACHE_TTL) {
    return res.json({ ...homeFeedCache, cached: true });
  }

  try {
    const [flashResults, electronicsResults, fashionResults, smartphoneResults] = await Promise.allSettled([
      fetchQuery('flash sale discount deals india'),
      fetchQuery('smartphone laptop headphones TV India'),       // Electronics specific
      fetchQuery('Nike Adidas Puma shirt jeans dress India'),   // Fashion specific
      fetchQuery('smartphone bestseller mobile India'),
    ]);

    // Electronics: filter to only actual electronic items, reject junk
    const electronics = (electronicsResults.status === 'fulfilled' ? electronicsResults.value : [])
      .filter(p => isRelevantForCategory(p.name, 'Electronics'))
      .slice(0, 12);

    // Fashion: filter to only actual clothing/shoes, price sanity check
    const fashion = (fashionResults.status === 'fulfilled' ? fashionResults.value : [])
      .filter(p => isRelevantForCategory(p.name, 'Fashion') && p.livePrice >= 200 && p.livePrice <= 50000)
      .slice(0, 12);

    // Flash deals: discount >= 10%, any category
    const flashDeals = (flashResults.status === 'fulfilled' ? flashResults.value : [])
      .filter(p => p.discount >= 10)
      .slice(0, 12);

    // Smartphones: filter to only phone-like items
    const smartphones = (smartphoneResults.status === 'fulfilled' ? smartphoneResults.value : [])
      .filter(p => isRelevantForCategory(p.name, 'Electronics'))
      .slice(0, 12);

    // Featured = first 8 unique products mixed from all sections
    const seen = new Set();
    const featured = [];
    for (const p of [...flashDeals, ...electronics, ...fashion, ...smartphones]) {
      if (!seen.has(p.id) && featured.length < 8) {
        seen.add(p.id);
        featured.push(p);
      }
    }

    const feed = { flashDeals, electronics, fashion, smartphones, featured, cached: false };
    homeFeedCache = feed;
    homeFeedCachedAt = Date.now();

    return res.json(feed);
  } catch (error) {
    console.error('Home feed error:', error.message);
    if (homeFeedCache) return res.json({ ...homeFeedCache, cached: true });
    return res.json({
      flashDeals: [], electronics: [], fashion: [], smartphones: [], featured: [],
      cached: false, error: 'Feed unavailable',
    });
  }
});

export default router;
