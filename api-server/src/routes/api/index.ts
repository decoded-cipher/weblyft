
import { Router } from 'express';
const router = Router();

import projectRouter from './project';
import deployRouter from './deploy';

router.use('/project', projectRouter);
router.use('/deploy', deployRouter);

export default router;