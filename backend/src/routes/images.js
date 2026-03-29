import express from 'express';

const router = express.Router();

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Product ID → best Unsplash search query
const PRODUCT_QUERIES = {
  1:  'sony wireless noise cancelling headphones',
  2:  'samsung qled 4k smart television',
  3:  'apple iphone 15 smartphone',
  4:  'nike air max sneakers shoes',
  5:  'slim fit jeans denim fashion',
  6:  'instant pot electric pressure cooker kitchen',
  7:  'dyson cordless vacuum cleaner',
  8:  'adidas ultraboost running shoes',
  9:  'yoga mat exercise fitness',
  10: 'foundation makeup beauty cosmetics',
  11: 'face serum skincare beauty bottle',
  12: 'book reading self improvement',
  13: 'money finance investment book',
  14: 'wireless bluetooth headphones over ear',
  15: 'smart fitness band wristband',
  16: 'sports activewear t-shirt puma',
  17: 'mixer grinder kitchen blender appliance',
  18: 'dumbbell weight set gym fitness',
  19: 'lipstick makeup beauty cosmetics',
  20: 'money personal finance book',
};

// ── Picsum fallback for a product ──────────────────────────────────────────────
const fallback = (id) => [
  { url: `https://picsum.photos/seed/piq${id}a/400/400`, thumb: `https://picsum.photos/seed/piq${id}a/100/100`, alt: PRODUCT_QUERIES[id] || `Product ${id}` },
  { url: `https://picsum.photos/seed/piq${id}b/400/400`, thumb: `https://picsum.photos/seed/piq${id}b/100/100`, alt: PRODUCT_QUERIES[id] || `Product ${id}` },
  { url: `https://picsum.photos/seed/piq${id}c/400/400`, thumb: `https://picsum.photos/seed/piq${id}c/100/100`, alt: PRODUCT_QUERIES[id] || `Product ${id}` },
  { url: `https://picsum.photos/seed/piq${id}d/400/400`, thumb: `https://picsum.photos/seed/piq${id}d/100/100`, alt: PRODUCT_QUERIES[id] || `Product ${id}` },
];

// In-memory cache — avoids repeat API calls during server runtime
const imageCache = new Map();

async function fetchFromUnsplash(id) {
  if (imageCache.has(id)) return imageCache.get(id);

  const query = PRODUCT_QUERIES[id];
  if (!query) return null;

  if (!UNSPLASH_KEY) return fallback(id);

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4&orientation=squarish&content_filter=high`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  });

  if (!res.ok) throw new Error(`Unsplash ${res.status}`);

  const data = await res.json();
  const images = data.results.map((photo) => ({
    url: photo.urls.regular,
    thumb: photo.urls.thumb,
    alt: photo.alt_description || query,
    credit: photo.user.name,
    creditLink: `${photo.user.links.html}?utm_source=priceiq&utm_medium=referral`,
  }));

  const result = images.length > 0 ? images : fallback(id);
  imageCache.set(id, result);
  return result;
}

// ── GET /api/images/product/:id ────────────────────────────────────────────────
router.get('/product/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!PRODUCT_QUERIES[id]) {
    return res.json({ images: fallback(id) });
  }
  try {
    const images = await fetchFromUnsplash(id);
    res.json({ images });
  } catch (err) {
    console.warn(`Unsplash fallback for product ${id}:`, err.message);
    res.json({ images: fallback(id) });
  }
});

// ── GET /api/images/batch?ids=1,2,3 ───────────────────────────────────────────
router.get('/batch', async (req, res) => {
  const rawIds = req.query.ids || '';
  const ids = rawIds.split(',').map(Number).filter(Boolean).slice(0, 20);
  if (ids.length === 0) return res.json({});

  const results = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        results[id] = await fetchFromUnsplash(id);
      } catch {
        results[id] = fallback(id);
      }
    })
  );

  res.json(results);
});

export default router;
