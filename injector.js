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

    // Immediate Loader for perceived speed
    const injectLoader = () => {
        if (document.getElementById('universal-loader')) return;
        const loaderDiv = document.createElement('div');
        loaderDiv.id = 'universal-loader';
        loaderDiv.className = 'fixed inset-0 bg-[#000000] z-[100000] flex flex-col items-center justify-center p-12 transition-all duration-500';
        loaderDiv.style.visibility = 'visible';
        loaderDiv.style.opacity = '1';
        loaderDiv.innerHTML = `
            <div class="flex flex-col items-center gap-8 scale-110">
                <img src="/images/logo.png" class="h-20 w-auto animate-pulse" alt="Logo">
                <div class="flex flex-col items-center gap-4">
                    <h2 id="loader-title" class="text-white text-4xl font-light tracking-tighter uppercase font-[Geist] italic">Initializing</h2>
                    <div class="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div id="loader-bar" class="h-full bg-white w-0 transition-all duration-700 ease-out shadow-[0_0_15px_#fff]"></div>
                    </div>
                </div>
            </div>
        `;
        
        if (document.body) {
            document.body.prepend(loaderDiv);
        } else {
            document.documentElement.prepend(loaderDiv);
        }

        requestAnimationFrame(() => {
            const bar = document.getElementById('loader-bar');
            if (bar) bar.style.width = '30%';
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectLoader);
        // Also try immediately in case we are in the head but body exists (rare but possible with some parsers)
        injectLoader();
    } else {
        injectLoader();
    }

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
    /**
     * Creates a Promise to load a script element, resolving when loaded.
     */
    function loadScript(config) {
        const url = typeof config === 'string' ? config : config.url;
        const type = config.type || 'text/javascript';

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.type = type;
            script.async = true; // Prevents blocking the rest of the page render

            // Set up event listeners
            script.onload = () => {
                console.log(`Script loaded: ${url} (${type})`);
                resolve(url);
            };
            script.onerror = () => {
                console.error(`Failed to load script: ${url}`);
                reject(new Error(`Loading error for ${url}`));
            };

            // Inject the script into the document's head to start the download
            document.head.appendChild(script);
        });
    }

    // 3. INITIATE LOADING PROCESS
    // Load all scripts in parallel and wait for all to complete
    const loadingPromises = scriptsToLoad.map(loadScript);

    Promise.all(loadingPromises)
        .then(() => {
            console.log('--- All application scripts loaded successfully! ---');
            // OPTIONAL: Place initialization code here that requires ALL scripts to be ready.
            // Example: if (window.initApp) { window.initApp(); }
        })
        .catch(error => {
            console.error('Loader encountered errors during script loading:', error);
        });

})();
