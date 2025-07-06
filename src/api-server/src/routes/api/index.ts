
import { Router } from 'express';
const router = Router();

import projectRouter from './project';
import deployRouter from './deploy';
// import logsRouter from './logs';

router.use('/project', projectRouter);
router.use('/deploy', deployRouter);
// router.use('/logs', logsRouter);

export default router;