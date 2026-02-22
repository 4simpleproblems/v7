importScripts('/VELIUM/uv/uv.bundle.js');

// Unified Proxy Configuration
const configs = {
    velium: {
        prefix: '/VELIUM/uv/service/',
        bundle: '/VELIUM/uv/uv.bundle.js',
        config: '/VELIUM/uv/uv.config.js',
        sw: '/VELIUM/uv/uv.sw.js',
        handler: '/VELIUM/uv/uv.handler.js',
        client: '/VELIUM/uv/uv.client.js'
    },
    vora: {
        prefix: '/VORA/VERN_SYSTEM/uv/service/',
        bundle: '/VORA/VERN_SYSTEM/uv/uv.bundle.js',
        config: '/VORA/VERN_SYSTEM/uv/uv.config.js',
        sw: '/VORA/VERN_SYSTEM/uv/uv.sw.js',
        handler: '/VORA/VERN_SYSTEM/uv/uv.handler.js',
        client: '/VORA/VERN_SYSTEM/uv/uv.client.js'
    },
    vern: {
        prefix: '/VERN/uv/service/',
        bundle: '/VERN/uv/uv.bundle.js',
        config: '/VERN/uv/uv.config.js',
        sw: '/VERN/uv/uv.sw.js',
        handler: '/VERN/uv/uv.handler.js',
        client: '/VERN/uv/uv.client.js'
    },
    vana: {
        prefix: '/logged-in/uv/service/',
        bundle: '/logged-in/uv/uv.bundle.js',
        config: '/logged-in/uv/uv.config.js',
        sw: '/logged-in/uv/uv.sw.js',
        handler: '/logged-in/uv/uv.handler.js',
        client: '/logged-in/uv/uv.client.js'
    },
    games: {
        prefix: '/GAMES/uv/service/',
        bundle: '/GAMES/uv/uv.bundle.js',
        config: '/GAMES/uv/uv.config.js',
        sw: '/GAMES/uv/uv.sw.js',
        handler: '/GAMES/uv/uv.handler.js',
        client: '/GAMES/uv/uv.client.js'
    }
};

// Import all SW scripts
importScripts(configs.velium.sw);
// Note: UVServiceWorker class is added to self by the script above

const instances = {
    velium: new UVServiceWorker({ ...configs.velium, encodeUrl: Ultraviolet.codec.xor.encode, decodeUrl: Ultraviolet.codec.xor.decode }),
    vora: new UVServiceWorker({ ...configs.vora, encodeUrl: Ultraviolet.codec.xor.encode, decodeUrl: Ultraviolet.codec.xor.decode }),
    vern: new UVServiceWorker({ ...configs.vern, encodeUrl: Ultraviolet.codec.xor.encode, decodeUrl: Ultraviolet.codec.xor.decode }),
    vana: new UVServiceWorker({ ...configs.vana, encodeUrl: Ultraviolet.codec.xor.encode, decodeUrl: Ultraviolet.codec.xor.decode }),
    games: new UVServiceWorker({ ...configs.games, encodeUrl: Ultraviolet.codec.xor.encode, decodeUrl: Ultraviolet.codec.xor.decode })
};

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    
    for (const key in instances) {
        const instance = instances[key];
        const config = configs[key];
        
        if (url.includes(config.prefix)) {
            event.respondWith(
                (async () => {
                    try {
                        return await instance.fetch(event);
                    } catch (e) {
                        console.error(`${key.toUpperCase()} Proxy Fetch Error:`, e);
                        return new Response("Proxy Error", { status: 408 });
                    }
                })()
            );
            return;
        }
    }
});

// Made with ❤️ from 4SP
