

import dotenv from 'dotenv';
import { Router, Request, Response } from 'express';
import Docker, { ContainerCreateOptions } from 'dockerode';

import { pullDockerImage } from '../controllers/container';

dotenv.config();

const router = Router();
const docker = new Docker();


interface RunContainerRequest {
    gitUrl: string;
    projectId: string;
    cmd?: string[];
    envVars?: string[];
}


// API route to run a Docker container
router.post('/', (req: Request<{}, {}, RunContainerRequest>, res: Response) => {
    const { gitUrl, projectId, cmd, envVars } = req.body;
  
    pullDockerImage(process.env.WEBSERVICE_IMAGE)
        .then(() => {

            const containerOptions: ContainerCreateOptions = {
                Image: process.env.WEBSERVICE_IMAGE,
                name: projectId,
                Cmd: cmd,
                Env: [
                    `CLOUDFLARE_R2_ENDPOINT=${process.env.CLOUDFLARE_R2_ENDPOINT}`,
                    `CLOUDFLARE_R2_ACCESS_KEY_ID=${process.env.CLOUDFLARE_R2_ACCESS_KEY}`,
                    `CLOUDFLARE_R2_SECRET_ACCESS_KEY=${process.env.CLOUDFLARE_R2_SECRET_KEY}`,
                    `CLOUDFLARE_R2_BUCKET_NAME=${process.env.CLOUDFLARE_R2_BUCKET_NAME}`,
                    `PROJECT_ID=${projectId}`,
                    `GIT_REPOSITORY_URL=${gitUrl}`
                ]
            };

            return docker.createContainer(containerOptions);

        }).then(container => {
            return container.start().then(() => container);
        }).then(container => {
            res.status(200).json({
                status: 200,
                message: 'Container started successfully',
                details: container
            });
        }).catch(error => {
            res.status(500).json({
                status: 500,
                error: 'Failed to start the container',
                details: error
            });
    });
});

export default router;