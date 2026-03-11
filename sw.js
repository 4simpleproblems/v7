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
        client: '/VELIUM/uv/uv.client.js'
    },
    vora: {
        prefix: '/VORA/VERN_SYSTEM/uv/service/',
        bare: '/api/bare/',
        bundle: '/VORA/VERN_SYSTEM/uv/uv.bundle.js',
        config: '/VORA/VERN_SYSTEM/uv/uv.config.js',
        sw: '/VORA/VERN_SYSTEM/uv/uv.sw.js',
        handler: '/VORA/VERN_SYSTEM/uv/uv.handler.js',
        client: '/VORA/VERN_SYSTEM/uv/uv.client.js'
    },
    vern: {
        prefix: '/VERN/uv/service/',
        bare: '/bare/',
        bundle: '/VERN/uv/uv.bundle.js',
        config: '/VERN/uv/uv.config.js',
        sw: '/VERN/uv/uv.sw.js',
        handler: '/VERN/uv/uv.handler.js',
        client: '/VERN/uv/uv.client.js'
    },
    vana: {
        prefix: '/logged-in/uv/service/',
        bare: '/bare/',
        bundle: '/logged-in/uv/uv.bundle.js',
        config: '/logged-in/uv/uv.config.js',
        sw: '/logged-in/uv/uv.sw.js',
        handler: '/logged-in/uv/uv.handler.js',
        client: '/logged-in/uv/uv.client.js'
    },
    games: {
        prefix: '/GAMES/uv/service/',
        bare: '/bare/',
        bundle: '/GAMES/uv/uv.bundle.js',
        config: '/GAMES/uv/uv.config.js',
        sw: '/GAMES/uv/uv.sw.js',
        handler: '/GAMES/uv/uv.handler.js',
        client: '/GAMES/uv/uv.client.js'
    }
};

// Import the base SW logic
importScripts(configs.velium.sw);

// Use a consistent SharedWorker across the app to avoid transport conflicts
const workerPath = location.origin + "/VORA/VERN_SYSTEM/baremux/worker.js";
const connection = new BareMux.WorkerConnection(workerPath);
const bareClient = new BareMux.BareClient(connection);

// Message listener for SharedWorker port synchronization
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'baremuxinit' && event.data.port) {
        connection.port = event.data.port;
        console.log("Root SW: BareMux Port Synced via " + workerPath);
    }
});

const instances = {};
for (const key in configs) {
    const inst = new UVServiceWorker({
        ...configs[key],
        encodeUrl: Ultraviolet.codec.xor.encode,
        decodeUrl: Ultraviolet.codec.xor.decode
    });
    // Crucial: Override the internal bareClient that Ultraviolet might be using
    inst.bareClient = bareClient;
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
        // If it's already an encoded URL (hvtrs...) but missing the prefix
        if (url.includes('hvtrs8%2F-') && !url.includes(configs.vora.prefix)) {
            const encodedPart = url.split('hvtrs8%2F-')[1];
            const fullProxyUrl = location.origin + configs.vora.prefix + 'hvtrs8%2F-' + encodedPart;
            event.respondWith(instances.vora.fetch(new Request(fullProxyUrl, event.request)));
        } else if (!url.includes(configs.vora.prefix)) {
            // Encode the plain URL
            const encoded = Ultraviolet.codec.xor.encode(url);
            const fullProxyUrl = location.origin + configs.vora.prefix + encoded;
            event.respondWith(instances.vora.fetch(new Request(fullProxyUrl, event.request)));
        } else {
            // It already has the prefix, just fetch
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
                // Return a generic error response instead of letting the promise reject
                console.warn(`SW: Fallback fetch failed for ${url}`, err);
                return new Response(null, { status: 404, statusText: 'Not Found' });
            }
        })()
    );
});

// Made with ❤️ from 4SP
