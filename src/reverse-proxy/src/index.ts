
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

const { Client } = require('pg');


const app = express();
const proxy = httpProxy.createProxyServer();

const cache: { [key: string]: { target: string, timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000;

app.use(morgan('dev'));
app.use(compression());
app.use(helmet());

app.use(cors());
app.options('*', cors());


// Database connection
const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    }
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



// Resolve target URL for the request
const resolveTarget = async (hostname: string): Promise<string> => {
    const subdomain = hostname.split('.')[0];
    const currentTime = Date.now();

    if (cache[subdomain] && (currentTime - cache[subdomain].timestamp < CACHE_DURATION)) {
        return cache[subdomain].target;
    }

    const result = await db.query(
        `SELECT id, current_deployment_id as "currentDeploymentId" FROM "Project" WHERE slug = $1 LIMIT 1`,
        [subdomain]
    );
    const project = result.rows[0];

    console.log('Project:', project);

    if (!project) {
        throw new NotFoundError('Project not found');
    }

    const target = `${process.env.BASE_PATH}/${project.id}/${project.currentDeploymentId}`;
    cache[subdomain] = { target, timestamp: currentTime };

    return target;
};



const checkStorageExists = async (target: string): Promise<boolean> => {
    try {
        const res = await fetch(`${target}/index.html`, { method: 'HEAD' });
        return res.ok;
    } catch (err) {
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
        if (err) {
            console.error('Proxy error:', err);
            throw new InternalServerError('Proxy error');
        }
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
    } else if (err instanceof InternalServerError) {
        res.status(500).sendFile(path.join(__dirname, 'errors', '500.html'));
    } else {
        res.status(500).sendFile(path.join(__dirname, 'errors', '500.html'));
    }
});



// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`--- Reverse Proxy listening on port ${port}`);
});
