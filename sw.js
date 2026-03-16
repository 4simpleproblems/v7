importScripts('/VELIUM/uv/uv.bundle.js');
importScripts('/VELIUM/baremux/index.js');

// Unified Proxy Configuration
const configs = {
    velium: {
        prefix: '/VELIUM/uv/service/',
        bare: '/bare/',
        bundle: '/VELIUM/uv/uv.bundle.js',
        config: '/VELIUM/uv/uv.config.js',
        sw: '/VELIUM/uv/uv.sw.js',
        handler: '/VELIUM/uv/uv.handler.js',
        client: '/VELIUM/uv/uv.client.js',
        worker: '/VELIUM/baremux/worker.js'
    },
    vora: {
        prefix: '/VORA/VERN_SYSTEM/uv/service/',
        bare: '/api/bare',
        bundle: '/VORA/VERN_SYSTEM/uv/uv.bundle.js',
        config: '/VORA/VERN_SYSTEM/uv/uv.config.js',
        sw: '/VORA/VERN_SYSTEM/uv/uv.sw.js',
        handler: '/VORA/VERN_SYSTEM/uv/uv.handler.js',
        client: '/VORA/VERN_SYSTEM/uv/uv.client.js',
        worker: '/VORA/VERN_SYSTEM/baremux/worker.js'
    },
    vern: {
        prefix: '/VERN/uv/service/',
        bare: '/bare/',
        bundle: '/VERN/uv/uv.bundle.js',
        config: '/VERN/uv/uv.config.js',
        sw: '/VERN/uv/uv.sw.js',
        handler: '/VERN/uv/uv.handler.js',
        client: '/VERN/uv/uv.client.js',
        worker: '/VERN/baremux/worker.js'
    },
    vana: {
        prefix: '/logged-in/uv/service/',
        bare: '/bare/',
        bundle: '/logged-in/uv/uv.bundle.js',
        config: '/logged-in/uv/uv.config.js',
        sw: '/logged-in/uv/uv.sw.js',
        handler: '/logged-in/uv/uv.handler.js',
        client: '/logged-in/uv/uv.client.js',
        worker: '/logged-in/baremux/worker.js'
    },
    games: {
        prefix: '/GAMES/uv/service/',
        bare: '/bare/',
        bundle: '/GAMES/uv/uv.bundle.js',
        config: '/GAMES/uv/uv.config.js',
        sw: '/GAMES/uv/uv.sw.js',
        handler: '/GAMES/uv/uv.handler.js',
        client: '/GAMES/uv/uv.client.js',
        worker: '/GAMES/baremux/worker.js'
    }
};

// Import the base SW logic (Ultraviolet)
importScripts(configs.velium.sw);

// Shared transport state
let transportReady = false;
let transportResolve;
const transportPromise = new Promise(resolve => {
    transportResolve = resolve;
});

// Create connections and clients for each config
const connections = {};
const bareClients = {};

for (const key in configs) {
    const workerPath = location.origin + configs[key].worker;
    connections[key] = new BareMux.WorkerConnection(workerPath);
    bareClients[key] = new BareMux.BareClient(connections[key]);
}

// Message listener for SharedWorker port synchronization
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'baremuxinit' && event.data.port && event.data.path) {
        // Find which connection this port belongs to based on the path
        for (const key in configs) {
            if (event.data.path.includes(configs[key].worker)) {
                connections[key].port = event.data.port;
                console.log(`Root SW: Port synced for ${key} via ${event.data.path}`);
            }
        }
        transportReady = true;
        if (transportResolve) transportResolve();
    }
});

const instances = {};
for (const key in configs) {
    const inst = new UVServiceWorker({
        ...configs[key],
        encodeUrl: Ultraviolet.codec.xor.encode,
        decodeUrl: Ultraviolet.codec.xor.decode
    });
    // Use the specific client for this instance
    inst.bareClient = bareClients[key];
    instances[key] = inst;
}

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

async function handleRequest(event) {
    const url = event.request.url;
    
    // Auto-proxy certain domains even if prefix is missing
    const autoProxyDomains = [
        'api.themoviedb.org',
        'image.tmdb.org',
        'embed-testing-v7.vercel.app',
        'sub.wyzie.ru',
        'saavncdn.com',
        'soundcloud.com',
        'sndcdn.com'
    ];

    const needsProxy = Object.values(configs).some(c => url.includes(c.prefix)) || 
                       autoProxyDomains.some(domain => url.includes(domain)) || 
                       url.includes('hvtrs8%2F-');

    // If we need proxying but transport isn't ready, wait for up to 2 seconds
    if (needsProxy && !transportReady) {
        console.log("Root SW: Waiting for transport for " + url);
        await Promise.race([
            transportPromise,
            new Promise(r => setTimeout(r, 2000))
        ]);
    }

    // Find the matching instance based on prefix
    for (const key in configs) {
        if (url.includes(configs[key].prefix)) {
            return await instances[key].fetch(event);
        }
    }

    if (autoProxyDomains.some(domain => url.includes(domain)) || url.includes('hvtrs8%2F-')) {
        if (url.includes('hvtrs8%2F-') && !url.includes(configs.vora.prefix)) {
            const encodedPart = url.split('hvtrs8%2F-')[1];
            const fullProxyUrl = location.origin + configs.vora.prefix + 'hvtrs8%2F-' + encodedPart;
            return await instances.vora.fetch({ ...event, request: new Request(fullProxyUrl, event.request) });
        } else if (!url.includes(configs.vora.prefix)) {
            const encoded = Ultraviolet.codec.xor.encode(url);
            const fullProxyUrl = location.origin + configs.vora.prefix + encoded;
            return await instances.vora.fetch({ ...event, request: new Request(fullProxyUrl, event.request) });
        } else {
            return await instances.vora.fetch(event);
        }
    }
    
    try {
        return await fetch(event.request);
    } catch (err) {
        // console.warn(`SW: Fallback fetch failed for ${url}`, err);
        return new Response(null, { status: 404, statusText: 'Not Found' });
    }
}

self.addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
});

// Made with ❤️ from 4SP
