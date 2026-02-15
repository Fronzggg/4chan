const originalFetch = window.fetch;
const originalXHR = window.XMLHttpRequest;

const endpoints = [
    'https://api-node-1.example.com',
    'https://api-node-2.example.com',
    'https://api-node-3.example.com',
    'https://cdn-edge.example.com',
    'https://gateway.example.com'
];

const getRandomEndpoint = () => {
    return endpoints[Math.floor(Math.random() * endpoints.length)];
};

const obfuscateRequest = (url, options) => {
    const fakeEndpoint = getRandomEndpoint();
    console.log(`[Network] ${options?.method || 'GET'} ${fakeEndpoint}${url}`);
    return { url, options };
};

window.fetch = function(...args) {
    obfuscateRequest(args[0], args[1]);
    return originalFetch.apply(this, args);
};

window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
        obfuscateRequest(url, { method });
        return originalOpen.apply(this, [method, url, ...rest]);
    };
    return xhr;
};

const generateFakeTraffic = () => {
    const fakeUrls = [
        '/api/analytics/track',
        '/api/metrics/collect',
        '/api/telemetry/send',
        '/cdn/assets/bundle.js',
        '/static/images/logo.png'
    ];
    
    setInterval(() => {
        const fakeUrl = fakeUrls[Math.floor(Math.random() * fakeUrls.length)];
        console.log(`[Network] GET ${getRandomEndpoint()}${fakeUrl}`);
    }, Math.random() * 5000 + 2000);
};

generateFakeTraffic();

Object.defineProperty(navigator, 'userAgent', {
    get: function() {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
});

const originalLog = console.log;
console.log = function(...args) {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('[Network]')) {
        return originalLog.apply(console, args);
    }
};
