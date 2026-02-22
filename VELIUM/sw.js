const viraId = new URL(self.location).searchParams.get('v') || 'service';

importScripts('./uv/uv.bundle.js');
importScripts('./uv/uv.config.js');

// Ensure the prefix matches what Ultraviolet expects for asset loading
if (!self.__uv$config) self.__uv$config = {};
self.__uv$config.prefix = "/VELIUM/uv/service/";

importScripts('./uv/uv.sw.js');

const uv = new UVServiceWorker();

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    const prefix = self.__uv$config.prefix || "/VELIUM/uv/service/";
    
    // Aggressive check: if it contains the service path, intercept it
    if (url.includes(prefix)) {
        event.respondWith(
            (async () => {
                try {
                    return await uv.fetch(event);
                } catch (e) {
                    console.error("VELIUM Proxy Fetch Error:", e);
                    return new Response("Proxy Error", { status: 408 });
                }
            })()
        );
    }
});

// Made with ❤️ from 4SP
