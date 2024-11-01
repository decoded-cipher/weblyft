
import { Router, Request, Response } from 'express';
const router = Router();

import { db } from '../../config/db';
import { sendToQueue } from '../../config/queue';


interface RunContainerRequest {
    gitUrl: string;
    projectName: string;
    cmd?: string[];
    envVars?: string[];
}



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
        
        const page = req.query.page || 1;
        const limit = req.query.limit || 10;
        const search = req.query.search || '';
    
        db.project.findMany({
            where: {
                name: {
                    contains: search.toString()
                }
            },
            take: Number(limit),
            skip: (Number(page) - 1) * Number(limit)
        }).then((projects) => {
            res.json({
                status: 200,
                message: 'Projects fetched successfully',
                data: projects
            });
        }).catch((error) => {
            res.json({
                status: 400,
                error: 'Failed to fetch projects',
                details: error
            });
        });
});



/**
 * @route   POST /api/v1/projects
 * @desc    Create a new project
 * @access  Private
 * @params  service, gitUrl, projectName, cmd, envVars
 * @return  message, data, project
 * @error   400, { error }
 * @status  200, 400
 * 
 * @example /api/v1/projects
 **/

router.post('/', async (req: Request<{}, {}, RunContainerRequest>, res: Response) => {

    const { gitUrl, projectName, cmd, envVars } = req.body;
    const slug = projectName.toLowerCase().replace(/\s+/g, '-');

    db.project.create({
        data: {
            name: projectName,
            slug: slug,
            gitUrl: gitUrl
        }
    }).then(async (project) => {
        
        await sendToQueue('build_queue', {
            gitUrl,
            projectName: slug,
            cmd,
            envVars
        }).then(() => {
            res.status(200).json({
                message: 'Project build added to queue',
                data: project
            });
        }).catch((error) => {
            res.status(400).json({
                error: 'Failed to add project build to queue',
                details: error
            });
        });

    }).catch((error) => {
        res.status(400).json({
            error: 'Failed to create project',
            details: error
        });
    });

});


export default router;