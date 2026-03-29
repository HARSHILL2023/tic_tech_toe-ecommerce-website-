import express from 'express';
import Groq from 'groq-sdk';
import Product from '../models/Product.js';

const router = express.Router();

// Init Groq client (only if key is present)
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// ── Intent → MongoDB query mapping ──────────────────────────────────────────
async function searchProducts(userMessage) {
  const lower = userMessage.toLowerCase();
  let query = {};
  let sort = {};
  let limit = 3;

  if (lower.includes('headphone') || lower.includes('earphone') || lower.includes('audio') || lower.includes('boat') || lower.includes('rockerz')) {
    query = { $or: [{ name: /headphone/i }, { name: /earphone/i }, { name: /rockerz/i }, { name: /boat/i }, { category: 'Electronics' }] };
  } else if (lower.includes('laptop') || lower.includes('computer')) {
    query = { name: /laptop|macbook|dell|hp|lenovo/i };
  } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('iphone') || lower.includes('samsung')) {
    query = { name: /phone|iphone|samsung|redmi|oneplus/i };
  } else if (lower.includes('shoe') || lower.includes('sneaker') || lower.includes('nike') || lower.includes('adidas') || lower.includes('footwear')) {
    query = { $or: [{ name: /shoe|sneaker|nike|adidas/i }, { category: 'Fashion' }] };
  } else if (lower.includes('book') || lower.includes('read')) {
    query = { category: 'Books' };
  } else if (lower.includes('sport') || lower.includes('fitness') || lower.includes('gym')) {
    query = { category: 'Sports' };
  } else if (lower.includes('beauty') || lower.includes('skin') || lower.includes('makeup')) {
    query = { category: 'Beauty' };
  } else if (lower.includes('home') || lower.includes('kitchen') || lower.includes('furniture')) {
    query = { category: 'Home & Living' };
  } else if (lower.includes('toy') || lower.includes('kids') || lower.includes('children')) {
    query = { category: 'Toys' };
  } else if (lower.match(/budget|cheap|affordable|under ₹?[\d,]+|under \d+/)) {
    sort = { livePrice: 1 };
    query = {};
  } else if (lower.includes('trending') || lower.includes('popular') || lower.includes('best seller')) {
    sort = { viewCount: -1 };
    query = {};
  } else if (lower.includes('deal') || lower.includes('discount') || lower.includes('sale') || lower.includes('offer')) {
    sort = { discount: -1 };
    query = {};
  } else if (lower.includes('top') || lower.includes('best') || lower.includes('highly rated')) {
    sort = { rating: -1 };
    query = {};
  } else {
    // Generic: return trending products
    sort = { viewCount: -1 };
  }

  // Price filter from message e.g. "under 5000" or "under ₹5,000"
  const priceMatch = lower.match(/under (?:₹|rs\.?|inr)?\s?([\d,]+)/);
  if (priceMatch) {
    const maxPrice = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(maxPrice)) query.livePrice = { $lte: maxPrice };
  }

  const products = await Product.find(query)
    .sort(Object.keys(sort).length ? sort : { viewCount: -1 })
    .limit(limit)
    .select('id name brand category mrp livePrice discount rating reviewCount stock images priceReason demandBadge')
    .lean();

  return products;
}

// ── POST /api/chat ────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { message, sessionId, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    // 1. Fetch relevant products from DB
    const products = await searchProducts(message);

    // Build product context for AI
    const productContext = products.length
      ? `Relevant products from our catalog:\n${products.map((p, i) =>
          `${i + 1}. ${p.name} by ${p.brand} — ₹${p.livePrice.toLocaleString('en-IN')} (${p.discount}% off from ₹${p.mrp.toLocaleString('en-IN')}), ${p.stock} in stock, Rating: ${p.rating}/5`
        ).join('\n')}`
      : 'No specific products matched, showing general advice.';

    if (!groq) {
      // Fallback: no API key — return keyword-based response
      const text = products.length
        ? `Here are the best matches I found for you:`
        : `I couldn't find specific products right now. Please try a different search!`;
      return res.json({ text, products });
    }

    // 2. Build Groq conversation
    const systemPrompt = `You are PriceIQ Assistant, a smart AI shopping helper for the PriceIQ dynamic pricing e-commerce platform.
Your job is to help users find the best products at the best prices.

Rules:
- Be concise and helpful (2-3 sentences max)
- Always recommend products from the catalog provided
- Mention specific prices and discounts when available
- If prices are changing, mention that PriceIQ uses dynamic pricing
- Never make up products or prices not in the catalog
- Respond in the same language the user writes (Hindi or English)

${productContext}`;

    const messages = [
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 200,
      temperature: 0.7,
    });

    const aiText = completion.choices[0]?.message?.content?.trim()
      || 'Here are some great products for you!';

    return res.json({ text: aiText, products });
  } catch (err) {
    console.error('Chat route error:', err.message);
    // Graceful fallback
    try {
      const products = await searchProducts(message);
      return res.json({
        text: 'Here are the best matches I found for you:',
        products,
      });
    } catch {
      return res.status(500).json({ error: 'Chat service unavailable' });
    }
  }
});

export default router;
