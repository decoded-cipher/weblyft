
import { Router, Request, Response } from 'express';
const router = Router();
import { generateSlug } from "random-word-slugs";
import { db } from '../../config/neon';
import { triggerDeploy } from '../../controller/deploy';


interface RunContainerRequest {
    gitUrl: string;
    projectName: string;
    cmd?: string[];
    envVars?: string[];
}



/**
 * @route   GET /api/v1/project
 * @desc    Get all projects with pagination
 * @access  Private
 * @params  page, limit, search
 * @return  message, data
 * @error   400, { error }
 * @status  200, 400
 * 
 * @example /api/v1/project?page=1&limit=10&search=project
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
 * @route   GET /api/v1/projects/check/:name
 * @desc    Check the availability of a project name. If not available, return a suggestion
 * @access  Private
 * @params  name
 * @return  message, data
 * @error   400, { error }
 * @status  200, 400
 * 
 * @example /api/v1/projects/check/my-project
 **/

router.get('/check', (req: Request, res: Response) => {
    const { name } = req.body;

    db.Project.findFirst({
        where: {
            name: name
        }
    }).then((project) => {
        const name = generateSlug();

        if (project) {
            res.status(200).json({
                message: 'Project name not available',
                data: name
            });
        } else {
            res.status(200).json({
                message: 'Project name available',
                data: name
            });
        }
    });
});



/**
 * @route   POST /api/v1/project
 * @desc    Create a new project
 * @access  Private
 * @params  service, gitUrl, projectName, cmd, envVars
 * @return  message, data, project
 * @error   400, { error }
 * @status  200, 400
 * 
 * @example /api/v1/project
 **/

router.post('/', async (req: Request<{}, {}, RunContainerRequest>, res: Response) => {

    const { gitUrl, projectName, cmd, envVars } = req.body;
    const slug = projectName.toLowerCase().replace(/\s+/g, '-');

    db.Project.create({
        data: {
            name: projectName,
            slug: slug,
            gitUrl: gitUrl
        }
    }).then(async (project) => {

        await triggerDeploy(project).then((deployment) => {
            res.status(200).json({
                message: 'Project created & deployment added to queue successfully',
                data: {
                    project_id: project.id,
                    deployment_id: deployment.id
                }
            });
        }).catch((error) => {
            res.status(400).json({
                error: 'Project created but failed to add deployment to queue',
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