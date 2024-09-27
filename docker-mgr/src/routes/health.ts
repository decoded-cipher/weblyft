import { Router, Request, Response } from 'express';

const router = Router();

// Health check route
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Server is healthy' });
});

export default router;