
import { Router } from 'express';
const router = Router();


import projectRouter from './project';


router.use('/project', projectRouter);


export default router;