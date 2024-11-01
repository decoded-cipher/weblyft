
import { Router, Request, Response } from 'express';
const router = Router();


import Container from './container';
import Health from './health';


router.use('/container', Container);
router.use('/health', Health);


router.get('/', (req: Request, res: Response) => {
    res.json({
        status: 200,
        message: 'Docker Service is working properly'
    });
});

export default router;