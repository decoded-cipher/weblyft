
import Docker from 'dockerode';
const docker = new Docker();


async function pullDockerImage(image: string): Promise<void> {
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
}

export { pullDockerImage };