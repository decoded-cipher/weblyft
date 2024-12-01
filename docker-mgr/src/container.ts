
import { Container, ContainerCreateOptions } from "dockerode";
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
    const { projectId, deploymentId, gitUrl, cmd } = request;
    const webserviceImage = process.env.WEBSERVICE_IMAGE as string;

    try {
        await pullDockerImage(webserviceImage);
        console.log(`--- Image ${webserviceImage} pulled successfully...`);

        const containerOptions: ContainerCreateOptions = {
            Image: webserviceImage,
            name: `webservice-${projectId}-${deploymentId}`,
            Cmd: cmd,
            Env: [

                // Project details
                `PROJECT_ID=${projectId}`,
                `DEPLOYMENT_ID=${deploymentId}`,
                `GIT_REPOSITORY_URL=${gitUrl}`,

                // Kafka Credentials
                `KAFKA_BROKERS=${process.env.KAFKA_BROKERS}`,
                `KAFKA_TOPIC=${process.env.KAFKA_TOPIC}`,
                `KAFKA_USERNAME=${process.env.KAFKA_USERNAME}`,
                `KAFKA_PASSWORD=${process.env.KAFKA_PASSWORD}`,
                
                // Cloudflare R2 Credentials
                `CLOUDFLARE_R2_ENDPOINT=${process.env.CLOUDFLARE_R2_ENDPOINT}`,
                `CLOUDFLARE_R2_ACCESS_KEY=${process.env.CLOUDFLARE_R2_ACCESS_KEY}`,
                `CLOUDFLARE_R2_SECRET_KEY=${process.env.CLOUDFLARE_R2_SECRET_KEY}`,
                `CLOUDFLARE_R2_BUCKET_NAME=${process.env.CLOUDFLARE_R2_BUCKET_NAME}`

            ]
        };

        const container: Container = await docker.createContainer(containerOptions);
        console.log("--- Container created successfully...");

        await container.start();
        console.log("--- Container started successfully...");

        await container.wait();
        console.log("--- Container finished execution...");

        await container.remove();
        console.log("--- Container removed successfully...");
    } catch (err) {
        console.error("Error:", err);
        throw err;
    }
};



export { createRunContainer };