import { Router, Request, Response } from 'express';
const router = Router();

// Health check route
router.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        status: 200,
        message: 'All servers are healthy'
    });
});

export default router;