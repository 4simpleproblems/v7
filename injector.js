/**
 * Script Loader (Centralized Dependency Manager)
 * * This file dynamically creates and appends <script> tags for 
 * all listed files, ensuring only this file needs to be updated 
 * when adding or removing application dependencies.
 */

// BareMux MessagePort fix - MUST RUN IMMEDIATELY before anything else
if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'getPort' && event.data.port) {
            try {
                const path = window.location.pathname.toLowerCase();
                let workerPath = "/VELIUM/baremux/worker.js";
                if (path.includes('vora') || path.includes('/vora/')) workerPath = "/VORA/VERN_SYSTEM/baremux/worker.js";
                else if (path.includes('/vern/')) workerPath = "/VERN/baremux/worker.js";
                else if (path.includes('/games/')) workerPath = "/GAMES/baremux/worker.js";
                else if (path.includes('/logged-in/')) workerPath = "/logged-in/baremux/worker.js";

                const worker = new SharedWorker(workerPath, "bare-mux-worker");
                
                // Ensure the worker is started and provide the port
                if (worker && worker.port) {
                    event.data.port.postMessage(worker.port, [worker.port]);
                } else {
                    throw new Error("Invalid SharedWorker port");
                }
            } catch (e) {
                // console.warn("BareMux SharedWorker failed, falling back to MessageChannel", e);
                try {
                    const channel = new MessageChannel();
                    event.data.port.postMessage(channel.port1, [channel.port1]);
                } catch (e2) {
                    // console.error("BareMux Fallback failed", e2);
                }
            }
        }
    });
}

(function() {
    // Prevent multiple loads
    if (window.__4sp_injector_loaded) return;
    window.__4sp_injector_loaded = true;

    // --- Stub Global Loader Control (to prevent errors in other scripts) ---
    window.hideLoader = () => {
        const loader = document.getElementById('universal-loader');
        if (loader) loader.remove();
    };
    window.showLoader = () => {};

    // 1. DEFINE YOUR SCRIPTS HERE
    // Update this array (and ONLY this array) to manage your application's scripts.
    const scriptsToLoad = [
      { url: '/ban-enforcer.js', type: 'module' },
      { url: '/tab-disguiser.js' },
      { url: '/panic-key.js' },
      { url: '/analytics.js' },
      { url: '/admin_keybinds.js' },
      { url: '/logged-in/birthday.js' }
    ];

    // Conditionally load navigation based on flag
    if (window.__4sp_nav_mini) {
        scriptsToLoad.push({ url: '/navigation-mini.js' });
    } else {
        scriptsToLoad.push({ url: '/navigation.js' });
    }

    // 2. CORE DYNAMIC LOADING FUNCTION
    function loadScript(config) {
        const url = typeof config === 'string' ? config : config.url;
        const type = config.type || 'text/javascript';

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.type = type;
            script.async = true;

            script.onload = () => resolve(url);
            script.onerror = () => {
                console.error(`Failed to load script: ${url}`);
                reject(new Error(`Loading error for ${url}`));
            };
            document.head.appendChild(script);
        });
    }

    // 3. INITIATE LOADING PROCESS
    const loadingPromises = scriptsToLoad.map(loadScript);

    Promise.all(loadingPromises)
        .then(() => {
            console.log('--- All application scripts loaded successfully! ---');
        })
        .catch(error => {
            console.error('Loader encountered errors during script loading:', error);
        });

})();
