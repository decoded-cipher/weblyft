
import Docker from 'dockerode';
const docker = new Docker();


async function pullDockerImage(image: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {

        docker.pull(image, (err: Error, stream: NodeJS.ReadableStream) => {
            if (err) {
                return reject(err);
            }

            const onFinished = (err: Error) => { err ? reject(err) : resolve(); }
            const onProgress = (event: any) => { console.log(event); }
            
            docker.modem.followProgress(stream, onFinished, onProgress);
        });

    });
}

export { pullDockerImage };