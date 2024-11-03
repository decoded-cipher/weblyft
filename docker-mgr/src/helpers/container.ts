

import Docker, { ContainerCreateOptions } from 'dockerode';
const docker = new Docker();


function pullDockerImage(image: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        
        docker.pull(image, (err: Error, stream: NodeJS.ReadableStream) => {
            if (err) {
                return reject(err);
            }

            // The stream is a ReadableStream
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



function createRunContainer(content: any): Promise<void> {
    console.log("Inside createContainer...");
    console.log("Content:", content);
    

    const { gitUrl, projectName, cmd, envVars } = content;
    const webserviceImage = process.env.WEBSERVICE_IMAGE as string;

    return pullDockerImage(webserviceImage)
        .then(() => {
            console.log("Image pulled successfully");

            const containerOptions: ContainerCreateOptions = {
                Image: webserviceImage,
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
        })
        .then(container => {
            console.log("Container created successfully");
            
            return container.start()
                .then(() => {
                    console.log("Container started successfully");
                    return container.wait();
                })
                .then(() => {
                    console.log("Container exited successfully");
                    return container.remove();
                })
                .then(() => {
                    console.log("Container removed successfully");
                });
        })
        .catch(err => {
            console.log("Error:", err);
            throw err;
        });
}



export { createRunContainer };