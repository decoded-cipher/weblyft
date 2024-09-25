
require('dotenv').config();

const express = require('express');
const httpProxy = require('http-proxy');

const app = express();
const proxy = httpProxy.createProxy();

// Function to resolve target URL based on subdomain
const resolveTarget = (hostname) => {
    const subdomain = hostname.split('.')[0];
    return `${process.env.BASE_PATH}/${subdomain}`;
};

// Middleware to handle proxying
app.use((req, res) => {
    const target = resolveTarget(req.hostname);
    proxy.web(req, res, { target, changeOrigin: true }, (err) => {
        if (err) {
            console.error('Proxy error:', err);
            res.status(500).send('Proxy error');
        }
    });
});

// Modify proxy request path if needed
proxy.on('proxyReq', (proxyReq, req) => {
    if (req.url === '/') {
        proxyReq.path += 'index.html';
    }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Reverse Proxy listening on port ${port}`);
});
