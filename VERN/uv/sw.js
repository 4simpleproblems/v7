importScripts('uv.bundle.js');
importScripts('uv.config.js');
importScripts('../baremux/index.js');

// Shared transport state
const workerPath = location.origin + "/VERN/baremux/worker.js";
const connection = new BareMux.WorkerConnection(workerPath);
const bareClient = new BareMux.BareClient(connection);

let transportReady = false;
let transportResolve;
const transportPromise = new Promise(resolve => {
    transportResolve = resolve;
});

importScripts(__uv$config.sw || 'uv.sw.js');

const uv = new UVServiceWorker();
uv.bareClient = bareClient;

async function handleRequest(event) {
    if (uv.route(event)) {
        if (!transportReady) {
            await transportPromise;
        }
        return await uv.fetch(event);
    }
    
    return await fetch(event.request);
}

self.addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === 'baremuxinit' && event.data.port) {
        connection.port = event.data.port;
        if (!transportReady) {
            transportReady = true;
            if (transportResolve) transportResolve();
        }
        console.log("VERN SW: BareMux Port Synced");
    }
});

self.addEventListener("activate", () => {
    const bc = new BroadcastChannel("UvServiceWorker");
    bc.postMessage("Active");
});
