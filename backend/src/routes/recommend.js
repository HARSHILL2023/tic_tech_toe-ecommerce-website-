import { Router } from 'express';
import { getRecommendations } from '../services/recommendService.js';
import { assignVariant } from '../services/abService.js';

const router = Router();

// GET /api/recommend?session_id=&product_id=
router.get('/', async (req, res, next) => {
  try {
    const sessionId = req.query.session_id || 'anonymous';
    const productId = parseInt(req.query.product_id, 10) || null;

    // Get A/B variant for recommendation experiment
    const { variant } = await assignVariant(sessionId, 'rec-ml-v1');

    const recommendations = await getRecommendations(sessionId, productId, {}, variant);
    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

// GET /api/recommend/category?category=
router.get('/category', async (req, res, next) => {
  try {
    const category = req.query.category;
    const sessionId = req.query.session_id || 'anonymous';
    
    // Get A/B variant
    const { variant } = await assignVariant(sessionId, 'rec-ml-v1');

    const recommendations = await getRecommendations(sessionId, null, { 
      timeCategories: [category] 
    }, variant);
    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

export default router;
