/**
 * backend/src/routes/marketplace.js
 * Unified Amazon + Flipkart aggregator — Production Hardened
 *
 * GET /api/marketplace/home          — 8 sections, 10-min cache
 * GET /api/marketplace/category/:cat — single category, 10-min cache
 * GET /api/marketplace/search?q=     — merged search, 5-min cache
 * GET /api/marketplace/product/:id   — deep fetch by amz_ or fk_ id, 10-min cache
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '../../.cache/marketplace');

// ── Config ────────────────────────────────────────────────────────────────────
const AMZ_KEY  = process.env.RAPIDAPI_KEY;
const AMZ_HOST = 'real-time-amazon-data.p.rapidapi.com';
const FK_KEY   = process.env.FLIPKART_RAPIDAPI_KEY;
const FK_HOST  = 'real-time-flipkart-data2.p.rapidapi.com';

const amzHeaders = { 'x-rapidapi-key': AMZ_KEY, 'x-rapidapi-host': AMZ_HOST };
const fkHeaders  = { 'x-rapidapi-key': FK_KEY,  'x-rapidapi-host': FK_HOST  };

// ── TTLs ─────────────────────────────────────────────────────────────────────
const HOME_TTL    = 10 * 60 * 1000;
const CAT_TTL     = 10 * 60 * 1000;
const SEARCH_TTL  =  5 * 60 * 1000;
const PRODUCT_TTL = 10 * 60 * 1000;

// ── Unified in-memory cache + file-cache helpers ──────────────────────────────
const mem = new Map(); // key => { data, ts, ttl }

function getCache(key) {
  const entry = mem.get(key);
  if (entry && Date.now() - entry.ts < entry.ttl) return entry.data;
  // Try file cache
  try {
    const file = path.join(CACHE_DIR, `${key.replace(/[^a-z0-9_-]/gi, '_')}.json`);
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Date.now() - raw.ts < entry?.ttl || Date.now() - raw.ts < 60 * 60 * 1000) {
        mem.set(key, { data: raw.data, ts: raw.ts, ttl: raw.ttl || HOME_TTL });
        return raw.data;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function setCache(key, data, ttl = HOME_TTL) {
  mem.set(key, { data, ts: Date.now(), ttl });
  // Persist to file for cross-restart survival
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const file = path.join(CACHE_DIR, `${key.replace(/[^a-z0-9_-]/gi, '_')}.json`);
    fs.writeFileSync(file, JSON.stringify({ data, ts: Date.now(), ttl }));
  } catch { /* ignore */ }
}

// ── Price / count parsers ─────────────────────────────────────────────────────
function pp(val) {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}
function pc(val) {
  if (typeof val === 'number') return val;
  const n = parseInt(String(val || '0').replace(/[^0-9]/g, ''));
  return isNaN(n) ? 0 : n;
}
function pad4(img) {
  if (!img) return [];
  const arr = [img, img, img, img];
  return arr;
}
function priceLabel(disc) {
  if (disc > 35) return 'High Demand';
  if (disc > 20) return 'Competitor Match';
  if (disc >  5) return 'Limited Stock';
  return 'Standard Price';
}
function demandLabel(disc, rc) {
  if (disc > 40 && rc > 500) return 'Hot Deal';
  if (disc > 30) return 'Flash Sale';
  if (rc > 5000) return 'Bestseller';
  return null;
}

// ── Normalisers ───────────────────────────────────────────────────────────────
function normalizeAmz(item, idx) {
  const asin = (item.asin || '').trim() || `unknown_${idx}`;
  const livePrice = pp(item.product_price);
  if (livePrice < 100) return null;
  const name = (item.product_title || '').trim();
  if (name.length < 8) return null;
  if (!item.product_photo) return null;

  const rawMrp = pp(item.product_original_price);
  const mrp = rawMrp > livePrice ? rawMrp : Math.round(livePrice * 1.15);
  const disc = Math.round(((mrp - livePrice) / mrp) * 100);
  const rc = pc(item.product_num_ratings);

  return {
    id: `amz_${asin}`,           // stable — no timestamp
    source: 'amazon',
    sourceId: asin,
    name: name.substring(0, 120),
    brand: name.split(' ')[0] || 'Brand',
    category: '',
    mrp,
    livePrice,
    discount: disc,
    rating: parseFloat(item.product_star_rating) || 4.0,
    reviewCount: rc,
    stock: 10 + (rc % 40 || 5),  // deterministic from reviews, not random
    images: pad4(item.product_photo),
    description: name,
    specs: {},
    productUrl: item.product_url || `https://amazon.in/dp/${asin}`,
    priceReason: priceLabel(disc),
    demandBadge: demandLabel(disc, rc),
  };
}

function normalizeFlipkart(item, idx) {
  const rawId = String(item.id || item.pid || item.product_id || `idx_${idx}`).replace(/[^a-z0-9_-]/gi, '');
  const rawPrice = item.price || item.currentPrice || item.selling_price || '0';
  const rawMrpSrc = item.originalPrice || item.mrp || item.original_price;
  const livePrice = pp(rawPrice);
  if (livePrice < 100) return null;
  const name = (item.title || '').trim();
  if (name.length < 8) return null;
  if (!item.image) return null;

  const rawMrp = pp(rawMrpSrc);
  const mrp = rawMrp > livePrice ? rawMrp : Math.round(livePrice * 1.15);
  const disc = Math.round(((mrp - livePrice) / mrp) * 100);
  const rc = pc(item.reviewCount || item.num_reviews || 0);

  return {
    id: `fk_${rawId}`,           // stable — no timestamp
    source: 'flipkart',
    sourceId: rawId,
    name: name.substring(0, 120),
    brand: item.brand || name.split(' ')[0] || 'Brand',
    category: '',
    mrp,
    livePrice,
    discount: disc,
    rating: parseFloat(item.rating || item.average_rating || '4.0') || 4.0,
    reviewCount: rc,
    stock: 10 + (rc % 40 || 5),
    images: pad4(item.image),
    description: name,
    specs: {},
    productUrl: item.url || item.product_url || '',
    priceReason: priceLabel(disc),
    demandBadge: demandLabel(disc, rc),
  };
}

// ── Relevance filter ──────────────────────────────────────────────────────────
const ACCEPT = {
  electronics:    ['phone','laptop','tablet','headphone','earphone','earbuds','speaker','tv','television','camera','charger','powerbank','smartwatch','bluetooth','router','mouse','keyboard','computer','monitor','mobile','airpod','projector','refrigerator','washing machine'],
  fashion:        ['shirt','pant','jean','dress','shoe','boot','kurta','saree','top','jacket','t-shirt','tshirt','legging','sandal','slipper','sneaker','hoodie','cap','clothing','apparel','trouser','formal','casual','wear','outfit','polo','shorts','innerwear'],
  'home-kitchen': ['cooker','mixer','grinder','blender','pan','vessel','kettle','juicer','toaster','airfryer','kitchen','cookware','utensil','vacuum','iron','bed','mattress','pillow','curtain','lamp','shelf','rack','bathroom'],
  beauty:         ['cream','serum','lipstick','foundation','shampoo','conditioner','moisturizer','sunscreen','face wash','deodorant','body wash','skincare','cosmetic','makeup','perfume','cologne','hair oil','gel','nail'],
  books:          ['book','novel','guide','manual','edition','author','published','story','biography','autobiography','fiction','non-fiction','textbook','paperback','hardcover'],
  sports:         ['gym','dumbbell','yoga','sport','fitness','cricket','football','exercise','treadmill','protein','whey','badminton','cycle','resistance','running','weight','bench','glove','bat','racket','ball'],
  toys:           ['toy','kids','child','children','game','puzzle','learning','educational','playset','action figure','doll','lego','building block','remote control','rc car','board game','play','cartoon','figure','soft toy','stuffed'],
};
const REJECT = {
  electronics:    ['towel','cloth','plug','meter','cable connector','sticker','saree','shirt','jeans','dress','pant','book'],
  fashion:        ['cover','case','charger','cable','bottle','kitchen','towel','book','headphone','laptop'],
  'home-kitchen': ['phone','laptop','shirt','shoes','book','makeup','serum'],
  beauty:         ['machine','appliance','shoe','headphone','wire','phone','laptop','book'],
  books:          ['phone','laptop','shirt','shoe','kitchen','gym','makeup','headphone'],
  sports:         ['book','makeup','kitchen','phone'],
  toys:           ['adapter','cable','charger','shirt','shoe','phone','laptop','kitchen','beauty','towel','serum','foundation','makeup'],
};

function isRelevant(title, slug) {
  const t = (title || '').toLowerCase();
  if ((REJECT[slug] || []).some(w => t.includes(w))) return false;
  const accepts = ACCEPT[slug];
  if (!accepts) return true;
  return accepts.some(w => t.includes(w));
}

// ── Dedup by normalized name ───────────────────────────────────────────────────
function dedup(arr) {
  const seen = new Set();
  return arr.filter(p => {
    const k = p.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Raw API fetchers ──────────────────────────────────────────────────────────
async function fetchAmz(query, limit = 18) {
  if (!AMZ_KEY) return [];
  try {
    const url = `https://${AMZ_HOST}/search?query=${encodeURIComponent(query)}&page=1&country=IN&sort_by=RELEVANCE`;
    const r = await fetch(url, { headers: amzHeaders, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.data?.products || [])
      .filter(i => i.product_title && i.product_photo && i.product_price)
      .map(normalizeAmz)
      .filter(Boolean)
      .slice(0, limit);
  } catch { return []; }
}

async function fetchFk(query, limit = 18) {
  if (!FK_KEY) return [];
  try {
    const url = `https://${FK_HOST}/search?q=${encodeURIComponent(query)}&page=1`;
    const r = await fetch(url, { headers: fkHeaders, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const d = await r.json();
    const items = d.results || d.products || d.data?.products || [];
    return items
      .filter(i => i.title && i.image && (i.price || i.currentPrice))
      .map(normalizeFlipkart)
      .filter(Boolean)
      .slice(0, limit);
  } catch { return []; }
}

// ── Section builder with min-4 fallback ─────────────────────────────────────
function slugLabel(s) {
  const M = { electronics:'Electronics', fashion:'Fashion', 'home-kitchen':'Home & Kitchen',
    beauty:'Beauty', books:'Books', sports:'Sports', toys:'Toys' };
  return M[s] || s;
}

async function buildSection(slug, amzQ, fkQ, { amzPrimary=true, limit=12 }={}) {
  const [amz, fk] = await Promise.all([
    amzQ ? fetchAmz(amzQ, limit) : [],
    fkQ  ? fetchFk(fkQ,  limit) : [],
  ]);
  const label = slugLabel(slug);
  const tag = p => ({ ...p, category: label });

  const af = amz.filter(p => isRelevant(p.name, slug)).map(tag);
  const ff = fk.filter(p  => isRelevant(p.name, slug)).map(tag);
  const merged = dedup(amzPrimary ? [...af, ...ff] : [...ff, ...af]);
  return merged.slice(0, limit);
}

// ── Home feed builder ─────────────────────────────────────────────────────────
async function buildHomeFeed() {
  const [electronics, fashion, homeKitchen, beauty, books, sports, toysRaw] = await Promise.all([
    buildSection('electronics',   'smartphone laptop headphones earbuds television india', 'bluetooth headphones smart watch mobile india', { amzPrimary:true }),
    buildSection('fashion',       'nike adidas puma shirt jeans footwear india',           'nike adidas puma jeans shirt shoes india',      { amzPrimary:false }),
    buildSection('home-kitchen',  'mixer grinder pressure cooker kitchen appliances india','kitchen appliances cookware india',              { amzPrimary:true }),
    buildSection('beauty',        'skincare serum moisturizer face wash india',            'lipstick serum foundation skincare makeup india',{ amzPrimary:false }),
    buildSection('books',         'bestseller books india self help finance',              null,                                             { amzPrimary:true, limit:10 }),
    buildSection('sports',        'fitness dumbbell yoga mat gym equipment india',         'running shoes dumbbells yoga mat india',         { amzPrimary:true }),
    buildSection('toys',          'toys kids learning games india',                        'toys kids educational games india',              { amzPrimary:true }),
  ]);

  // Enrich sections with fallback: if < 4 products, fill from other categories (relevance-tagged)
  const allPool = [...electronics, ...fashion, ...homeKitchen, ...beauty, ...books, ...sports];
  const enrich = (arr, slug, target) => {
    if (arr.length >= 4) return arr;
    const fallback = allPool
      .filter(p => p.category === slugLabel(slug) || isRelevant(p.name, slug))
      .filter(p => !arr.some(a => a.id === p.id));
    return dedup([...arr, ...fallback]).slice(0, target);
  };

  const enriched = {
    electronics:  enrich(electronics,  'electronics',   12),
    fashion:      enrich(fashion,       'fashion',       12),
    homeKitchen:  enrich(homeKitchen,   'home-kitchen',  12),
    beauty:       enrich(beauty,        'beauty',        12),
    books:        enrich(books,         'books',         10),
    sports:       enrich(sports,        'sports',        12),
  };

  // Toys: only include if we got at least 4 relevant results (no cross-pool fill for toys — stay strict)
  const toysFiltered = toysRaw.filter(p => isRelevant(p.name, 'toys'));
  const toysAvailable = toysFiltered.length >= 4;
  if (toysAvailable) enriched.toys = toysFiltered.slice(0, 12);

  // Flash deals = highest discount across all sections
  const allItems = Object.values(enriched).flat();
  const flashDeals = dedup([...allItems].sort((a,b) => b.discount - a.discount).filter(p => p.discount >= 8)).slice(0, 12);

  // Featured = top 2 from each category (rating * 10 + discount weighted sort)
  const best = arr => [...arr].sort((a,b) => (b.rating*10+b.discount) - (a.rating*10+a.discount)).slice(0,2);
  const featured = dedup([
    ...best(enriched.electronics), ...best(enriched.fashion),
    ...best(enriched.homeKitchen), ...best(enriched.beauty),
    ...best(enriched.sports),      ...best(enriched.books),
  ]);

  return { featured, flashDeals, ...enriched, toysAvailable };
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// GET /api/marketplace/home
router.get('/home', async (req, res) => {
  const cached = getCache('home');
  if (cached) return res.json({ ...cached, cached: true });
  try {
    const feed = await buildHomeFeed();
    setCache('home', feed, HOME_TTL);
    return res.json({ ...feed, cached: false });
  } catch (err) {
    console.error('marketplace/home error:', err.message);
    return res.json({ featured:[], flashDeals:[], electronics:[], fashion:[], homeKitchen:[], beauty:[], books:[], sports:[], toys:[], toysAvailable:false, cached:false, error:'unavailable' });
  }
});

// GET /api/marketplace/category/:cat
const CAT_QUERIES = {
  electronics:    { amz:'smartphone laptop headphones earbuds television india',       fk:'bluetooth headphones smart watch mobile india',      amzPrimary:true  },
  fashion:        { amz:'nike adidas puma shirt jeans kurta india',                    fk:'nike adidas puma jeans shirt shoes india',            amzPrimary:false },
  'home-kitchen': { amz:'mixer grinder pressure cooker kitchen appliances india',      fk:'kitchen appliances cookware utensil india',           amzPrimary:true  },
  beauty:         { amz:'skincare serum moisturizer face wash perfume india',          fk:'lipstick serum foundation skincare makeup india',     amzPrimary:false },
  books:          { amz:'bestseller books india non fiction self help finance novel',  fk:null,                                                  amzPrimary:true  },
  sports:         { amz:'fitness dumbbell yoga mat gym equipment cricket india',       fk:'running shoes dumbbells yoga mat india',              amzPrimary:true  },
  toys:           { amz:'toys kids learning games educational india',                  fk:'toys kids educational games india',                   amzPrimary:true  },
};

router.get('/category/:cat', async (req, res) => {
  const slug = req.params.cat.toLowerCase();
  if (!CAT_QUERIES[slug]) return res.status(400).json({ error: 'Unknown category' });

  const key = `cat_${slug}`;
  const cached = getCache(key);
  if (cached) return res.json({ products: cached, cached: true });

  const q = CAT_QUERIES[slug];
  try {
    let products = await buildSection(slug, q.amz, q.fk, { amzPrimary: q.amzPrimary, limit: 24 });

    // Fallback: if < 4 products, try pulling from home cache
    if (products.length < 4) {
      const home = getCache('home');
      if (home) {
        const label = slugLabel(slug);
        const fromHome = (home[slug] || home.electronics || []).filter(p => p.category === label);
        products = dedup([...products, ...fromHome]).slice(0, 24);
      }
    }

    setCache(key, products, CAT_TTL);
    return res.json({ products, cached: false });
  } catch (err) {
    console.error('marketplace/category error:', err.message);
    const stale = mem.get(key);
    if (stale) return res.json({ products: stale.data, cached: true });
    return res.json({ products: [], cached: false, error: 'unavailable' });
  }
});

// GET /api/marketplace/search?q=
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q is required' });

  const key = `search_${q.toLowerCase().replace(/\s+/g, '_').substring(0, 50)}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const [amz, fk] = await Promise.all([fetchAmz(`${q} india`, 20), fetchFk(`${q} india`, 20)]);
    // Tag category using detectCategory
    const merged = dedup([...amz, ...fk]).map(p => ({ ...p, category: p.category || 'Electronics' }));
    setCache(key, merged, SEARCH_TTL);
    return res.json(merged);
  } catch (err) {
    console.error('marketplace/search error:', err.message);
    const stale = mem.get(key);
    if (stale) return res.json(stale.data);
    return res.json([]);
  }
});

// GET /api/marketplace/product/:id
router.get('/product/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || id === 'undefined' || id === 'NaN') return res.status(400).json({ error: 'Invalid id' });

  const key = `product_${id}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  if (id.startsWith('amz_')) {
    const asin = id.replace(/^amz_/, '');
    try {
      const r = await fetch(
        `https://${AMZ_HOST}/product-details?asin=${asin}&country=IN`,
        { headers: amzHeaders, signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) throw new Error(`AMZ ${r.status}`);
      const d = await r.json();
      const item = d.data || {};
      const livePrice = pp(item.product_price);
      const mrpRaw = pp(item.product_original_price);
      const mrp = mrpRaw > livePrice ? mrpRaw : Math.round(livePrice * 1.15);
      const disc = mrp > livePrice ? Math.round(((mrp - livePrice) / mrp) * 100) : 0;
      const rawImages = Array.isArray(item.product_photos) ? item.product_photos : [item.product_photo];
      const images = rawImages.filter(Boolean).slice(0, 4);
      while (images.length < 4 && images[0]) images.push(images[0]);

      const product = {
        id,
        source: 'amazon',
        sourceId: asin,
        name: (item.product_title || '').substring(0, 120),
        brand: (item.product_title || '').split(' ')[0] || 'Brand',
        category: 'Electronics',
        mrp,
        livePrice,
        discount: disc,
        rating: parseFloat(item.product_star_rating) || 4.0,
        reviewCount: pc(item.product_num_ratings),
        stock: 10,
        images,
        description: item.product_description || item.product_title || '',
        specs: item.product_specifications
          ? Object.fromEntries((item.product_specifications || []).map(s => [s.name, s.value]))
          : {},
        productUrl: item.product_url || `https://amazon.in/dp/${asin}`,
        priceReason: priceLabel(disc),
        demandBadge: null,
      };
      setCache(key, product, PRODUCT_TTL);
      return res.json(product);
    } catch (err) {
      console.error('AMZ product detail error:', err.message);
      // Fallback: search for it
      const fallbackList = await fetchAmz(id.replace('amz_', ''), 1);
      if (fallbackList[0]) { setCache(key, fallbackList[0], PRODUCT_TTL); return res.json(fallbackList[0]); }
      return res.status(404).json({ error: 'Product not found' });
    }
  }

  if (id.startsWith('fk_')) {
    // Flipkart has no detail endpoint on free tier — resolve from home/category cache
    const allCached = ['home', 'cat_fashion', 'cat_electronics', 'cat_beauty', 'cat_sports', 'cat_home-kitchen', 'cat_books'];
    for (const ckey of allCached) {
      const c = getCache(ckey);
      if (!c) continue;
      const arr = Array.isArray(c) ? c : Object.values(c).flat();
      const found = arr.find(p => String(p.id) === id);
      if (found) { setCache(key, found, PRODUCT_TTL); return res.json(found); }
    }
    // Try search-based lookup (extract brand/name hint from fk_ id)
    return res.status(404).json({ error: 'Flipkart product detail not available — open product URL directly' });
  }

  // Numeric local product — delegate to products route (caller should use /api/products/:id)
  return res.status(400).json({ error: 'Use /api/products/:id for local products' });
});

export default router;
