
import { Container, ContainerCreateOptions } from "dockerode";
import axios from "axios";
import Docker from "dockerode";
const docker = new Docker();


interface RunContainerRequest {
    projectId: string;
    deploymentId: string;
    gitUrl: string;
    cmd?: string[];
    envVars?: string[];
}



const pullDockerImage = (image: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        docker.pull(image, (err: Error, stream: NodeJS.ReadableStream) => {
            if (err) {
                return reject(err);
            }

            const onProgress = (event: any) => { console.log(event); }
            
            const onFinished = (error: Error | null, result: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            }
            
            docker.modem.followProgress(stream, onFinished, onProgress);
        });
    });
};



const createRunContainer = async (request: RunContainerRequest): Promise<void> => {
    const { projectId, deploymentId, gitUrl, cmd, envVars = [] } = request;
    
    const webserviceImage = process.env.WEBSERVICE_IMAGE as string;

    await updateDeploymentStatus(deploymentId, "IN_PROGRESS");

    try {
        await pullDockerImage(webserviceImage);
        console.log(`--- Pulled image: ${webserviceImage}`);

        const defaultEnv = [
            `PROJECT_ID=${projectId}`,
            `DEPLOYMENT_ID=${deploymentId}`,
            `GIT_REPOSITORY_URL=${gitUrl}`,
            `KAFKA_BROKERS=${process.env.KAFKA_BROKERS}`,
            `KAFKA_TOPIC=${process.env.KAFKA_TOPIC}`,
            `CLOUDFLARE_R2_ENDPOINT=${process.env.CLOUDFLARE_R2_ENDPOINT}`,
            `CLOUDFLARE_R2_ACCESS_KEY=${process.env.CLOUDFLARE_R2_ACCESS_KEY}`,
            `CLOUDFLARE_R2_SECRET_KEY=${process.env.CLOUDFLARE_R2_SECRET_KEY}`,
            `CLOUDFLARE_R2_BUCKET_NAME=${process.env.CLOUDFLARE_R2_BUCKET_NAME}`
        ];

        const containerOptions: ContainerCreateOptions = {
            Image: webserviceImage,
            name: `webservice-${projectId}-${deploymentId}`,
            Cmd: cmd,
            Env: [...defaultEnv, ...envVars],
            HostConfig: {
                AutoRemove: true,
                NetworkMode: "weblyft_weblyft",
            }
        };

        console.log("--- Creating container with options:", JSON.stringify(containerOptions, null, 2));

        const container: Container = await docker.createContainer(containerOptions);
        console.log("--- Container created.");

        await container.start();
        console.log("--- Container started.");

        await container.wait();
        console.log("--- Container finished execution.");

        await updateDeploymentStatus(deploymentId, "SUCCESS");
        console.log("--- Deployment status updated to SUCCESS.");
    } catch (err) {
        console.error("Container run failed:", err);
        try {
            await updateDeploymentStatus(deploymentId, "FAILED");
        } catch (statusErr) {
            console.error("Failed to update deployment status:", statusErr);
        }
        throw err;
    }
};



const updateDeploymentStatus = async (deploymentId: string, status: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
    
        const url = `${process.env.API_BASE_URL}/api/v1/deploy/${deploymentId}`;
        const data = { status };

        axios.patch(url, data)
            .then(() => { resolve(); })
            .catch((err : any) => {
                console.error("Error updating deployment status:", err);
                reject(err);
            });
    });
}



export { createRunContainer };