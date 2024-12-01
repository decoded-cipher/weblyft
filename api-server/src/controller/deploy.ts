
import e from 'express';
import { db } from '../config/neon';
import { sendToQueue } from '../config/rabbitmq';

interface RunContainerRequest {
    projectId: string;
    deploymentId: string;
    gitUrl: string;
    projectName: string;
    cmd?: string[];
    envVars?: string[];
}


module.exports = {

    triggerDeploy: (project) => {
        return new Promise((resolve, reject) => {
            
            db.Deployment.create({
                data: {
                    projectId: project.id,
                }
            }).then(async (deployment) => {

                const queueData: RunContainerRequest = {
                    projectId: project.id,
                    deploymentId: deployment.id,
                    gitUrl: project.gitUrl,
                    cmd: project.cmd,
                    envVars: project.envVars
                };
    
                await sendToQueue('build_queue', {
                    ...queueData
                }).then(() => {
                    resolve(deployment);
                }).catch((error) => {
                    reject(error);
                });
    
            }).catch((error) => {
                reject(error);
            });

        });
    }

};