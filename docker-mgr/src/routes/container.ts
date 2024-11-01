

import dotenv from 'dotenv';
import { Router, Request, Response } from 'express';
import Docker, { ContainerCreateOptions } from 'dockerode';

import { pullDockerImage } from '../controllers/container';

dotenv.config();

const router = Router();
const docker = new Docker();


interface RunContainerRequest {
    gitUrl: string;
    projectName: string;
    cmd?: string[];
    envVars?: string[];
}



// Get the list of all containers
router.get('/', (req: Request, res: Response) => {
    docker.listContainers({ all: true }, (err, containers) => {
        if (err) {
            res.status(500).json({
                status: 500,
                error: 'Failed to fetch containers list',
                details: err
            });
        } else {
            res.status(200).json({
                status: 200,
                message: 'Containers list fetched successfully',
                details: containers
            });
        }
    });
});



// API route to run a Docker container
router.post('/', (req: Request<{}, {}, RunContainerRequest>, res: Response) => {
    const { gitUrl, projectName, cmd, envVars } = req.body;
  
    pullDockerImage(process.env.WEBSERVICE_IMAGE).then(() => {

        const containerOptions: ContainerCreateOptions = {
            Image: process.env.WEBSERVICE_IMAGE,
            name: projectName,
            Cmd: cmd,
            Env: [
                `CLOUDFLARE_R2_ENDPOINT=${process.env.CLOUDFLARE_R2_ENDPOINT}`,
                `CLOUDFLARE_R2_ACCESS_KEY_ID=${process.env.CLOUDFLARE_R2_ACCESS_KEY}`,
                `CLOUDFLARE_R2_SECRET_ACCESS_KEY=${process.env.CLOUDFLARE_R2_SECRET_KEY}`,
                `CLOUDFLARE_R2_BUCKET_NAME=${process.env.CLOUDFLARE_R2_BUCKET_NAME}`,
                `PROJECT_ID=${projectName}`,
                `GIT_REPOSITORY_URL=${gitUrl}`
            ]
        };

        return docker.createContainer(containerOptions);

    }).then(container => {
        
        // Start the container
        return container.start().then(() => {
            
            // Wait for the container to stop
            container.wait().then(() => {
            
                // Remove the container after it stops
                container.remove().then(() => {
                    res.status(200).json({
                        status: 200,
                        message: 'Container started and removed successfully'
                    });
                });
                
            });

        }).catch(err => {
            res.status(500).json({
                status: 500,
                error: 'Failed to start container',
                details: err
            });
        });

    }).catch(err => {
        res.status(500).json({
            status: 500,
            error: 'Failed to create container',
            details: err
        });
    });
});



export default router;