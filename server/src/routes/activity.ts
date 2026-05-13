import { Router, Response } from 'express';
import { Activity } from '../models/Activity.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/activity/group/:groupId
router.get('/group/:groupId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const activities = await Activity.find({ groupId: req.params.groupId })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
