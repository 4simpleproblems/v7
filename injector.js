/**
 * Script Loader (Centralized Dependency Manager)
 * * This file dynamically creates and appends <script> tags for 
 * all listed files, ensuring only this file needs to be updated 
 * when adding or removing application dependencies.
 */

(function() {
    // Prevent multiple loads
    if (window.__4sp_injector_loaded) return;
    window.__4sp_injector_loaded = true;

    // --- BareMux MessagePort fix for service worker communication ---
    // Moved to injector for earliest possible activation to prevent UV retry loops.
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'getPort' && event.data.port) {
                try {
                    let workerPath = "/VELIUM/baremux/worker.js";
                    const pathname = window.location.pathname.toLowerCase();
                    if (pathname.includes('vora')) workerPath = "/VORA/VERN_SYSTEM/baremux/worker.js";
                    else if (pathname.includes('/vora/')) workerPath = "/VORA/VERN_SYSTEM/baremux/worker.js";
                    else if (pathname.includes('/vern/')) workerPath = "/VERN/baremux/worker.js";
                    else if (pathname.includes('/games/')) workerPath = "/GAMES/baremux/worker.js";
                    else if (pathname.includes('/logged-in/')) workerPath = "/logged-in/baremux/worker.js";

                    const worker = new SharedWorker(workerPath, "bare-mux-worker");
                    event.data.port.postMessage(worker.port, [worker.port]);
                } catch (e) {}
            }
        });
    }

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
    if (window.__4sp_nav_none) {
        console.log("Navbar loading skipped due to __4sp_nav_none flag.");
    } else if (window.__4sp_nav_mini) {
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
