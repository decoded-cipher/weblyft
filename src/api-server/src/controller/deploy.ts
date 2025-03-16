
import { db } from '../config/neon';
import { sendToQueue } from '../config/rabbitmq';



interface RunContainerRequest {
    id: string;
    gitUrl: string;
    cmd?: string[];
    envVars?: string[];
}



module.exports = {

    triggerDeploy: async (project: RunContainerRequest) => {
        return new Promise((resolve, reject) => {
            
            db.Deployment.create({
                data: {
                    projectId: project.id,
                }
            }).then(async (deployment) => {

                await sendToQueue('build_queue', {
                    projectId: project.id,
                    deploymentId: deployment.id,
                    gitUrl: project.gitUrl,
                    cmd: project.cmd,
                    envVars: project.envVars
                }).then(() => {

                    db.Project.update({
                        where: {
                            id: project.id
                        },
                        data: {
                            currentDeploymentId: deployment.id
                        }
                    }).then(() => {
                        resolve(deployment);
                    }).catch((error) => {
                        reject(error);
                    });

                }).catch((error) => {
                    reject(error);
                });
    
            }).catch((error) => {
                reject(error);
            });

        });
    }

};
