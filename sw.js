importScripts('/VELIUM/uv/uv.bundle.js');
importScripts('/VELIUM/baremux/index.js');

// Unified Proxy Configuration
const configs = {
    velium: {
        prefix: '/VELIUM/uv/service/',
        bare: '/api/bare',
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
    vora_plus: {
        prefix: '/VORA_PLUS/VERN_SYSTEM/uv/service/',
        bare: '/api/bare',
        bundle: '/VORA_PLUS/VERN_SYSTEM/uv/uv.bundle.js',
        config: '/VORA_PLUS/VERN_SYSTEM/uv/uv.config.js',
        sw: '/VORA_PLUS/VERN_SYSTEM/uv/uv.sw.js',
        handler: '/VORA_PLUS/VERN_SYSTEM/uv/uv.handler.js',
        client: '/VORA_PLUS/VERN_SYSTEM/uv/uv.client.js',
        worker: '/VORA_PLUS/VERN_SYSTEM/baremux/worker.js'
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
    },
    valo: {
        prefix: '/VERN/uv/service/',
        bare: '/bare/',
        bundle: '/VERN/uv/uv.bundle.js',
        config: '/VERN/uv/uv.config.js',
        sw: '/VERN/uv/uv.sw.js',
        handler: '/VERN/uv/uv.handler.js',
        client: '/VERN/uv/uv.client.js',
        worker: '/VERN/baremux/worker.js'
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

// Default worker path
let currentWorkerPath = location.origin + configs.vora.worker;
let connection = new BareMux.WorkerConnection(currentWorkerPath);
let bareClient = new BareMux.BareClient(connection);

function updateTransport(path, port = null) {
    const hasPathChanged = path && path !== currentWorkerPath;
    const hasNewPort = !!port;

    if (hasPathChanged || hasNewPort) {
        if (hasPathChanged) {
            console.log("Root SW: Switching BareMux Worker to " + path);
            currentWorkerPath = path;
        }
        
        // If we have a port, use it directly as the connection target
        // Otherwise, use the path to create a new connection that will search for a port
        connection = new BareMux.WorkerConnection(port || currentWorkerPath);
        bareClient = new BareMux.BareClient(connection);
        
        // Re-inject the updated client into all active UV instances
        let count = 0;
        for (const key in instances) {
            instances[key].bareClient = bareClient;
            count++;
        }
        console.log(`Root SW: Transport updated. Injected into ${count} instances. Port source: ${hasNewPort ? 'Explicit' : 'Path-based'}`);
    }

    if (!transportReady) {
        transportReady = true;
        if (transportResolve) transportResolve();
    }
}

// Use BroadcastChannel for more reliable signaling across contexts
const bc = new BroadcastChannel("bare-mux-sync");
bc.onmessage = (event) => {
    if (event.data && event.data.type === 'baremuxready') {
        updateTransport(event.data.path);
        console.log("Root SW: BareMux Ready Signal Received via " + (event.data.path || "unknown"));
    }
};

// Message listener for SharedWorker port synchronization
self.addEventListener('message', (event) => {
    if (event.data && (event.data.type === 'baremuxinit' || event.data.type === 'baremuxready')) {
        const port = event.data.port || (event.ports && event.ports[0]);
        updateTransport(event.data.path, port);
        console.log("Root SW: BareMux Port/Ready Synced via " + (event.data.path || "unknown"));
    }
});

const instances = {};
for (const key in configs) {
    const inst = new UVServiceWorker({
        ...configs[key],
        encodeUrl: Ultraviolet.codec.xor.encode,
        decodeUrl: Ultraviolet.codec.xor.decode
    });
    // Use the shared client
    inst.bareClient = bareClient;
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
        'sndcdn.com',
        'streamed.pk',
        'streamed.ad',
        'strmd.link',
        'fastly.net'
    ];

    const isEncoded = url.includes('hvtrs8');
    const needsProxy = Object.values(configs).some(c => url.includes(c.prefix)) || 
                       url.includes('/VORA_PLUS/') ||
                       autoProxyDomains.some(domain => url.includes(domain)) || 
                       isEncoded;

    // If we need proxying but transport isn't ready, wait for up to 3 seconds
    if (needsProxy && !transportReady) {
        console.log("Root SW: Waiting for transport for " + url);
        await Promise.race([
            transportPromise,
            new Promise(r => setTimeout(r, 3000))
        ]);
        
        // If still not ready after timeout, log it but let the fetch proceed 
        if (!transportReady) console.warn("Root SW: Transport wait timed out for " + url);
    }

    // Find the matching instance based on prefix
    for (const key in configs) {
        if (url.includes(configs[key].prefix)) {
            const instance = instances[key];
            
            // Optimization: Bypass heavy UV processing for media assets
            // This allows direct streaming via Bare client for better performance
            const isMedia = event.request.destination === 'image' || 
                            event.request.destination === 'audio' ||
                            url.match(/\.(mp3|wav|ogg|m4a|png|jpg|jpeg|webp|gif|svg)$/i);

            if (isMedia && transportReady) {
                try {
                    // Manually decode the target URL from the proxy URL
                    const prefix = configs[key].prefix;
                    let encoded = "";
                    if (url.includes(prefix)) {
                        encoded = url.split(prefix)[1];
                    } else if (url.includes('hvtrs8')) {
                        encoded = 'hvtrs8' + url.split('hvtrs8')[1];
                    }

                    if (encoded) {
                        const unroutedUrl = Ultraviolet.codec.xor.decode(encoded);
                        console.log("Root SW: Direct Media Fetch: " + unroutedUrl);
                        return await bareClient.fetch(unroutedUrl, {
                            headers: event.request.headers,
                            method: event.request.method,
                            body: event.request.body,
                            redirect: 'follow'
                        });
                    }
                } catch (e) {
                    console.warn("Direct media fetch failed, falling back to full UV:", e);
                }
            }
            
            try {
                return await instance.fetch(event);
            } catch (err) {
                console.error(`Root SW: Instance fetch error for ${url}:`, err);
                return new Response(null, { status: 500, statusText: 'Instance Fetch Error' });
            }
        }
    }

    // Fallback routing for encoded URLs or media domains missing prefixes
    if (autoProxyDomains.some(domain => url.includes(domain)) || isEncoded) {
        // Default to Vora (main proxy) for general unrouted traffic
        // UNLESS it's clearly a Valo/Vern related request (detected by referrer or path if possible)
        // For simplicity and safety, we use the main Vora instance as the universal catch-all.
        let targetInstance = instances.vora;
        let targetConfig = configs.vora;

        // If referrer is Valo/Vern, use Valo instance
        if (event.request.referrer && (event.request.referrer.includes('/VERN/') || event.request.referrer.includes('/logged-in/valo'))) {
            targetInstance = instances.valo;
            targetConfig = configs.valo;
        }

        // If referrer is Vora Plus
        if (event.request.referrer && (event.request.referrer.includes('/VORA_PLUS/') || event.request.referrer.includes('/logged-in/vora-plus.html'))) {
            targetInstance = instances.vora_plus;
            targetConfig = configs.vora_plus;
        }

        try {
            if (isEncoded && !url.includes(targetConfig.prefix)) {
                const encodedPart = url.split('hvtrs8')[1];
                const fullProxyUrl = location.origin + targetConfig.prefix + 'hvtrs8' + encodedPart;
                return await targetInstance.fetch({ ...event, request: new Request(fullProxyUrl, event.request) });
            } else if (!url.includes(targetConfig.prefix)) {
                const encoded = Ultraviolet.codec.xor.encode(url);
                const fullProxyUrl = location.origin + targetConfig.prefix + encoded;
                return await targetInstance.fetch({ ...event, request: new Request(fullProxyUrl, event.request) });
            } else {
                return await targetInstance.fetch(event);
            }
        } catch (err) {
            console.error(`Root SW: Fallback fetch error for ${url}:`, err);
            return new Response(null, { status: 500, statusText: 'Fallback Fetch Error' });
        }
    }
    
    try {
        return await fetch(event.request);
    } catch (err) {
        return new Response(null, { status: 404, statusText: 'Not Found' });
    }
}

self.addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
});

// Made with ❤️ from 4SP
