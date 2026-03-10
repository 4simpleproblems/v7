importScripts('../../VERN/baremux/index.js');
importScripts('uv.bundle.js');
importScripts('uv.config.js');
importScripts(__uv$config.sw || 'uv.sw.js');

const uv = new UVServiceWorker();

// Correctly initialize BareMux for UV v3 / BareMux v2
// Note: VERN_SYSTEM uses VORA SharedWorker usually or its own.
// Based on navigation-mini.js it uses /VORA/VERN_SYSTEM/baremux/worker.js or /GAMES/baremux/worker.js
// Let's assume its own relative to root if possible, or use the one it expects.
const connection = new BareMux.WorkerConnection("/VORA/VERN_SYSTEM/baremux/worker.js");
uv.bareClient = new BareMux.BareClient(connection);

// Message listener for SharedWorker port synchronization
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'baremuxinit' && event.data.port) {
        connection.port = event.data.port;
    }
});

let config = {
    blocklist: new Set(),
}

async function handleRequest(event) {
    if (uv.route(event)) {
        if (config.blocklist.size !== 0) {
            let decodedUrl = new URL(__uv$config.decodeUrl(new URL(event.request.url).pathname.slice(__uv$config.prefix.length)));
            if (config.blocklist.has(decodedUrl.hostname)) {
                return new Response("", { status: 404 });
            }
        }
        return await uv.fetch(event);
    }
    
    return await fetch(event.request);
}

self.addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type !== 'baremuxinit') {
        config = event.data;
    }
});

self.addEventListener("activate", () => {
    const bc = new BroadcastChannel("UvServiceWorker");
    bc.postMessage("Active");
});