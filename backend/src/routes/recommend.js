import { Router } from 'express';
import { getRecommendations } from '../services/recommendService.js';

const router = Router();

// GET /api/recommend?session_id=&product_id=
router.get('/', async (req, res, next) => {
  try {
    const sessionId = req.query.session_id || 'anonymous';
    const productId = parseInt(req.query.product_id, 10) || null;

    const recommendations = await getRecommendations(sessionId, productId);
    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

export default router;
