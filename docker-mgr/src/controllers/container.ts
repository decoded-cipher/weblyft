
import Docker from 'dockerode';
const docker = new Docker();


async function pullDockerImage(image: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {

        docker.pull(image, (err: Error, stream: NodeJS.ReadableStream) => {
            if (err) {
                return reject(err);
            }

            const onProgress = (event: any) => { console.log(event); }
            
            const onFinished = (error: Error | null, result: any[]): void => {
                if (error) {
                    console.error(error);
                    return;
                }
                console.log(result);
            }
            
            docker.modem.followProgress(stream, onFinished, onProgress);
        });

    });
}

export { pullDockerImage };