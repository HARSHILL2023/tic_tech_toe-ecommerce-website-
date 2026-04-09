import { Router } from 'express';
import { getInventoryPredictions } from '../services/predictionService.js';

const router = Router();

// GET /api/prediction/inventory
router.get('/inventory', async (req, res, next) => {
  try {
    const predictions = await getInventoryPredictions();
    res.json(predictions);
  } catch (err) {
    next(err);
  }
});

export default router;
