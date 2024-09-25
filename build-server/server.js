
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { exec } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client
const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    }
});

// Function to publish logs
function publishLog(log) {
    console.log(`logs:${process.env.PROJECT_ID}`, JSON.stringify({ log }));
}

// Function to execute build process
async function executeBuild(outDirPath) {
    return new Promise((resolve, reject) => {
        const p = exec(`cd ${outDirPath} && npm install && npm run build`);

        p.stdout.on('data', (data) => {
            console.log(data.toString());
            publishLog(data.toString());
        });

        p.stderr.on('data', (data) => {
            console.error('Error', data.toString());
            publishLog(`error: ${data.toString()}`);
        });

        p.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
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

    await s3Client.send(command);
    publishLog(`uploaded ${key}`);
    console.log('uploaded', filePath);
}

// Function to upload all files in the dist folder to Cloudflare R2
async function uploadDistFolder(distFolderPath) {
    const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true });

    for (const file of distFolderContents) {
        const filePath = path.join(distFolderPath, file);
        if (fs.lstatSync(filePath).isDirectory()) continue;

        const key = `__outputs/${process.env.PROJECT_ID}/${file}`;
        console.log('uploading', filePath);
        publishLog(`uploading ${file}`);
        await uploadFile(filePath, key);
    }
}

// Initialize the build and upload process
async function init() {
    try {
        console.log('Executing script.js');
        publishLog('Build Started...');
        const outDirPath = path.join(__dirname, 'output');

        await executeBuild(outDirPath);

        console.log('Build Complete');
        publishLog('Build Complete');

        const distFolderPath = path.join(__dirname, 'output', 'dist');
        publishLog('Starting to upload');
        await uploadDistFolder(distFolderPath);

        publishLog('Done');
        console.log('Done...');
    } catch (error) {
        console.error('Error during build process:', error);
        publishLog(`error: ${error.message}`);
    }
}

init();
