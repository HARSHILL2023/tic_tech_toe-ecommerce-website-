import { Router } from 'express';
import { assignVariant } from '../services/abService.js';

const router = Router();

// GET /api/ab/assign?user_id=
router.get('/assign', async (req, res, next) => {
  try {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({ error: 'BadRequest', message: 'user_id is required' });
    }

    const { variant } = await assignVariant(userId);
    res.json({ variant, userId });
  } catch (err) {
    next(err);
  }
});

export default router;
