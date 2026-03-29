import express from 'express';

const router = express.Router();
const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 min

const FLIPKART_KEY = process.env.FLIPKART_RAPIDAPI_KEY;
const FLIPKART_HOST = 'real-time-flipkart-data2.p.rapidapi.com';

function detectCategory(title = '') {
  const t = title.toLowerCase();
  if (t.includes('shirt') || t.includes('jean') || t.includes('shoe') || t.includes('dress') ||
      t.includes('kurta') || t.includes('saree') || t.includes('sneaker') || t.includes('jacket') ||
      t.includes('tshirt') || t.includes('t-shirt') || t.includes('legging') || t.includes('sandal') ||
      t.includes('slipper') || t.includes('cap') || t.includes('clothing')) return 'Fashion';
  if (t.includes('cream') || t.includes('serum') || t.includes('lipstick') || t.includes('makeup') ||
      t.includes('moisturizer') || t.includes('shampoo') || t.includes('sunscreen') || t.includes('face')) return 'Beauty';
  if (t.includes('phone') || t.includes('laptop') || t.includes('tablet') || t.includes('headphone') ||
      t.includes('earphone') || t.includes('speaker') || t.includes('tv') || t.includes('mobile')) return 'Electronics';
  return 'Fashion'; // default for Flipkart (mostly fashion/apparel)
}

// GET /api/flipkart?q=query&page=1
router.get('/', async (req, res) => {
  const { q, page = 1 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const key = `${q}_${page}`;
  if (cache.has(key)) {
    const c = cache.get(key);
    if (Date.now() - c.ts < TTL) return res.json(c.data);
  }

  if (!FLIPKART_KEY) {
    return res.status(503).json({ error: 'Flipkart API key not configured' });
  }

  try {
    const response = await fetch(
      `https://${FLIPKART_HOST}/search?q=${encodeURIComponent(q)}&page=${page}`,
      {
        headers: {
          'x-rapidapi-key': FLIPKART_KEY,
          'x-rapidapi-host': FLIPKART_HOST,
        },
      }
    );

    if (!response.ok) throw new Error(`Flipkart API ${response.status}`);
    const data = await response.json();

    const items = data.results || data.products || data.data?.products || [];
    const products = items
      .filter(item => item.title && (item.price || item.currentPrice) && item.image)
      .map((item, idx) => {
        const rawPrice = item.price || item.currentPrice || item.selling_price || '0';
        const rawMrp = item.originalPrice || item.mrp || item.original_price || rawPrice;
        const price = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;
        const mrp = parseFloat(String(rawMrp).replace(/[^0-9.]/g, '')) || price * 1.2;
        const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
        const id = item.id || item.pid || item.product_id || `fk_${idx}`;

        return {
          id: `fk_${id}`,
          name: (item.title || '').substring(0, 100),
          brand: item.brand || (item.title || '').split(' ')[0] || 'Brand',
          category: detectCategory(item.title),
          mrp: Math.round(mrp),
          livePrice: Math.round(price),
          basePrice: Math.round(price),
          discount,
          rating: parseFloat(item.rating || item.average_rating || '4.0') || 4.0,
          reviewCount: parseInt(String(item.reviewCount || item.num_reviews || '0').replace(/[^0-9]/g, '')) || 0,
          stock: Math.floor(Math.random() * 50) + 5,
          images: [item.image, item.image, item.image, item.image].filter(Boolean),
          description: item.title || '',
          priceReason: discount > 20 ? 'High Demand' : 'Standard Price',
          demandBadge: discount > 30 ? 'Hot Deal' : null,
          specs: {},
          source: 'flipkart',
          flipkartUrl: item.url || item.product_url || '',
        };
      })
      .filter(p => p.livePrice >= 100);

    cache.set(key, { data: products, ts: Date.now() });
    return res.json(products);
  } catch (err) {
    console.error('Flipkart API error:', err.message);
    if (cache.has(key)) return res.json(cache.get(key).data);
    return res.status(500).json({ error: 'Flipkart search failed', detail: err.message });
  }
});

export default router;
