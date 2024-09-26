
import { Router, Request, Response } from 'express';
const router = Router();



/**
 * @route   GET /api/v1/projects
 * @desc    Get all projects with pagination
 * @access  Private
 * @params  page, limit, search
 * @return  message, data
 * @error   400, { error }
 * @status  200, 400
 * 
 * @example /api/v1/projects?page=1&limit=10&search=project
 **/

router.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Get all projects with pagination' });
});


export default router;