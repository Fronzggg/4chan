const https = require('https');

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://your-app.onrender.com';

function ping() {
    if (process.env.NODE_ENV !== 'production') return;
    
    const url = new URL(RENDER_URL);
    const options = {
        hostname: url.hostname,
        port: 443,
        path: '/api/boards',
        method: 'GET'
    };

    const req = https.request(options, (res) => {
        console.log(`Keep-alive ping: ${res.statusCode}`);
    });

    req.on('error', (error) => {
        console.error('Keep-alive error:', error.message);
    });

    req.end();
}

setInterval(ping, 14 * 60 * 1000);

console.log('Keep-alive service started');
