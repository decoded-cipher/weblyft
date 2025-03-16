
import { Router, Request, Response } from 'express';
const router = Router();

import API from './api';
import Auth from './auth';

router.use('/api/v1', API);
router.use('/auth', Auth);

router.get('/', (req: Request, res: Response) => {
    res.json({
        status: 200,
        message: 'API is working properly'
    });
});

export default router;