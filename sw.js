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

const connections = {};
const clients = {};

function getClient(key) {
    if (clients[key]) return clients[key];
    const workerPath = configs[key].worker;
    const connection = new BareMux.WorkerConnection(workerPath);
    const client = new BareMux.BareClient(connection);
    connections[key] = connection;
    clients[key] = client;
    return client;
}

// Initialize all clients
for (const key in configs) {
    getClient(key);
}

// Message listener for SharedWorker port synchronization
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'baremuxinit' && event.data.port) {
        // Find which worker this port belongs to based on some hint or just try to match
        // For simplicity in this structure, we might need a hint from the sender
        // But if each page sends its worker path, we can match it.
        const path = event.data.path;
        for (const key in configs) {
            if (path && path.includes(configs[key].worker)) {
                connections[key].port = event.data.port;
                console.log(`Root SW: BareMux Port Synced for ${key} via ${configs[key].worker}`);
                return;
            }
        }
        // Fallback: if no path, sync to the one matching the current "active" context if known, 
        // or just sync to the most likely one (vora is what the user said works)
        if (connections['vora']) connections['vora'].port = event.data.port;
    }
});

const instances = {};
for (const key in configs) {
    const inst = new UVServiceWorker({
        ...configs[key],
        encodeUrl: Ultraviolet.codec.xor.encode,
        decodeUrl: Ultraviolet.codec.xor.decode
    });
    // Dynamic client selection based on request
    inst.bareClient = getClient(key);
    instances[key] = inst;
}

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    
    // Find the matching instance based on prefix
    for (const key in configs) {
        if (url.includes(configs[key].prefix)) {
            event.respondWith(instances[key].fetch(event));
            return;
        }
    }

    // Auto-proxy certain domains even if prefix is missing
    const autoProxyDomains = [
        'api.themoviedb.org',
        'image.tmdb.org',
        'embed-testing-v7.vercel.app',
        'sub.wyzie.ru'
    ];

    if (autoProxyDomains.some(domain => url.includes(domain)) || url.includes('hvtrs8%2F-')) {
        // Default to vora instance for auto-proxying
        if (url.includes('hvtrs8%2F-') && !url.includes(configs.vora.prefix)) {
            const encodedPart = url.split('hvtrs8%2F-')[1];
            const fullProxyUrl = location.origin + configs.vora.prefix + 'hvtrs8%2F-' + encodedPart;
            event.respondWith(instances.vora.fetch({ ...event, request: new Request(fullProxyUrl, event.request) }));
        } else if (!url.includes(configs.vora.prefix)) {
            const encoded = Ultraviolet.codec.xor.encode(url);
            const fullProxyUrl = location.origin + configs.vora.prefix + encoded;
            event.respondWith(instances.vora.fetch({ ...event, request: new Request(fullProxyUrl, event.request) }));
        } else {
            event.respondWith(instances.vora.fetch(event));
        }
        return;
    }
    
    // Fallback to normal fetch for non-proxy requests
    event.respondWith(
        (async () => {
            try {
                return await fetch(event.request);
            } catch (err) {
                console.warn(`SW: Fallback fetch failed for ${url}`, err);
                return new Response(null, { status: 404, statusText: 'Not Found' });
            }
        })()
    );
});

// Made with ❤️ from 4SP
