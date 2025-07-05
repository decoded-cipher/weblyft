
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import path from 'path';

import { ClientRequest, IncomingMessage } from 'http';
import httpProxy from 'http-proxy';

import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';

import Redis from 'ioredis';
const { Client } = require('pg');


const app = express();
const proxy = httpProxy.createProxyServer();

const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

const CACHE_DURATION_SECONDS = 5 * 60;

app.use(morgan('dev'));
app.use(compression());
app.use(helmet());

app.use(cors());
app.options('*', cors());


// Redis connection
redis.on('connect', () => {
    console.log('--- Connected to Redis');
});

redis.on('error', (err: Error) => {
    console.error('--- Redis connection error:', err);
    process.exit(1);
});


// Database connection
const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

db.connect()
    .then(() => console.log('--- Connected to the database'))
    .catch((err: Error) => {
        console.error('--- Database connection error:', err);
        process.exit(1);
    });


// Custom error classes
class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

class InternalServerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InternalServerError';
    }
}



// Extend interfaces to add custom properties
declare module 'express-serve-static-core' {
    interface Request {
      target?: string;
    }
}

declare module 'http' {
    interface IncomingMessage {
      target?: string;
    }
}



// Resolve target URL with Redis cache
const resolveTarget = async (hostname: string): Promise<string> => {
    const subdomain = hostname.split('.')[0];
    const cacheKey = `target:${subdomain}`;

    const cachedTarget = await redis.get(cacheKey);
    if (cachedTarget) {
        return cachedTarget;
    }

    const result = await db.query(
        `SELECT id, current_deployment_id as "currentDeploymentId" FROM "Project" WHERE slug = $1 LIMIT 1`,
        [subdomain]
    );
    const project = result.rows[0];
    if (!project) {
        throw new NotFoundError('Project not found');
    }

    const target = `${process.env.BASE_PATH}/${project.id}/${project.currentDeploymentId}`;
    await redis.set(cacheKey, target, 'EX', CACHE_DURATION_SECONDS);

    return target;
};



// Check storage exists with Redis cache
const checkStorageExists = async (target: string): Promise<boolean> => {
    const cacheKey = `storage:${target}`;
    
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult !== null) {
        return cachedResult === 'true';
    }

    try {
        const res = await fetch(`${target}/index.html`, { method: 'HEAD' });
        const exists = res.ok;
        
        await redis.set(cacheKey, exists.toString(), 'EX', CACHE_DURATION_SECONDS);
        return exists;
    } catch (err) {
        await redis.set(cacheKey, 'false', 'EX', CACHE_DURATION_SECONDS);
        return false;
    }
};



// Middleware to handle proxying
app.use(asyncHandler(async (req: Request, res: Response) => {
    const target = await resolveTarget(req.hostname);
    req.target = target;

    const exists = await checkStorageExists(target);
    if (!exists) {
        return res.status(200).sendFile(path.join(__dirname, 'errors', '202.html'));
    }

    proxy.web(req, res, { target, changeOrigin: true }, (err) => {
        console.error('Proxy error:', err);
        throw new InternalServerError('Proxy error');
    });
}));



// Proxy request handler
proxy.on('proxyReq', (proxyReq: ClientRequest, req: IncomingMessage) => {
    const target = req.target;
    if (target && !req.url?.includes('.')) {
        proxyReq.path = `${target}/index.html`;
    }
});



// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof NotFoundError) {
        res.status(404).sendFile(path.join(__dirname, 'errors', '404.html'));
    } else {
        res.status(500).sendFile(path.join(__dirname, 'errors', '500.html'));
    }
});



// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`--- Reverse Proxy listening on port ${port}`);
});
