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

    // --- Path Identification for Loader ---
    const path = window.location.pathname.toLowerCase();
    const isLoggedInPage = path.includes('/logged-in/') || 
                           path.includes('/vora/') || 
                           path.includes('/velium/') || 
                           path.includes('/vern/') || 
                           path.includes('/games/');

    // --- Define Global Loader Control immediately ---
    window.hideLoader = () => {
        const loader = document.getElementById('universal-loader');
        const bar = document.getElementById('loader-bar');
        if (loader && bar) {
            bar.style.width = '100%';
            setTimeout(() => {
                loader.style.opacity = '0';
                loader.style.visibility = 'hidden';
                setTimeout(() => loader.remove(), 400);
            }, 200);
        }
    };

    window.showLoader = (title = "Initializing") => {
        injectLoader(title);
    };

    // Immediate Loader for perceived speed
    const injectLoader = (title = "Initializing") => {
        if (!isLoggedInPage) return; // Only show on logged-in pages
        if (document.getElementById('universal-loader')) return;

        const style = document.createElement('style');
        style.id = 'loader-important-styles';
        style.textContent = `
            #universal-loader {
                position: fixed !important;
                inset: 0 !important;
                background: #000000 !important;
                z-index: 100000 !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 3rem !important;
                transition: opacity 0.4s ease, visibility 0.4s ease !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            #loader-bar-container {
                width: 16rem !important;
                height: 0.25rem !important;
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 9999px !important;
                overflow: hidden !important;
            }
            #loader-bar {
                height: 100% !important;
                background: #ffffff !important;
                width: 0% !important;
                transition: width 0.5s ease-out !important;
                box-shadow: 0 0 15px #fff !important;
            }
            .loader-logo {
                height: 5rem !important;
                width: auto !important;
                margin-bottom: 2rem !important;
            }
            .loader-title {
                color: #ffffff !important;
                font-size: 2.25rem !important;
                font-weight: 300 !important;
                letter-spacing: -0.05em !important;
                text-transform: uppercase !important;
                font-family: 'Geist', sans-serif !important;
                font-style: italic !important;
                margin-bottom: 1rem !important;
            }
        `;
        document.head.appendChild(style);

        const loaderDiv = document.createElement('div');
        loaderDiv.id = 'universal-loader';
        loaderDiv.innerHTML = `
            <div class="flex flex-col items-center scale-110">
                <img src="/images/logo.png" class="loader-logo animate-pulse" alt="Logo">
                <div class="flex flex-col items-center">
                    <h2 id="loader-title" class="loader-title">${title}</h2>
                    <div id="loader-bar-container">
                        <div id="loader-bar"></div>
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
            if (bar) bar.style.width = '40%';
        });

        // Safety Timeout: Auto-hide after 6 seconds if navigation fails to dismiss it
        setTimeout(window.hideLoader, 6000);
    };

    // Run injection logic
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => injectLoader());
        injectLoader(); // Try early
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
            window.hideLoader(); // Dismiss on error
        });

})();
