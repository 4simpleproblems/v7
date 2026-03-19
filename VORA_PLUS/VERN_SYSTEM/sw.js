importScripts('./uv/uv.bundle.js');
importScripts('./uv/uv.config.js');
importScripts('../baremux/index.js');

// Shared transport state
const workerPath = location.origin + "/VORA_PLUS/VERN_SYSTEM/baremux/worker.js";
const connection = new BareMux.WorkerConnection(workerPath);
const bareClient = new BareMux.BareClient(connection);

// Ensure the prefix matches what Ultraviolet expects for asset loading
self.__uv$config.prefix = "/VORA_PLUS/VERN_SYSTEM/uv/service/";

importScripts('./uv/uv.sw.js');

const uv = new UVServiceWorker();
// Explicitly override bareClient to use our BareMux connection
uv.bareClient = bareClient;

// Sync port from main thread if needed (though SharedWorker should be shared)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'baremuxinit' && event.data.port) {
        connection.port = event.data.port;
        console.log("VIRA SW: BareMux Port Synced");
    }
});

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    if (url.startsWith(location.origin + self.__uv$config.prefix)) {
        event.respondWith(uv.fetch(event));
    }
});
