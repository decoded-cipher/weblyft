
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { exec } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Kafka } = require('kafkajs');



// Initialize S3 client
const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY
    }
});



// Initialize Kafka client
const kafka = new Kafka({
    clientId: `build-server-${process.env.DEPLOYMENT_ID}`,
    brokers: [process.env.KAFKA_BROKERS],
    ssl: false
});

// Initialize Kafka producer
const producer = kafka.producer();



// Function to publish logs to Kafka
async function publishLog(log, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await producer.send({
                topic: process.env.KAFKA_TOPIC,
                messages: [{
                    key: 'log',
                    value: JSON.stringify({
                        project_id: process.env.PROJECT_ID,
                        deployment_id: process.env.DEPLOYMENT_ID,
                        log: log
                    })
                }]
            });
            return; // Exit the function if successful
        } catch (error) {
            if (attempt === retries) {
                console.error('Failed to publish log after multiple attempts:', error);
                throw error;
            }
            console.warn(`Attempt ${attempt} failed, retrying...`);
            await new Promise(res => setTimeout(res, 1000 * attempt)); // Exponential backoff
        }
    }
}



// Function to execute build process
async function executeBuild(outDirPath) {
    return new Promise(async (resolve, reject) => {

        await publishLog('Installing dependencies and building the project...');
        const p = exec(`cd ${outDirPath} && npm install && npm run build`);

        p.stdout.on('data', async (data) => {
            await publishLog(data.toString());
        });

        p.stderr.on('data', async (data) => {
            await publishLog(`error: ${data.toString()}`);
        });

        p.on('close', async (code) => {
            if (code === 0) {
                await publishLog('Build process completed successfully...');
                resolve();
            } else {
                await publishLog(`error: Build process exited with code ${code}`);
                reject(new Error(`Build process exited with code ${code}`));
            }
        });
    });
}



// Function to upload a single file to S3
async function uploadFile(filePath, key) {
    const command = new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath) || 'application/octet-stream'
    });

    await publishLog(`Uploading file: ${key}`);
    await s3Client.send(command);
}



// Function to upload all files in the dist folder to Cloudflare R2
async function uploadDistFolder(distFolderPath) {
    await publishLog('Starting upload of dist folder...');
    const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true });

    const uploadPromises = distFolderContents.map(async (file) => {
        const filePath = path.join(distFolderPath, file);
        if (fs.lstatSync(filePath).isDirectory()) return;

        const key = `__outputs/${process.env.PROJECT_ID}/${process.env.DEPLOYMENT_ID}/${file}`;
        await uploadFile(filePath, key);
    });

    await Promise.all(uploadPromises);
    await publishLog('Upload of dist folder completed successfully...');
}



// Initialize the build process and upload the dist folder
(async () => {
    try {

        await producer.connect().then(() => {
            console.log('Kafka producer connected successfully.');
        });

        await publishLog('Build process started...');

        const outDirPath = path.join(__dirname, 'output');
        await executeBuild(outDirPath);

        const distFolderPath = path.join(__dirname, 'output', 'dist');
        await uploadDistFolder(distFolderPath);

    } catch (error) {
        await publishLog('Error during build process...', error);
    } finally {
        await producer.disconnect();
        process.exit(0);
    }
})();
