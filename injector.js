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
            window.supabaseConfig = supabaseConfig; // Global for scripts like navigation.js
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
            <div style="display: flex; gap: 4rem; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
                        <img src="/images/logo.png" style="width: 48px; height: 48px; object-fit: contain;">
                        <div>
                            <h2 style="font-size: 2.5rem; font-weight: 200; letter-spacing: -0.05em; margin: 0; line-height: 1;">4SP V6.5 Release Notes</h2>
                            <p style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #4f46e5; margin-top: 0.5rem;">Evolutionary Efficiency</p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 3rem;">
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: rgba(255,255,255,0.9);">🚀 Supabase Migration</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">We’ve transitioned nearly all infrastructure to Supabase for enhanced speed and reliability. This migration resets the global leaderboard to provide a fresh and optimized experience for everyone.</p>
                        </div>
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: rgba(255,255,255,0.9);">👾 Discord Login</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">Sign in seamlessly with your Discord account! Effortlessly connect and share with friends across the 4SP network.</p>
                        </div>
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: rgba(255,255,255,0.9);">📸 Redesigned Dailyphoto</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">Dailyphoto is now rebuilt from the ground up with a sleek, modern UI that puts your content front and center. Enjoy a smoother, more engaging sharing experience.</p>
                        </div>
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: rgba(255,255,255,0.9);">🛡️ Beta Status</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">4SP remains in beta as we continue to launch frequent updates and improvements. Some bugs may persist as we ramp up toward V7.</p>
                        </div>
                    </div>

                    <div style="padding: 1.5rem; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 3rem;">
                        <p style="font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; line-height: 1.5;">Found a bug? Help us improve by emailing <a href="mailto:4simpleproblems+feedback@gmail.com" style="color: #4f46e5; text-decoration: none; font-weight: 600;">4simpleproblems+feedback@gmail.com</a></p>
                    </div>

                    <button id="close-v65-btn" style="width: 100%; padding: 1rem 2rem; background: rgba(79, 70, 229, 0.1); border: 1px solid #4f46e5; border-radius: 24px; color: #4f46e5; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        Enter V6.5 <i class="fas fa-arrow-right" style="font-size: 0.8rem;"></i>
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
                
                // --- V6.9 Banning Toast Notification ---
                // If the user was redirected due to a ban, show the reason on the landing page
                const checkBanToast = () => {
                    const reason = localStorage.getItem('__4sp_ban_reason');
                    if (reason) {
                        if (window.showNotification) {
                            // Detect which notification system is active
                            const isMini = !!document.getElementById('notification-container');
                            if (isMini) {
                                // navigation-mini.js signature: (message, iconClass, type, duration)
                                window.showNotification(`Suspended: ${reason}`, 'fa-solid fa-ban', 'error', 10000);
                            } else {
                                // navigation.js signature: (message, skipHistory, duration)
                                window.showNotification(`Suspended: ${reason}`, true, 10000);
                            }
                            localStorage.removeItem('__4sp_ban_reason');
                        } else {
                            setTimeout(checkBanToast, 100);
                        }
                    }
                };
                setTimeout(checkBanToast, 1000);
            })
            .catch(error => {
                console.error('Loader encountered errors during script loading:', error);
            });
    };
    start();

})();
