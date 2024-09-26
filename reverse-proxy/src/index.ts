
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { ClientRequest, IncomingMessage } from 'http';
import httpProxy from 'http-proxy';

dotenv.config();

const app = express();
const proxy = httpProxy.createProxyServer();

// Function to resolve target URL based on subdomain
const resolveTarget = (hostname: string): string => {
    const subdomain = hostname.split('.')[0];
    return `${process.env.BASE_PATH}/${subdomain}`;
};

// Middleware to handle proxying
app.use((req: Request, res: Response) => {
    const target = resolveTarget(req.hostname);
    proxy.web(req, res, { target, changeOrigin: true }, (err) => {
        if (err) {
            console.error('Proxy error:', err);
            res.status(500).send('Proxy error');
        }
    });
});

// Modify proxy request path if needed
proxy.on('proxyReq', (proxyReq: ClientRequest, req: IncomingMessage) => {
    if (req.url === '/') {
        proxyReq.path += 'index.html';
    }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Reverse Proxy listening on port ${port}`);
});