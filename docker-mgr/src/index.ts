import dotenv from 'dotenv';
import express, { Request, Response, Application } from 'express';
import Docker, { ContainerCreateOptions } from 'dockerode';
import bodyParser from 'body-parser';

dotenv.config();

// Initialize Express and Docker
const app: Application = express();
const docker = new Docker();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Type for request body
interface RunContainerRequest {
  image: string;
  containerName: string;
  cmd?: string[];    // Command to run inside the container (optional)
  envVars?: string[]; // Environment variables for the container (optional)
}

// API route to run a Docker container
app.post('/run-container', async (req: Request<{}, {}, RunContainerRequest>, res: Response) => {
  const { image, containerName, cmd, envVars } = req.body;

  if (!image || !containerName) {
    return res.status(400).json({ error: 'Docker image and container name are required' });
  }

  try {
    // Pull the Docker image
    console.log(`Pulling Docker image: ${image}`);

    await new Promise<void>((resolve, reject) => {
      docker.pull(image, (err: Error, stream: NodeJS.ReadableStream) => {
        if (err) {
          return reject(err);
        }
        docker.modem.followProgress(stream, onFinished, onProgress);

        function onFinished(err: Error) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }

        function onProgress(event: any) {
          console.log(event);
        }
      });
    });

    // Create container options
    const containerOptions: ContainerCreateOptions = {
      Image: image,
      name: containerName,
      Cmd: cmd,
      Env: envVars,
    };

    // Create and start the container
    const container = await docker.createContainer(containerOptions);
    await container.start();

    // Return success response
    res.status(200).json({ message: 'Container started successfully', container: container.id });
  } catch (error) {
    console.error('Error running container:', error);
    res.status(500).json({ error: 'Failed to start the container', details: error });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`\n--- Dockerode server started on port ${port}`);
});