importScripts('uv.bundle.js');
importScripts('uv.config.js');
importScripts('../baremux/index.js');

// Shared transport state
let transportReady = false;
let transportResolve;
const transportPromise = new Promise(resolve => {
    transportResolve = resolve;
});

const workerPath = location.origin + "/VERN/baremux/worker.js";
const connection = new BareMux.WorkerConnection(workerPath);
const bareClient = new BareMux.BareClient(connection);

importScripts(__uv$config.sw || 'uv.sw.js');

const uv = new UVServiceWorker();
uv.bareClient = bareClient;

// Use BroadcastChannel for more reliable signaling across contexts
const bc = new BroadcastChannel("bare-mux-sync");
bc.onmessage = (event) => {
    if (event.data && event.data.type === 'baremuxready' && event.data.path === workerPath) {
        transportReady = true;
        if (transportResolve) transportResolve();
        console.log("VERN SW: Transport Ready Signal Received");
    }
};

// Also listen for direct messages from the main thread (fallback)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'baremuxready' && event.data.path === workerPath) {
        transportReady = true;
        if (transportResolve) transportResolve();
        console.log("VERN SW: Transport Ready Message Received");
    }
});

self.addEventListener("activate", () => {
    const bc_uv = new BroadcastChannel("UvServiceWorker");
    bc_uv.postMessage("Active");
});

async function handleRequest(event) {
    if (uv.route(event)) {
        if (!transportReady) {
            // Check if it's already set in the worker
            try {
                const transport = await connection.getTransport();
                if (transport && transport.path) {
                    transportReady = true;
                }
            } catch (e) {}
            
            if (!transportReady) {
                await Promise.race([
                    transportPromise,
                    new Promise(r => setTimeout(r, 3000))
                ]);
            }
        }
        return await uv.fetch(event);
    }
    
    return await fetch(event.request);
}

self.addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
});
<!-- Made with ❤️ from 4SP -->
