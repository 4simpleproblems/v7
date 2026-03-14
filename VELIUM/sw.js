importScripts('uv/uv.bundle.js');
importScripts('uv/uv.config.js');
importScripts('baremux/index.js');

// Shared transport state - Use a promise to avoid the auto-retry loop in BareMux 2.x
let resolvePort;
const portPromise = new Promise(resolve => {
    resolvePort = resolve;
});

const connection = new BareMux.WorkerConnection(portPromise);
const bareClient = new BareMux.BareClient(connection);

importScripts(__uv$config.sw || 'uv/uv.sw.js');

const uv = new UVServiceWorker();
uv.bareClient = bareClient;

// Sync port from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'baremuxinit' && event.data.port) {
        resolvePort(event.data.port);
        console.log("VELIUM SW: BareMux Port Synced");
    }
});

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(
        (async () => {
            if (uv.route(event)) {
                // Optimization: If it's an image or audio request, bypass UV's heavy processing
                // and fetch it directly through the Bare client for maximum speed.
                const url = uv.unroute(event);
                const isMedia = event.request.destination === 'image' || 
                                event.request.destination === 'audio' ||
                                url.match(/\.(mp3|wav|ogg|m4a|png|jpg|jpeg|webp|gif|svg)$/i);

                if (isMedia) {
                    try {
                        const response = await bareClient.fetch(url, {
                            headers: event.request.headers,
                            method: event.request.method,
                            body: event.request.body,
                            redirect: 'follow'
                        });
                        return response;
                    } catch (e) {
                        console.warn("Media direct fetch failed, falling back to UV:", e);
                    }
                }

                return await uv.fetch(event);
            }
            return await fetch(event.request);
        })()
    );
});
