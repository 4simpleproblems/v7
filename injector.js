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

    // --- V6.5 Announcement Modal ---
    const showV65Announcement = () => {
        if (localStorage.getItem('v65_seen')) return;

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'v65-announcement-modal';
        modalOverlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999999;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(20px);
            display: flex; align-items: center; justify-content: center;
            padding: 2rem; transition: opacity 0.4s ease;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: #080808; border: 1px solid rgba(255,255,255,0.05);
            border-radius: 40px; width: 100%; max-width: 900px;
            padding: 4rem; position: relative; overflow: hidden;
            box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5);
            color: #fff; font-family: 'Geist', sans-serif;
        `;

        modalContent.innerHTML = `
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #4f46e5, #818cf8);"></div>
            <div style="display: flex; gap: 4rem; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
                        <div style="width: 48px; height: 48px; background: rgba(79, 70, 229, 0.1); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #4f46e5; border: 1px solid rgba(79, 70, 229, 0.2);">
                            <i class="fas fa-sparkles"></i>
                        </div>
                        <div>
                            <h2 style="font-size: 2.5rem; font-weight: 200; letter-spacing: -0.05em; margin: 0; line-height: 1;">4SP V6.5</h2>
                            <p style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #4f46e5; margin-top: 0.5rem;">Infrastructure Evolution</p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 3rem;">
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: rgba(255,255,255,0.9);">🚀 Supabase Migration</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">We've moved almost everything to Supabase for better performance. This <b>resets</b> the global leaderboard status to keep things fresh and fast.</p>
                        </div>
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: rgba(255,255,255,0.9);">👾 Discord Login</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">You can now sign in using your Discord account! Connect with friends more easily across the network.</p>
                        </div>
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: rgba(255,255,255,0.9);">📸 Redesigned DailyPhoto</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">DailyPhoto has been completely rebuilt with a modern, focus-driven UI. Experience sharing in a whole new way.</p>
                        </div>
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: rgba(255,255,255,0.9);">🛡️ Still in Beta</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">We are continuously optimizing. Expect bugs and frequent updates as we scale to V7.</p>
                        </div>
                    </div>

                    <div style="padding: 1.5rem; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 3rem;">
                        <p style="font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; line-height: 1.5;">Found a bug? Help us improve by emailing <a href="mailto:4simpleproblems+feedback@gmail.com" style="color: #4f46e5; text-decoration: none; font-weight: 600;">4simpleproblems+feedback@gmail.com</a></p>
                    </div>

                    <button id="close-v65-btn" style="width: 100%; padding: 1.25rem; background: #4f46e5; border: none; border-radius: 20px; color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.2);">
                        Enter V6.5
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        modalOverlay.appendChild(modalContent);

        document.getElementById('close-v65-btn').onclick = () => {
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.remove();
                localStorage.setItem('v65_seen', 'true');
            }, 400);
        };
    };

    // 2. CORE DYNAMIC LOADING FUNCTION
    async function loadScript(config) {
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
        
        // Show announcement after Supabase is ready but before scripts (or parallel)
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showV65Announcement);
        } else {
            showV65Announcement();
        }

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
// Made with ❤️ from 4SP
