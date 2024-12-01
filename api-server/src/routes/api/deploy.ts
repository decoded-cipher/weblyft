
import { Router, Request, Response } from 'express';
const router = Router();

import { db } from '../../config/neon';
import { sendToQueue } from '../../config/rabbitmq';
import { triggerDeploy } from '../../controller/deploy';



/**
 * @route   POST /api/v1/deploy
 * @desc    Create a new deployment
 * @access  Private
 * @params  project_id
 * @return  message, data, project
 * @error   400, { error }
 * @status  200, 400
 * 
 * @example /api/v1/deploy
 **/

router.post('/', async (req: Request, res: Response) => {

    const { project_id } = req.body;

    db.Project.findUnique({ where: { id: project_id } }).then(async (project) => {

        db.Deployment.create({
            data: {
                projectId: project.id
            }
        }).then(async (deployment) => {

            await triggerDeploy(project).then(() => {
                res.status(200).json({
                    message: 'Project deployment added to queue',
                    data: {
                        project: project,
                        deployment: deployment
                    }
                });
            }).catch((error) => {
                res.status(400).json({
                    error: 'Failed to add project deployment to queue',
                    details: error
                });
            });

        }).catch((error) => {
            res.status(400).json({
                error: 'Failed to create deployment',
                details: error
            });
        });

    }).catch((error) => {
        res.status(400).json({
            error: 'Failed to find project',
            details: error
        });
    });

});


export default router;