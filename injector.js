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
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        if (!window.__4sp_baremux_listener_added) {
            window.__4sp_baremux_listener_added = true;
            
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'getPort' && event.data.port) {
                    try {
                        // Create a fresh connection for every request to ensure a unique, un-neutered port
                        let workerPath = "/logged-in/baremux/worker.js";
                        let tempWorker = new SharedWorker(workerPath, "bare-mux-worker");
                        
                        // Transfer the port back to the service worker
                        event.data.port.postMessage(tempWorker.port, [tempWorker.port]);
                    } catch (e) {
                        console.error("Injector: Failed to provide BareMux port:", e);
                    }
                }
            });
        }
    }

    // --- Stub Global Loader Control (to prevent errors in other scripts) ---
    window.hideLoader = () => {
        const loader = document.getElementById('universal-loader');
        if (loader) loader.remove();
    };
    window.showLoader = () => {};

    // --- Supabase Global Initialization ---
    // Make supabase client available to all scripts (e.g. analytics.js)
    const loadSupabase = async () => {
        if (window.supabase) return; // Prevent multiple loads
        try {
            const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
            const { supabaseConfig } = await import("/supabase-config.js");
            window.supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
            console.log("Supabase: Global client initialized.");
        } catch (e) {
            console.warn("Supabase: Global initialization failed", e);
        }
    };

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
    const start = async () => {
        await loadSupabase();
        
        const loadingPromises = scriptsToLoad.map(loadScript);

        Promise.all(loadingPromises)
            .then(() => {
                console.log('--- All application scripts loaded successfully! ---');
            })
            .catch(error => {
                console.error('Loader encountered errors during script loading:', error);
            });
    };
    start();

})();
