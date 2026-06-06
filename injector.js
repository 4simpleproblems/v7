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

    const THEME_STORAGE_KEY = 'user-navbar-theme';
    const lightThemeNames = ['Light', 'Potato', 'Mint', 'Lavender', 'Rose Gold', 'V3 Original'];
    const DEFAULT_THEME = {
        "name": "Dark",
        "logo-src": "/images/logo.png",
        "navbar-bg": "#0B0A10",
        "navbar-border": "#2D273D",
        "avatar-gradient": "linear-gradient(135deg, #2D273D 0%, #0B0A10 100%)",
        "avatar-border": "#9D7BFF",
        "menu-bg": "#0B0A10",
        "menu-border": "#2D273D",
        "menu-divider": "rgba(255,255,255,0.05)",
        "menu-text": "#ffffff",
        "menu-item-hover-bg": "rgba(157, 123, 255, 0.1)",
        "menu-item-hover-text": "#9D7BFF",
        "glass-menu-bg": "rgba(11, 10, 16, 0.8)",
        "glass-menu-border": "rgba(45, 39, 61, 0.8)",
        "logged-out-icon-bg": "rgba(157, 123, 255, 0.1)",
        "logged-out-icon-border": "#2D273D",
        "logged-out-icon-color": "#9D7BFF",
        "glide-btn-color": "#9D7BFF",
        "glide-gradient-left": "linear-gradient(to right, #0B0A10, transparent)",
        "glide-gradient-right": "linear-gradient(to left, #0B0A10, transparent)",
        "tab-text": "#C4B0FF",
        "tab-hover-text": "#ffffff",
        "tab-hover-border": "#9D7BFF",
        "tab-hover-bg": "rgba(157, 123, 255, 0.05)",
        "tab-active-text": "#ffffff",
        "tab-active-border": "#9D7BFF",
        "tab-active-bg": "rgba(157, 123, 255, 0.1)",
        "tab-active-hover-text": "#C4B0FF",
        "tab-active-hover-border": "#9D7BFF",
        "tab-active-hover-bg": "rgba(157, 123, 255, 0.15)",
        "pin-btn-border": "#2D273D",
        "pin-btn-hover-bg": "rgba(157, 123, 255, 0.1)",
        "pin-btn-icon-color": "#9D7BFF",
        "hint-bg": "#15131C",
        "hint-border": "#2D273D",
        "hint-text": "#C4B0FF",
        "bg-primary": "#0B0A10",
        "bg-secondary": "#15131C",
        "text-primary": "#ffffff",
        "text-secondary": "#C4B0FF",
        "accent-primary": "#9D7BFF",
        "accent-secondary": "rgba(157, 123, 255, 0.4)",
        "border-primary": "#2D273D",
        "border-secondary": "rgba(255,255,255,0.05)",
        "button-bg": "rgba(157, 123, 255, 0.1)",
        "button-text": "#9D7BFF"
    };

    window.applyTheme = (theme) => {
        const root = document.documentElement;
        if (!root) return;
        const themeToApply = theme && typeof theme === 'object' ? theme : DEFAULT_THEME;
        const isLightTheme = lightThemeNames.includes(themeToApply.name);

        const resolveRelativePath = (absolutePath) => {
            if (!absolutePath || !absolutePath.startsWith('/')) return absolutePath;
            let depth = 0;
            const path = window.location.pathname.toLowerCase();
            if (path.includes('/logged-in/')) {
                depth = 1;
            } else if (path.includes('/valo_plus/') || path.includes('/ytmusic/') || path.includes('/games/') || path.includes('/vora/') || path.includes('/vora_plus/') || path.includes('/vira/')) {
                const match = path.match(/\/(valo_plus|ytmusic|games|vora|vora_plus|vira)\/(.+)/);
                if (match) {
                    const rest = match[2];
                    const slashCount = (rest.match(/\//g) || []).length;
                    depth = 1 + slashCount;
                } else {
                    depth = 1;
                }
            }
            if (depth === 0) {
                return '.' + absolutePath;
            } else {
                return '../'.repeat(depth) + absolutePath.substring(1);
            }
        };

        for (const [key, value] of Object.entries(themeToApply)) {
            if (key !== 'logo-src' && key !== 'name' && key !== 'original-css' && key !== 'effect') {
                root.style.setProperty(`--${key}`, value);
            }
        }

        root.style.setProperty('--bg-page', 'var(--bg-primary)');
        root.style.setProperty('--bg-card', 'var(--bg-secondary)');
        root.style.setProperty('--bg-container', 'var(--bg-secondary)');
        root.style.setProperty('--text-main', 'var(--text-primary)');
        root.style.setProperty('--text-muted', 'var(--text-secondary)');
        root.style.setProperty('--accent-color', 'var(--accent-primary)');
        root.style.setProperty('--accent-glow', 'var(--accent-secondary)');
        root.style.setProperty('--border-main', 'var(--border-primary)');
        root.style.setProperty('--border-color', 'var(--border-primary)');
        root.style.setProperty('--border-faint', 'var(--border-secondary)');
        root.style.setProperty('--btn-bg', 'var(--button-bg)');
        root.style.setProperty('--btn-text', 'var(--button-text)');

        const existingLink = document.getElementById('originals-stylesheet');
        if (themeToApply['original-css']) {
            const resolvedCSS = resolveRelativePath(themeToApply['original-css']);
            if (existingLink) {
                existingLink.href = resolvedCSS;
            } else {
                const link = document.createElement('link');
                link.id = 'originals-stylesheet';
                link.rel = 'stylesheet';
                link.href = resolvedCSS;
                document.head.appendChild(link);
            }
        } else {
            if (existingLink) {
                existingLink.remove();
            }
        }

        const fixId = '4sp-theme-contrast-fix';
        let styleEl = document.getElementById(fixId);
        if (isLightTheme) {
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = fixId;
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = `
                .text-white:not(.keep-white), 
                .text-gray-100, .text-gray-200, .text-gray-300 { 
                    color: var(--text-primary) !important; 
                }
                .text-white\\/80, .text-white\\/60, .text-gray-400, .text-gray-500 { 
                    color: var(--text-secondary) !important; 
                }
                h1, h2, h3, h4, h5, h6 { color: var(--text-primary) !important; }
                .bg-indigo-600 .text-white, 
                .bg-red-600 .text-white,
                .bg-blue-600 .text-white,
                button[class*="bg-indigo-"] .text-white,
                .primary-cta { color: #ffffff !important; }
                #deletionSection p, #deletionSection label, #deletionSection .text-red-300 { color: #fee2e2 !important; }
                div#deletionSection { background-color: rgba(153, 27, 27, 0.9) !important; border-color: #ef4444 !important; }
                .fa-x-twitter, .fa-github { color: #000000 !important; }
            `;
        } else if (styleEl) {
            styleEl.remove();
        }

        const globalStyleId = '4sp-global-redesign-styles';
        let globalStyleEl = document.getElementById(globalStyleId);
        if (!globalStyleEl) {
            globalStyleEl = document.createElement('style');
            globalStyleEl.id = globalStyleId;
            document.head.appendChild(globalStyleEl);
        }
        globalStyleEl.textContent = `
            body {
                font-family: 'Manrope', sans-serif !important;
                background-color: var(--bg-page) !important;
                color: var(--text-main) !important;
            }
            .grid-bg {
                background-image: radial-gradient(var(--border-faint) 1px, transparent 0) !important;
                background-size: 24px 24px !important;
            }
            #dynamic-background {
                position: fixed !important;
                inset: 0 !important;
                background: radial-gradient(circle at 50% 20%, var(--accent-glow), transparent 65%) !important;
                pointer-events: none !important;
                z-index: -1 !important;
                opacity: 0.5 !important; 
            }
            .gradient-text {
                background-image: linear-gradient(90deg, var(--accent-color, #9D7BFF), var(--text-muted, #C4B0FF), var(--accent-color, #9D7BFF)) !important;
                -webkit-background-clip: text !important;
                -webkit-text-fill-color: transparent !important;
                background-clip: text !important;
                background-size: 300% auto !important;
                animation: shine 8s linear infinite !important;
            }
            @keyframes shine {
                to { background-position: 300% center; }
            }
            .feature-card {
                border-radius: 2rem !important;
                border: 1px solid var(--border-main) !important;
                background: var(--bg-card) !important;
                box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5) !important;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                position: relative !important;
                overflow: hidden !important;
            }
            .feature-card:hover {
                border-color: var(--accent-color) !important;
                transform: scale(1.02) translateY(-4px) !important;
                box-shadow: 0 20px 40px -10px var(--accent-glow) !important;
            }
            .feature-card:active {
                transform: scale(0.97) !important;
            }
            .btn-primary-override {
                background-color: var(--btn-bg) !important;
                border: 1px solid var(--accent-color) !important;
                color: var(--accent-color) !important;
                outline: 1px solid var(--accent-glow) !important;
                border-radius: 1.5rem !important;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
            }
            .btn-primary-override:hover {
                background-color: var(--accent-color) !important;
                color: #fff !important;
                transform: scale(1.02) translateY(-4px) !important;
                outline: 1px solid rgba(255,255,255,0.2) !important;
                box-shadow: 0 10px 30px -10px var(--accent-glow) !important;
            }
            .btn-primary-override:active {
                transform: scale(0.97) !important;
            }
            html.custom-scroll::-webkit-scrollbar, body.custom-scroll::-webkit-scrollbar {
                width: 6px !important;
            }
            html.custom-scroll::-webkit-scrollbar-track, body.custom-scroll::-webkit-scrollbar-track {
                background: transparent !important;
            }
            html.custom-scroll::-webkit-scrollbar-thumb, body.custom-scroll::-webkit-scrollbar-thumb {
                background: var(--border-main) !important;
                border-radius: 10px !important;
            }
            html.custom-scroll::-webkit-scrollbar-thumb:hover, body.custom-scroll::-webkit-scrollbar-thumb:hover {
                background: #333 !important;
            }
        `;
    };

    const ensureManropeFont = () => {
        if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Manrope"]')) {
            const preconnect1 = document.createElement('link');
            preconnect1.rel = 'preconnect';
            preconnect1.href = 'https://fonts.googleapis.com';
            document.head.appendChild(preconnect1);

            const preconnect2 = document.createElement('link');
            preconnect2.rel = 'preconnect';
            preconnect2.href = 'https://fonts.gstatic.com';
            preconnect2.crossOrigin = 'anonymous';
            document.head.appendChild(preconnect2);

            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap';
            document.head.appendChild(fontLink);
        }
    };
    ensureManropeFont();

    const initPageLayout = () => {
        const body = document.body;
        if (!body) return;

        if (!body.classList.contains('grid-bg')) {
            body.classList.add('grid-bg');
        }
        if (!body.classList.contains('custom-scroll')) {
            body.classList.add('custom-scroll');
        }
        if (!document.documentElement.classList.contains('custom-scroll')) {
            document.documentElement.classList.add('custom-scroll');
        }

        body.style.setProperty('background-color', 'var(--bg-page)', 'important');
        body.style.setProperty('color', 'var(--text-main)', 'important');

        if (!document.getElementById('dynamic-background')) {
            const dynBg = document.createElement('div');
            dynBg.id = 'dynamic-background';
            body.insertBefore(dynBg, body.firstChild);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageLayout);
    } else {
        initPageLayout();
    }

    let savedTheme;
    try {
        savedTheme = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY));
    } catch (e) {
        savedTheme = null;
    }
    window.applyTheme(savedTheme || DEFAULT_THEME);

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

    // --- V7.0 Announcement Modal ---
    const showV70Announcement = () => {
        if (localStorage.getItem('v70_seen')) return;

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'v70-announcement-modal';
        modalOverlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999999;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(20px);
            display: flex; align-items: center; justify-content: center;
            padding: 2rem; transition: opacity 0.4s ease;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: #0B0A10; border: 1px solid #2D273D;
            border-radius: 40px; width: 100%; max-width: 900px;
            padding: 4rem; position: relative; overflow: hidden;
            box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5);
            color: #fff; font-family: 'Manrope', sans-serif;
        `;

        modalContent.innerHTML = `
            <div style="display: flex; gap: 4rem; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
                        <img src="/images/logo.png" style="width: 48px; height: 48px; object-fit: contain;">
                        <div>
                            <h2 style="font-size: 2.5rem; font-weight: 200; letter-spacing: -0.05em; margin: 0; line-height: 1;">4SP V7.0 Release Notes</h2>
                            <p style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #9D7BFF; margin-top: 0.5rem;">Overhauled Design & Freedom</p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 3rem;">
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: #C4B0FF;">✨ Design System Injection</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">Experience standard UI component enhancements powered by Manrope typography, vibrant dark palettes, and modular Bento grids.</p>
                        </div>
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: #C4B0FF;">⚡ Spring Interaction Physics</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">Tactile visual feedback: hover scales up smoothly with custom cubic-bezier spring physics, and clicking compresses the component.</p>
                        </div>
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: #C4B0FF;">🔑 Stateless Customization</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">Enjoy games, soundboard, Velium, and customize themes with local storage. Zero logins required for non-social utilities.</p>
                        </div>
                        <div>
                            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: #C4B0FF;">🛡️ High Score Tracking</h3>
                            <p style="font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.5); font-weight: 300;">Auth users unlock global cloud backup, saving game scores and favorites seamlessly to their Profiles.</p>
                        </div>
                    </div>

                    <div style="padding: 1.5rem; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 3rem;">
                        <p style="font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; line-height: 1.5;">Found a bug? Help us improve by emailing <a href="mailto:4simpleproblems+feedback@gmail.com" style="color: #9D7BFF; text-decoration: none; font-weight: 600;">4simpleproblems+feedback@gmail.com</a></p>
                    </div>

                    <button id="close-v70-btn" style="width: 100%; padding: 1rem 2rem; background: rgba(157, 123, 255, 0.1); border: 1px solid #9D7BFF; border-radius: 24px; color: #C4B0FF; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        Enter V7.0 <i class="fas fa-arrow-right" style="font-size: 0.8rem;"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        modalOverlay.appendChild(modalContent);

        document.getElementById('close-v70-btn').onclick = () => {
            modalOverlay.style.opacity = '0';
            setTimeout(() => {
                modalOverlay.remove();
                localStorage.setItem('v70_seen', 'true');
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
            document.addEventListener('DOMContentLoaded', showV70Announcement);
        } else {
            showV70Announcement();
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

                // --- Admin Keybinds for Soundboard Toggles ---
                document.addEventListener('keydown', async (e) => {
                    if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'f')) {
                        if (!window.supabase) return;

                        try {
                            const { data: { user } } = await window.supabase.auth.getUser();
                            if (!user) return;

                            const { data: profile } = await window.supabase.from('profiles').select('is_admin, email').eq('id', user.id).single();
                            const { data: roleData } = await window.supabase.from('roles').select('role').eq('user_id', user.id).maybeSingle();
                            
                            const isPrivileged = profile?.email === '4simpleproblems@gmail.com' || profile?.is_admin || roleData?.role === 'full_admin';

                            if (!isPrivileged) return;

                            e.preventDefault();
                            e.stopPropagation();

                            const key = e.key.toLowerCase() === 'e' ? 'soundboard_explicit' : 'soundboard_third_party';
                            const name = e.key.toLowerCase() === 'e' ? 'Explicit Sounds' : 'Third Party Sounds';

                            // Get current value
                            const { data: configData } = await window.supabase.from('config').select('value').eq('key', key).maybeSingle();
                            const currentValue = configData ? (configData.value === true || configData.value === 'true') : true;
                            const newValue = !currentValue;

                            // Update value
                            const { error } = await window.supabase.from('config').upsert({ key, value: newValue }, { onConflict: 'key' });

                            if (error) throw error;

                            const statusText = newValue ? 'ENABLED' : 'DISABLED';
                            const message = `${name}: ${statusText}`;

                            if (window.showNotification) {
                                const isMini = !!document.getElementById('notification-container');
                                if (isMini) {
                                    window.showNotification(message, newValue ? 'fa-solid fa-check' : 'fa-solid fa-xmark', newValue ? 'success' : 'error', 3000);
                                } else {
                                    window.showNotification(message, true, 3000);
                                }
                            } else {
                                alert(message);
                            }
                        } catch (err) {
                            console.error("Admin Keybind Error:", err);
                        }
                    }
                }, { capture: true });
            })
            .catch(error => {
                console.error('Loader encountered errors during script loading:', error);
            });
    };
    start();

})();
