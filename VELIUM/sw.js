importScripts('uv/uv.bundle.js');
importScripts('uv/uv.config.js');
importScripts('baremux/index.js');

// Shared transport state
const workerPath = location.origin + "/VELIUM/baremux/worker.js";
const connection = new BareMux.WorkerConnection(workerPath);
const bareClient = new BareMux.BareClient(connection);

importScripts(__uv$config.sw || 'uv/uv.sw.js');

const uv = new UVServiceWorker();
uv.bareClient = bareClient;

// Sync port from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'baremuxinit' && event.data.port) {
        connection.port = event.data.port;
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
                return await uv.fetch(event);
            }
            return await fetch(event.request);
        })()
    );
});
