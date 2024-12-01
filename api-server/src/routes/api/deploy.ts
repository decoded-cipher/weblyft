
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
            error: 'Failed to find project',
            details: error
        });
    });

});



/**
 * @route   PATCH /api/v1/deploy/:id
 * @desc    Update a deployment
 * @access  Private
 * @params  id
 * @return  message, data, deployment
 * @error   400, { error }
 * @status  200, 400
 * 
 * @example /api/v1/deploy/1
 **/

router.patch('/:id', async (req: Request, res: Response) => {

    const { id } = req.params;
    const { status } = req.body;

    db.Deployment.update({
        where: { id: id },
        data: {
            status: status
        }
    }).then((deployment) => {
        res.status(200).json({
            message: 'Deployment updated successfully',
            data: {
                deployment: deployment
            }
        });
    }).catch((error) => {
        res.status(400).json({
            error: 'Failed to update deployment',
            details: error
        });
    });
});


export default router;