/**
 * navigation.js (v6.7.2 - Supabase Ban Enforcer & Sync Fix)
 */

// Prevent multiple loads
if (window.__4sp_nav_loaded) {
    console.warn("Navigation.js already loaded, skipping...");
} else {
    window.__4sp_nav_loaded = true;

// =========================================================================
// >> ACTION REQUIRED: PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE <<
// =========================================================================
if (!window.FIREBASE_CONFIG) {
    window.FIREBASE_CONFIG = {
        apiKey: "AIzaSyAZBKAckVa4IMvJGjcyndZx6Y1XD52lgro",
        authDomain: "project-zirconium.firebaseapp.com",
        projectId: "project-zirconium",
        storageBucket: "project-zirconium.firebasestorage.app",
        messagingSenderId: "1096564243475",
        appId: "1:1096564243475:web:6d0956a70125eeea1ad3e6",
        measurementId: "G-1D4F692C1Q"
    };
}
// =========================================================================

// --- Configuration ---
window.PAGE_CONFIG_URL = window.PAGE_CONFIG_URL || '../page-identification.json';
const PRIVILEGED_EMAIL = '4simpleproblems@gmail.com'; 
const THEME_STORAGE_KEY = 'user-navbar-theme';
const lightThemeNames = ['Light', 'Lavender', 'Rose Gold', 'Mint', 'Pink', 'Birthday']; // Define light theme names

const DEFAULT_THEME = {
    'name': 'Dark',
    'logo-src': '/images/logo.png', 
    'navbar-bg': '#0B0A10',
    'navbar-border': '#2D273D',
    'avatar-gradient': 'linear-gradient(135deg, #2D273D 0%, #0B0A10 100%)',
    'avatar-border': '#2D273D',
    'menu-bg': '#15131C',
    'menu-border': '#2D273D',
    'menu-divider': '#2D273D',
    'menu-text': '#C4B0FF',
    'menu-username-text': '#ffffff', 
    'menu-email-text': '#C4B0FF', 
    'menu-item-hover-bg': '#211D2D', 
    'menu-item-hover-text': '#ffffff',
    'glass-menu-bg': 'rgba(21, 19, 28, 0.8)',
    'glass-menu-border': 'rgba(45, 39, 61, 0.8)',
    'logged-out-icon-bg': '#15131C',
    'logged-out-icon-border': '#2D273D',
    'logged-out-icon-color': '#C4B0FF',
    'glide-icon-color': '#ffffff',
    'glide-gradient-left': 'linear-gradient(to right, #0B0A10, transparent)',
    'glide-gradient-right': 'linear-gradient(to left, #0B0A10, transparent)',
    'tab-text': '#C4B0FF',
    'tab-hover-text': '#ffffff',
    'tab-hover-border': '#9D7BFF',
    'tab-hover-bg': 'rgba(157, 123, 255, 0.05)',
    'tab-active-text': '#9D7BFF',
    'tab-active-border': '#9D7BFF',
    'tab-active-bg': 'rgba(157, 123, 255, 0.1)',
    'tab-active-hover-text': '#C4B0FF',
    'tab-active-hover-border': '#C4B0FF',
    'tab-active-hover-bg': 'rgba(157, 123, 255, 0.15)',
    'pin-btn-border': '#2D273D',
    'pin-btn-hover-bg': '#211D2D',
    'pin-btn-icon-color': '#C4B0FF',
    'hint-bg': '#15131C',
    'hint-border': '#2D273D',
    'hint-text': '#ffffff',
    'bg-primary': '#0B0A10',
    'bg-secondary': '#15131C',
    'text-primary': '#ffffff',
    'text-secondary': '#C4B0FF',
    'accent-primary': '#9D7BFF',
    'accent-secondary': 'rgba(157, 123, 255, 0.4)',
    'border-primary': '#2D273D',
    'border-secondary': 'rgba(255,255,255,0.05)',
    'button-bg': 'rgba(157, 123, 255, 0.1)',
    'button-text': '#9D7BFF',
    'font-primary': "'Manrope', sans-serif",
    'font-secondary': "'Manrope', sans-serif"
};

let fireworksInstance = null; // Store fireworks instance globally

let unsubNotifs = null;
let unsubUserDoc = null;

function cleanupGlobalListeners() {
    if (unsubNotifs) { unsubNotifs(); unsubNotifs = null; }
    if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
}

window.addEventListener('pagehide', cleanupGlobalListeners);
window.addEventListener('beforeunload', cleanupGlobalListeners);

const hexToRgb = (hex) => {
    if (!hex || typeof hex !== 'string') return null;
    let c = hex.substring(1); 
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    if (c.length !== 6) return null;
    const num = parseInt(c, 16);
    return { r: (num >> 16) & 0xFF, g: (num >> 8) & 0xFF, b: (num >> 0) & 0xFF };
};

const getLuminance = (rgb) => {
    if (!rgb) return 0;
    const a = [rgb.r, rgb.g, rgb.b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
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

    const specialEffectsId = 'special-theme-effects';
    let effectStyleEl = document.getElementById(specialEffectsId);
    if (effectStyleEl) effectStyleEl.remove();

    const existingBefore = document.getElementById('matrix-before-style');
    if (existingBefore) existingBefore.remove();

    if (themeToApply.effect) {
        effectStyleEl = document.createElement('style');
        effectStyleEl.id = specialEffectsId;
        document.head.appendChild(effectStyleEl);

        if (themeToApply.effect === 'aurora') {
            effectStyleEl.textContent = 'body { background: linear-gradient(125deg, #020617, #0b1528, #071329, #020617) !important; background-size: 400% 400% !important; animation: aurora-bg-anim 15s ease infinite !important; } @keyframes aurora-bg-anim { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } .feature-card, .settings-box, .stat-pill, .theme-button { border-color: rgba(45, 212, 191, 0.4) !important; box-shadow: 0 0 15px rgba(45, 212, 191, 0.15), inset 0 0 10px rgba(45, 212, 191, 0.05) !important; }';
        } else if (themeToApply.effect === 'cyberpunk') {
            effectStyleEl.textContent = '.feature-card, .settings-box, .stat-pill, .theme-button { border-color: #ff007f !important; box-shadow: 0 0 8px #ff007f, inset 0 0 8px rgba(255, 0, 127, 0.2), 0 0 15px #00ffff, inset 0 0 15px rgba(0, 255, 255, 0.2) !important; animation: cyberpunk-pulse-anim 3s infinite alternate !important; } @keyframes cyberpunk-pulse-anim { 0% { border-color: #ff007f; box-shadow: 0 0 8px #ff007f, 0 0 15px #00ffff; } 100% { border-color: #00ffff; box-shadow: 0 0 15px #ff007f, 0 0 8px #00ffff; } }';
        } else if (themeToApply.effect === 'matrix') {
            const beforeStyle = document.createElement('style');
            beforeStyle.id = 'matrix-before-style';
            beforeStyle.textContent = 'body::before { content: " "; display: block; position: fixed; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(57, 255, 20, 0.06), rgba(0, 255, 0, 0.02), rgba(57, 255, 20, 0.06)); z-index: 9999; background-size: 100% 3px, 6px 100%; pointer-events: none; }';
            document.head.appendChild(beforeStyle);
            effectStyleEl.textContent = '.feature-card, .settings-box, .stat-pill, .theme-button { font-family: "Courier New", Courier, monospace !important; border-color: #39FF14 !important; box-shadow: 0 0 10px rgba(57, 255, 20, 0.3) !important; text-shadow: 0 0 5px #39FF14 !important; }';
        } else if (themeToApply.effect === 'rgb') {
            effectStyleEl.textContent = '.feature-card, .settings-box, .stat-pill, .theme-button { animation: rgb-border-anim 6s linear infinite !important; border-width: 2px !important; } @keyframes rgb-border-anim { 0% { border-color: #ff0000; box-shadow: 0 0 10px rgba(255,0,0,0.2); } 17% { border-color: #ffff00; box-shadow: 0 0 10px rgba(255,255,0,0.2); } 33% { border-color: #00ff00; box-shadow: 0 0 10px rgba(0,255,0,0.2); } 50% { border-color: #00ffff; box-shadow: 0 0 10px rgba(0,255,255,0.2); } 67% { border-color: #0000ff; box-shadow: 0 0 10px rgba(0,0,255,0.2); } 83% { border-color: #ff00ff; box-shadow: 0 0 10px rgba(255,0,255,0.2); } 100% { border-color: #ff0000; box-shadow: 0 0 10px rgba(255,0,0,0.2); } }';
        }
    }

    // Determine lightest accent for card blur
    const lightestAccent = themeToApply['tab-active-hover-text'] || themeToApply['tab-active-text'] || themeToApply['accent-primary'] || '#ffffff';
    const rgb = hexToRgb(lightestAccent);
    const cardBlurBg = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.75)` : 'rgba(79, 70, 229, 0.75)';
    root.style.setProperty('--card-blur-bg', cardBlurBg);

    // Apply specific colors for light themes
    if (isLightTheme) {
        root.style.setProperty('--menu-username-text', '#000000'); 
        root.style.setProperty('--menu-email-text', '#333333');   
    } else {
        root.style.setProperty('--menu-username-text', themeToApply['menu-username-text'] || DEFAULT_THEME['menu-username-text']);
        root.style.setProperty('--menu-email-text', themeToApply['menu-email-text'] || DEFAULT_THEME['menu-email-text']);
    }

    // --- Global Text Contrast Fix for Light Themes ---
    const fixId = '4sp-theme-contrast-fix';
    let styleEl = document.getElementById(fixId);
    if (isLightTheme) {
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = fixId;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            /* Fix hardcoded light text in light themes */
            .text-white:not(.keep-white), 
            .text-gray-100, .text-gray-200, .text-gray-300 { 
                color: var(--text-primary) !important; 
            }
            .text-white\\/80, .text-white\\/60, .text-gray-400, .text-gray-500 { 
                color: var(--text-secondary) !important; 
            }
            /* Ensure headings are always primary text color */
            h1, h2, h3, h4, h5, h6 { color: var(--text-primary) !important; }
            
            /* Exceptions: Keep white text on dark buttons */
            .bg-indigo-600 .text-white, 
            .bg-red-600 .text-white,
            .bg-blue-600 .text-white,
            button[class*="bg-indigo-"] .text-white,
            .primary-cta { color: #ffffff !important; }

            /* Preserving vibrant red for settings delete section */
            #deletionSection p, #deletionSection label, #deletionSection .text-red-300 { color: #fee2e2 !important; }
            div#deletionSection { background-color: rgba(153, 27, 27, 0.9) !important; border-color: #ef4444 !important; }

            /* Invert X and Github logos to be black in light themes */
            .fa-x-twitter, .fa-github { color: #000000 !important; }
        `;
    } else if (styleEl) {
        styleEl.remove();
    }

    // --- Global Theme Shadow Sync ---
    const shadowFixId = '4sp-theme-shadow-sync';
    let shadowStyleEl = document.getElementById(shadowFixId);
    if (!shadowStyleEl) {
        shadowStyleEl = document.createElement('style');
        shadowStyleEl.id = shadowFixId;
        document.head.appendChild(shadowStyleEl);
    }
    shadowStyleEl.textContent = `
        /* Tint standard tailwind-style shadow classes */
        .shadow-sm { box-shadow: 0 1px 2px 0 var(--accent-secondary) !important; }
        .shadow { box-shadow: 0 1px 3px 0 var(--accent-secondary), 0 1px 2px -1px var(--accent-secondary) !important; }
        .shadow-md { box-shadow: 0 4px 6px -1px var(--accent-secondary), 0 2px 4px -2px var(--accent-secondary) !important; }
        .shadow-lg { box-shadow: 0 10px 15px -3px var(--accent-secondary), 0 4px 6px -4px var(--accent-secondary) !important; }
        .shadow-xl { box-shadow: 0 20px 25px -5px var(--accent-secondary), 0 8px 10px -6px var(--accent-secondary) !important; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px var(--accent-secondary) !important; }
        
        /* Force tint on all elements with box-shadow that aren't specific exceptions */
        [style*="box-shadow"], [class*="shadow"] {
            --tw-shadow-color: var(--accent-secondary) !important;
            --tw-ring-color: var(--accent-secondary) !important;
        }

        /* Specific menu and card shadows */
        .auth-menu-container, .notification-menu-container, #pin-context-menu {
            box-shadow: 0 10px 30px var(--accent-secondary) !important;
        }
        .viro-notif {
            box-shadow: 0 10px 25px -5px var(--accent-secondary) !important;
        }

        /* Custom Spring Physics and Hover/Active States */
        button, 
        a.btn-primary-override, 
        a.btn-toolbar-style, 
        a.hero-btn-base, 
        a.settings-tab, 
        .btn-primary-override,
        .btn-toolbar-style,
        .hero-btn-base,
        .carousel-button,
        .settings-tab,
        .theme-button,
        .feature-card,
        .settings-box {
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        button:hover, 
        a.btn-primary-override:hover, 
        a.btn-toolbar-style:hover, 
        a.hero-btn-base:hover, 
        a.settings-tab:hover, 
        .btn-primary-override:hover,
        .btn-toolbar-style:hover,
        .hero-btn-base:hover,
        .carousel-button:hover,
        .settings-tab:hover,
        .theme-button:hover,
        .feature-card:hover,
        .settings-box:hover {
            transform: scale(1.02) translateY(-4px) !important;
            border-color: #9D7BFF !important;
            box-shadow: 0 10px 20px rgba(157, 123, 255, 0.35) !important;
        }
        button:active, 
        a.btn-primary-override:active, 
        a.btn-toolbar-style:active, 
        a.hero-btn-base:active, 
        a.settings-tab:active, 
        .btn-primary-override:active,
        .btn-toolbar-style:active,
        .hero-btn-base:active,
        .carousel-button:active,
        .settings-tab:active,
        .theme-button:active,
        .feature-card:active,
        .settings-box:active {
            transform: scale(0.97) !important;
        }
    `;

    // --- Fireworks/Birthday Logic ---
    const fwContainer = document.getElementById('fireworks-container');
    if (fwContainer) {
        if (themeToApply.name === 'The New Year') {
            fwContainer.style.opacity = '1';
            // Start fireworks if not already running
            if (!fireworksInstance && (typeof Fireworks !== 'undefined')) {
                 const FireworksClass = Fireworks.default || Fireworks;
                 fireworksInstance = new FireworksClass(fwContainer, {
                     autoresize: true,
                     opacity: 1.0,
                     acceleration: 1.05,
                     friction: 0.97,
                     gravity: 1.5,
                     particles: 50,
                     traceLength: 3,
                     traceSpeed: 10,
                     explosion: 5,
                     intensity: 5,
                     flickering: 50,
                     lineStyle: 'round',
                     rocketsPoint: { min: 50, max: 50 }
                });
                fireworksInstance.start();
            } else if (fireworksInstance) {
                fireworksInstance.start();
            }
        } else if (themeToApply.name === 'Birthday') {
            fwContainer.style.opacity = '1';
            if (fireworksInstance) fireworksInstance.stop();
            
            if (window._bdayInterval) {
                clearInterval(window._bdayInterval);
                window._bdayInterval = null;
            }

            const triggerConfetti = () => {
                if (document.hidden) return;
                
                if (typeof party !== 'undefined') {
                    // Trigger from the center of the navbar container
                    party.confetti(fwContainer, {
                        count: party.variation.range(20, 40),
                        size: party.variation.range(0.6, 0.8),
                        spread: party.variation.range(40, 60),
                        speed: party.variation.range(200, 400),
                    });
                }
            };

            triggerConfetti();
            window._bdayInterval = setInterval(triggerConfetti, 5000);
        } else {
            fwContainer.style.opacity = '0';
            if (fireworksInstance) fireworksInstance.stop();
            if (window._bdayInterval) {
                clearInterval(window._bdayInterval);
                window._bdayInterval = null;
            }
        }
    }

    const logos = document.querySelectorAll('.navbar-logo, #navbar-logo');
    const tintColor = themeToApply['accent-primary'] || themeToApply['tab-active-text'] || '#ffffff';
    const accentGlow = themeToApply['accent-secondary'] || 'rgba(79, 70, 229, 0.4)';
    const cardHoverBg = accentGlow.replace(/0\.[0-9]+\)/, '0.45)').replace(/0\.[0-9]+$/, '0.45');

    const logoContainers = document.querySelectorAll('.navbar-logo-container');
    const isLightTheme = ['Light', 'Potato', 'Mint', 'Lavender', 'Rose Gold', 'V3 Original', 'V4 Original', 'V1 Original'].includes(themeToApply.name);

    logoContainers.forEach(container => {
        if (themeToApply.name === 'V2 Original') {
            container.innerHTML = '<div class="logo" style="font-size: 1.8rem; font-weight: 700; letter-spacing: -1.5px; color: #ffffff !important; font-family: var(--font-primary);">4SP</div>';
        } else {
            // Restore image if it was text
            if (container.querySelector('.logo')) {
                 container.innerHTML = `<img src="/images/logo.png" alt="4SP Logo" class="navbar-logo" id="navbar-logo">`;
            }
            const logoImg = container.querySelector('img');
            if (logoImg) {
                let newLogoSrc;
                if (themeToApply.name === 'Christmas') {
                    newLogoSrc = '/images/logo-christmas.png';
                } else if (themeToApply.name === 'Potato') {
                    newLogoSrc = '/images/potato.png';
                } else {
                    // Use dark logo for light themes (themes with white topbars)
                    const useDarkLogo = isLightTheme && themeToApply.name !== 'V1 Original'; // V1 has a dark bar even in light mode sometimes, but let's be safe
                    newLogoSrc = useDarkLogo ? '/images/logo-dark.png' : (themeToApply['logo-src'] || DEFAULT_THEME['logo-src']);
                }
                
                newLogoSrc = resolveRelativePath(newLogoSrc);
                
                const expectedSrc = new URL(newLogoSrc, window.location.href).href;
                if (logoImg.src !== expectedSrc) {
                    logoImg.src = newLogoSrc;
                }

                const noFilterThemes = ['Dark', 'Light', 'Christmas', 'Potato', 'V1 Original', 'V2 Original', 'V3 Original', 'V4 Original'];
                const isNoFilter = noFilterThemes.includes(themeToApply.name);
                
                const wasNoFilter = logoImg.style.transform === '' || logoImg.style.transform === 'none';
                const modeChanged = isNoFilter !== wasNoFilter;

                if (modeChanged) {
                    logoImg.style.transition = 'none';
                }

                if (isNoFilter) {
                    logoImg.style.filter = ''; 
                    logoImg.style.transform = '';
                } else {
                    logoImg.style.filter = `drop-shadow(100px 0 0 ${tintColor})`;
                    logoImg.style.transform = 'translateX(-100px)';
                }

                if (modeChanged) {
                    void logoImg.offsetWidth; 
                    logoImg.style.transition = 'filter 0.3s ease'; 
                }
            }
        }
    });

    // Fix Pin Menu Direction - Open to the right
    const pinFixId = '4sp-pin-menu-fix';
    let pinStyleEl = document.getElementById(pinFixId);
    if (!pinStyleEl) {
        pinStyleEl = document.createElement('style');
        pinStyleEl.id = pinFixId;
        document.head.appendChild(pinStyleEl);
    }
    pinStyleEl.textContent = `
        #pin-context-menu {
            left: 0 !important;
            right: auto !important;
            transform-origin: top left !important;
        }
    `;
};

let auth;
let db;

(function() {
    let allPages = {};    
    let currentUser = null;    
    let currentUserData = null;
    let currentIsPrivileged = false;
    let currentScrollLeft = 0; 
    let hasScrolledToActiveTab = false; 
    let globalClickListenerAdded = false;
    let authCheckCompleted = false; 
    let isRedirecting = false;

    const loadScript = (src, isModule = false) => {        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            if (isModule) {
                script.type = 'module';
            }
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    const loadCSS = (href) => {
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            document.head.appendChild(link);
        });
    };

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };
    
    const getIconClass = (iconName) => {
        if (!iconName) return '';
        const nameParts = iconName.trim().split(/\s+/).filter(p => p.length > 0);
        let stylePrefix = 'fa-solid'; 
        let baseName = '';
        const stylePrefixes = ['fa-solid', 'fa-regular', 'fa-light', 'fa-thin', 'fa-brands'];
        const existingPrefix = nameParts.find(p => stylePrefixes.includes(p));
        if (existingPrefix) stylePrefix = existingPrefix;
        const nameCandidate = nameParts.find(p => p.startsWith('fa-') && !stylePrefixes.includes(p));
        if (nameCandidate) {
            baseName = nameCandidate;
        } else {
            baseName = nameParts.find(p => !stylePrefixes.includes(p));
            if (baseName && !baseName.startsWith('fa-')) baseName = `fa-${baseName}`;
        }
        if (baseName) return `${stylePrefix} ${baseName}`;
        return '';
    };

    const isTabActive = (tabUrl, aliases) => {
        const currentPathname = window.location.pathname.toLowerCase();
        
        const cleanPath = (path) => {
            try {
                let resolved = new URL(path, window.location.origin).pathname.toLowerCase();
                if (resolved.endsWith('/index.html')) resolved = resolved.substring(0, resolved.lastIndexOf('/')) + '/';
                if (resolved.endsWith('.html')) resolved = resolved.slice(0, -5);
                if (resolved.length > 1 && resolved.endsWith('/')) resolved = resolved.slice(0, -1);
                return resolved;
            } catch (e) {
                return path; 
            }
        };

        const currentCanonical = cleanPath(currentPathname);
        const tabCanonical = cleanPath(tabUrl);
        if (currentCanonical === tabCanonical) return true;

        const tabPathSuffix = cleanPath(tabUrl);
        const tabSuffixClean = tabPathSuffix.startsWith('/') ? tabPathSuffix.substring(1) : tabPathSuffix;
        if (tabSuffixClean.length > 3 && currentCanonical.endsWith(tabSuffixClean)) return true;

        if (aliases && Array.isArray(aliases)) {
            for (const alias of aliases) {
                const aliasCanonical = cleanPath(alias);
                if (currentCanonical === aliasCanonical) return true;
                
                const aliasSuffixClean = aliasCanonical.startsWith('/') ? aliasCanonical.substring(1) : aliasCanonical;
                if (aliasSuffixClean.length > 3 && currentCanonical.endsWith(aliasSuffixClean)) return true;
            }
        }

        return false;
    };

        const PINNED_PAGE_KEY = 'navbar_pinnedPage';
        const PIN_BUTTON_HIDDEN_KEY = 'navbar_pinButtonHidden';
        const PIN_HINT_SHOWN_KEY = 'navbar_pinHintShown';

        const getCurrentPageKey = () => {
            const currentPathname = window.location.pathname.toLowerCase();
            let bestMatchKey = null;
            let longestMatchLength = 0; 

            const cleanPath = (path) => {
                try {
                    let resolved = new URL(path, window.location.origin).pathname.toLowerCase();
                    if (resolved.endsWith('/index.html')) resolved = resolved.substring(0, resolved.lastIndexOf('/')) + '/';
                    if (resolved.endsWith('.html')) resolved = resolved.slice(0, -5);
                    if (resolved.length > 1 && resolved.endsWith('/')) resolved = resolved.slice(0, -1);
                    return resolved;
                } catch (e) {
                    return path; 
                }
            };

            const currentCanonical = cleanPath(currentPathname);
            
            const potentialMatches = [];

            for (const [key, page] of Object.entries(allPages)) {
                const tabCanonical = cleanPath(page.url);
                let isMatch = false;

                if (currentCanonical === tabCanonical) {
                    isMatch = true;
                }

                const tabPathSuffix = cleanPath(page.url);
                const tabSuffixClean = tabPathSuffix.startsWith('/') ? tabPathSuffix.substring(1) : tabPathSuffix;
                if (!isMatch && tabSuffixClean.length > 3 && currentCanonical.endsWith(tabSuffixClean)) {
                    isMatch = true;
                }

                if (!isMatch && page.aliases && Array.isArray(page.aliases)) {
                    for (const alias of page.aliases) {
                        const aliasCanonical = cleanPath(alias);
                        if (currentCanonical === aliasCanonical) {
                            isMatch = true;
                            break;
                        }
                        const aliasSuffixClean = aliasCanonical.startsWith('/') ? aliasCanonical.substring(1) : aliasCanonical;
                        if (aliasSuffixClean.length > 3 && currentCanonical.endsWith(aliasSuffixClean)) {
                            isMatch = true;
                            break;
                        }
                    }
                }

                if (isMatch) {
                    potentialMatches.push({ key, canonicalUrl: tabCanonical });
                }
            }

            if (potentialMatches.length > 0) {
                potentialMatches.sort((a, b) => b.canonicalUrl.length - a.canonicalUrl.length);
                return potentialMatches[0].key;
            }

            return null; 
        };

        const getPinButtonHtml = () => {
            if (!currentUser) return '';
            const pinnedPageKey = localStorage.getItem(PINNED_PAGE_KEY);
            const isPinButtonHidden = localStorage.getItem(PIN_BUTTON_HIDDEN_KEY) === 'true';
            const currentPageKey = getCurrentPageKey();
            const pages = allPages;
            const pinnedPageData = (pinnedPageKey && pages[pinnedPageKey]) ? pages[pinnedPageKey] : null;

            if (isPinButtonHidden) return '';
            
            const pinButtonIcon = pinnedPageData ? getIconClass(pinnedPageData.icon) : 'fa-solid fa-map-pin';
            const pinButtonUrl = pinnedPageData ? pinnedPageData.url : '#'; 
            const pinButtonTitle = pinnedPageData ? `Go to ${pinnedPageData.name}` : 'Pin current page';

            const shouldShowRepin = (pinnedPageKey && pinnedPageKey !== currentPageKey) || (!pinnedPageKey && currentPageKey);
            
            const repinOption = shouldShowRepin
                ? `<button id="repin-button" class="auth-menu-link"><i class="fa-solid fa-thumbtack w-4"></i>Repin</button>` 
                : ''; 
            
            const removeOrHideOption = pinnedPageData 
                ? `<button id="remove-pin-button" class="auth-menu-link text-red-400 hover:text-red-300"><i class="fa-solid fa-xmark w-4"></i>Remove Pin</button>`
                : `<button id="hide-pin-button" class="auth-menu-link text-red-400 hover:text-red-300"><i class="fa-solid fa-eye-slash w-4"></i>Hide Button</button>`;

            return `
                <div id="pin-area-wrapper" class="relative flex-shrink-0 flex items-center">
                    <a href="${pinButtonUrl}" id="pin-button" class="w-10 h-10 border flex items-center justify-center hover:bg-gray-700 transition" title="${pinButtonTitle}" style="border-radius: 16px; border-width: 1px;">
                        <i id="pin-button-icon" class="${pinButtonIcon}"></i>
                    </a>
                    <div id="pin-context-menu" class="auth-menu-container closed" style="width: 12rem;">
                        ${repinOption}
                        ${removeOrHideOption}
                    </div>
                    <div id="pin-hint" class="pin-hint-container">
                        Right-click for options!
                    </div>
                </div>
            `;
        }

        const updatePinButtonArea = () => {
            const pinWrapper = document.getElementById('pin-area-wrapper');
            const newPinHtml = getPinButtonHtml();
            if (pinWrapper) {
                if (newPinHtml === '') {
                    pinWrapper.remove();
                } else {
                    pinWrapper.outerHTML = newPinHtml;
                }
                setupPinEventListeners();
            } else {
                const navLeft = document.getElementById('nav-left-controls');
                if (navLeft) {
                    navLeft.insertAdjacentHTML('beforeend', newPinHtml);
                    setupPinEventListeners();
                }
            }
            document.getElementById('auth-menu-container')?.classList.add('closed');
            document.getElementById('auth-menu-container')?.classList.remove('open');
        };

        const getLetterAvatarTextColor = (colorOrGradient) => {
            if (!colorOrGradient) return '#FFFFFF';
            const match = colorOrGradient.match(/#([0-9a-fA-F]{3}){1,2}/);
            const hex = match ? match[0] : colorOrGradient;
            if (!hex.startsWith('#')) return '#FFFFFF';
            try {
                const cleanHex = hex.startsWith('#') ? hex : '#' + hex;
                let r, g, b;
                if (cleanHex.length === 4) {
                    r = parseInt(cleanHex[1] + cleanHex[1], 16);
                    g = parseInt(cleanHex[2] + cleanHex[2], 16);
                    b = parseInt(cleanHex[3] + cleanHex[3], 16);
                } else {
                    r = parseInt(cleanHex.substring(1, 3), 16);
                    g = parseInt(cleanHex.substring(3, 5), 16);
                    b = parseInt(cleanHex.substring(5, 7), 16);
                }
                return (0.299 * r + 0.587 * g + 0.114 * b) > 128 ? '#000000' : '#FFFFFF';
            } catch (e) { return '#FFFFFF'; }
        };

        const getAvatarHTML = (userData, sizeClass = "w-10 h-10", forceCSS = false, authUser = null, roundedClass = "rounded-xl", scaleClass = "", clipOuterContainer = true) => {
            const pT = userData?.pfp_type || userData?.pfpType || 'user';
            const dN = userData?.display_name || userData?.displayName || userData?.username || authUser?.displayName || 'User';
            const customPfp = userData?.avatar_url || userData?.customPfp || userData?.photoURL;
            const letterBg = userData?.pfp_letter_bg || userData?.pfpLetterBg || DEFAULT_THEME['avatar-gradient'];
            const letterChar = userData?.pfp_letter_char || userData?.pfpLetterChar || (userData?.letterAvatarText) || dN;
            
            const sizeMap = { "w-10 h-10": 40, "w-full h-full": 128 };
            let px = 40;
            const match = sizeClass.match(/w-(\d+)/);
            if (match) px = parseInt(match[1]) * 4; 
            else px = sizeMap[sizeClass] || 40;

            let innerHTML = '';
            const innerClasses = `block min-w-full min-h-full w-full h-full object-cover ${scaleClass}`;

            if (pT === 'custom' && customPfp) {
                innerHTML = `<img src="${customPfp}" class="${innerClasses}">`;
            } else if (pT === 'mibi' && (userData?.mibi_config || userData?.mibiConfig)) {
                const config = userData.mibi_config || userData.mibiConfig;
                const { eyes, mouths, hats, bgColor, rotation, size, offsetX, offsetY } = config;
                innerHTML = `
                    <div class="w-full h-full relative overflow-hidden" style="background-color: ${bgColor || '#3B82F6'};">
                         <div class="absolute inset-0 w-full h-full" style="transform: translate(${offsetX || 0}%, ${offsetY || 0}%) rotate(${rotation || 0}deg) scale(${(size || 100) / 100}); transform-origin: center;">
                             <img src="/mibi-avatars/head.png" class="absolute inset-0 w-full h-full object-contain">
                             ${eyes ? `<img src="/mibi-avatars/eyes/${eyes}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                             ${mouths ? `<img src="/mibi-avatars/mouths/${mouths}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                             ${hats ? `<img src="/mibi-avatars/hats/${hats}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                         </div>
                    </div>
                `;
            } else if (pT === 'letter') {
                const letter = letterChar.charAt(0).toUpperCase();
                const fontSize = px * 0.35;
                const tC = getLetterAvatarTextColor(letterBg);
                innerHTML = `<div class="${innerClasses} flex items-center justify-center font-bold" style="background:${letterBg}; color: ${tC}; font-size: ${fontSize}px; line-height: 1;">${letter}</div>`;
            } else {
                let gP = customPfp;
                const rawMeta = userData?.raw_user_meta_data || authUser?.raw_user_meta_data || userData?.user_metadata || authUser?.user_metadata;
                if (!gP && rawMeta) gP = rawMeta.picture || rawMeta.avatar_url;
                if (!gP && authUser?.providerData) {
                    const googleProvider = authUser.providerData.find(p => p.providerId === 'google.com');
                    if (googleProvider) gP = googleProvider.photoURL;
                }

                if (gP) {
                    if (gP.includes('googleusercontent.com')) {
                        gP = gP.replace(/lh\d+\.googleusercontent\.com/g, 'lh3.googleusercontent.com');
                        if (gP.includes('=')) gP = gP.split('=')[0] + '=s500-c';
                        else if (!gP.includes('=s500-c')) gP = gP + '=s500-c';
                    }
                    const letter = letterChar.charAt(0).toUpperCase();
                    const fontSizeLetter = px * 0.35;
                    const tC = getLetterAvatarTextColor(letterBg);
                    const fallbackHTML = `<div class='flex items-center justify-center font-bold w-full h-full' style='background:${letterBg}; color: ${tC}; font-size: ${fontSizeLetter}px; line-height: 1;'>${letter}</div>`;
                    innerHTML = `<img src="${gP}" class="${innerClasses}" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.parentElement.innerHTML=\`${fallbackHTML}\` ">`;
                }
                if (!innerHTML) {
                    const fontSizeIcon = px * 0.4;
                    innerHTML = `<div class="${innerClasses} flex items-center justify-center bg-indigo-600/20 text-indigo-500" style="font-size: ${fontSizeIcon}px;"><i class="fa-solid fa-user"></i></div>`;
                }
            }
            const outerClasses = `${sizeClass} aspect-square ${roundedClass} shrink-0 flex items-center justify-center overflow-hidden border border-white/5`;
            return `<div class="${outerClasses}">${innerHTML}</div>`;
        };

        const getProfileButtonHtml = (user, userData) => {
            if (!user) return '';
            
            // Normalize field access
            const username = userData?.username || user.displayName?.toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
            const dN = userData?.display_name || userData?.displayName || user.displayName || userData?.username || "user";
            
            const avatarHtml = getAvatarHTML(userData, "w-10 h-10", false, user, "rounded-xl");
            const isOnline = userData?.isOnline || (userData?.is_online) || false;

            const followers = userData?.followerCount || 0;
            const following = userData?.followingCount || 0;
            const followersDisplay = followers > 999 ? (followers / 1000).toFixed(1) + 'k' : followers;
            const followingDisplay = following > 999 ? (following / 1000).toFixed(1) + 'k' : following;

            const userTagHtml = (userData?.user_tag || userData?.userTag) 
                ? `<div class="text-xs font-italic" style="color: ${(userData.user_tag || userData.userTag).color}; font-style: italic; margin-top: 2px;">${(userData.user_tag || userData.userTag).text}</div>`
                : '';

            const statusHtml = isOnline 
                ? `<div class="flex items-center gap-1.5 mt-1 overflow-hidden">
                     <span class="w-2 h-2 rounded-full bg-[var(--accent-color)] animate-pulse shadow-[0_0_8px_var(--accent-glow)] flex-shrink-0"></span>
                     <span class="text-[10px] text-[var(--accent-color)] font-medium uppercase tracking-wider truncate">Online</span>
                   </div>`
                : `<div class="flex items-center gap-1.5 mt-1 overflow-hidden">
                     <span class="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0"></span>
                     <span class="text-[10px] text-gray-500 font-medium uppercase tracking-wider truncate">Offline</span>
                   </div>`;

            return `
                <div id="profile-area-wrapper" class="relative flex-shrink-0 flex items-center">
                    <button id="profile-toggle" class="w-10 h-10 border border-gray-600 flex items-center justify-center hover:bg-gray-700 transition" style="border-radius: 14px; position: relative; background: var(--tab-hover-bg, rgba(79, 70, 229, 0.05));">
                        <i class="fa-solid fa-address-card text-gray-300"></i>
                        ${isOnline ? '<span class="absolute bottom-0.5 right-0.5 w-3 h-3 bg-[var(--accent-color)] border-2 border-black rounded-full shadow-[0_0_5px_var(--accent-glow)]"></span>' : ''}
                    </button>
                    <div id="profile-menu-container" class="auth-menu-container closed">
                        <div class="border border-gray-700/50 mb-2 w-full min-w-0 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition rounded-2xl p-2" onclick="window.location.href='/logged-in/@${username}'">
                            <div class="w-10 h-10 flex-shrink-0 relative" id="auth-menu-avatar-container">
                                ${avatarHtml}
                            </div>
                            <div class="min-w-0 flex-1 overflow-hidden">
                                <div class="marquee-container" id="displayname-marquee">
                                    <p class="text-sm auth-menu-displayname marquee-content">${dN}</p>
                                </div>
                                <div class="marquee-container" id="username-marquee">
                                    <p class="text-xs auth-menu-username-handle marquee-content">@${username}</p>
                                </div>
                                ${statusHtml}
                                ${userTagHtml}
                            </div>
                        </div>
                        <div class="profile-stat-container">
                            <div class="profile-stat-item" onclick="window.location.href='/logged-in/@${username}/followers'">
                                <span class="stat-count">${followersDisplay}</span>
                                <span class="stat-label">Followers</span>
                            </div>
                            <div class="profile-stat-item" onclick="window.location.href='/logged-in/@${username}/following'">
                                <span class="stat-count">${followingDisplay}</span>
                                <span class="stat-label">Following</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        };

        const getNotificationButtonHtml = () => {
            return `
                <div id="notification-area-wrapper" class="relative flex-shrink-0 flex items-center">
                    <button id="notification-button" class="w-10 h-10 border flex items-center justify-center hover:bg-gray-700 transition" title="Show Notifications" style="border-radius: 14px;">
                        <i class="fa-solid fa-bell text-gray-300"></i>
                    </button>
                    <div id="notification-menu-container" class="notification-menu-container closed">
                        <div class="notification-menu-header">
                            <span class="notification-menu-title">Notifications</span>
                            <button class="notification-menu-clear" id="clear-notifications">Clear All</button>
                        </div>
                        <div class="notification-list" id="notification-list-content">
                            <div class="notification-empty">No notifications yet</div>
                        </div>
                    </div>
                </div>
            `;
        }

        const getAuthControlsHtml = () => {
            const user = currentUser;
            const userData = currentUserData;
            const isAdmin = currentIsPrivileged;

            const loggedOutView = `
                <div id="auth-button-container" class="relative flex-shrink-0 flex items-center">
                    <button id="auth-toggle" class="w-10 h-10 border flex items-center justify-center hover:bg-gray-700 transition logged-out-auth-toggle">
                        <i class="fa-solid fa-user"></i>
                    </button>
                    <div id="auth-menu-container" class="auth-menu-container closed" style="width: 16rem;">
                        <a href="/authentication.html" class="auth-menu-link">
                            <i class="fa-solid fa-lock w-4"></i>
                            Authenticate
                        </a>
                        <button id="more-button" class="auth-menu-button">
                            <i id="more-button-icon" class="fa-solid fa-chevron-down w-4"></i>
                            <span id="more-button-text">Show More</span>
                        </button>
                        <div id="more-section" class="auth-menu-more-section">
                            <a href="/documentation.html" class="auth-menu-link">
                                <i class="fa-solid fa-book w-4"></i>
                                Documentation
                            </a>
                            <a href="../legal.html" class="auth-menu-link">
                                <i class="fa-solid fa-gavel w-4"></i>
                                Terms & Policies
                            </a>
                            <a href="https://buymeacoffee.com/4simpleproblems" class="auth-menu-link" target="_blank">
                                <i class="fa-solid fa-mug-hot w-4"></i>
                                Donate
                            </a>
                        </div>
                    </div>
                </div>
            `;

            const loggedInView = (user, userData) => {
                const avatarHtml = getAvatarHTML(userData, "w-10 h-10", false, user, "rounded-xl");
                
                const isPinHidden = localStorage.getItem(PIN_BUTTON_HIDDEN_KEY) === 'true';
                const showPinOption = isPinHidden 
                    ? `<button id="show-pin-button" class="auth-menu-link"><i class="fa-solid fa-map-pin w-4"></i>Show Pin Button</button>` 
                    : '';

                const adminSection = isAdmin ? `
                    <div class="border-t border-white/5 pt-2 mt-2 flex flex-col gap-1">
                        <p class="text-[9px] uppercase tracking-widest font-black opacity-30 px-3 mb-1">Administrative</p>
                        <a href="/logged-in/analytics.html" class="auth-menu-link">
                            <i class="fa-solid fa-chart-line w-4"></i> Analytics
                        </a>
                    </div>
                ` : '';

                const userTagHtml = (userData?.user_tag || userData?.userTag) 
                    ? `<div class="text-[10px] font-italic px-2 mb-1" style="color: ${(userData.user_tag || userData.userTag).color}; font-style: italic;">${(userData.user_tag || userData.userTag).text}</div>`
                    : '';

                return `
                    <div id="auth-button-container" class="relative flex-shrink-0 flex items-center">
                        <button id="auth-toggle" class="w-10 h-10 border border-gray-600 flex items-center justify-center hover:bg-gray-700 transition overflow-hidden p-0" style="border-radius: 14px; position: relative; background: var(--bg-secondary);">
                            ${avatarHtml}
                        </button>
                        <div id="auth-menu-container" class="auth-menu-container closed">
                            <div class="border-b mb-2 w-full min-w-0 flex items-center">
                                <div class="min-w-0 flex-1 overflow-hidden">
                                    <div class="marquee-container" id="email-marquee-auth">
                                        <p class="text-xs text-gray-400 auth-menu-email marquee-content">${user.email || 'No email'}</p>
                                    </div>
                                    ${userTagHtml}
                                </div>
                            </div>
                            <a href="/logged-in/settings.html" class="auth-menu-link">
                                <i class="fa-solid fa-gear w-4"></i>
                                Settings
                            </a>
                            ${showPinOption}
                            ${adminSection}
                            <button id="logout-button" class="auth-menu-button text-red-400 hover:bg-red-900/50 hover:text-red-300">
                                <i class="fa-solid fa-right-from-bracket w-4"></i>
                                Log Out
                            </button>
                             <button id="more-button" class="auth-menu-button">
                                <i id="more-button-icon" class="fa-solid fa-chevron-down w-4"></i>
                                <span id="more-button-text">Show More</span>
                            </button>
                            <div id="more-section" class="auth-menu-more-section">
                                <a href="/documentation.html" class="auth-menu-link">
                                    <i class="fa-solid fa-book w-4"></i>
                                    Documentation
                                </a>
                                <a href="../legal.html" class="auth-menu-link">
                                    <i class="fa-solid fa-gavel w-4"></i>
                                    Terms & Policies
                                </a>
                                <a href="https://buymeacoffee.com/4simpleproblems" class="auth-menu-link" target="_blank">
                                    <i class="fa-solid fa-mug-hot w-4"></i>
                                    Donate
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            };

            return `
                ${user ? loggedInView(user, userData) : loggedOutView}
            `;
        }

        const setupAuthToggleListeners = (user) => {
            const toggleButton = document.getElementById('auth-toggle');
            const menu = document.getElementById('auth-menu-container');

            const profileToggle = document.getElementById('profile-toggle');
            const profileMenu = document.getElementById('profile-menu-container');
            const notifButton = document.getElementById('notification-button');
            const notifMenu = document.getElementById('notification-menu-container');
            const clearNotifsBtn = document.getElementById('clear-notifications');

            if (notifButton && notifMenu) {
                notifButton.addEventListener('click', (e) => {
                    e.stopPropagation();

                    // Close other menus
                    const otherMenus = ['auth-menu-container', 'profile-menu-container', 'pin-context-menu'];
                    otherMenus.forEach(id => {
                        const m = document.getElementById(id);
                        if (m && m.classList.contains('open')) {
                            m.classList.remove('open');
                            m.classList.add('closing');
                            m.addEventListener('animationend', () => {
                                m.classList.remove('closing');
                                m.classList.add('closed');
                            }, { once: true });
                        }
                    });

                    if (notifMenu.classList.contains('open')) {
                        notifMenu.classList.remove('open');
                        notifMenu.classList.add('closing');
                        notifMenu.addEventListener('animationend', () => {
                            notifMenu.classList.remove('closing');
                            notifMenu.classList.add('closed');
                        }, { once: true });
                    } else {
                        notifMenu.classList.remove('closed');
                        notifMenu.classList.remove('closing');
                        notifMenu.classList.add('open');
                        updateNotificationMenu();
                    }
                });
            }

            if (clearNotifsBtn) {
                clearNotifsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    notificationHistory.length = 0;
                    updateNotificationMenu();
                });
            }

            if (profileToggle && profileMenu) {
                profileToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Close other menus
                    const otherMenus = ['auth-menu-container', 'pin-context-menu'];
                    otherMenus.forEach(id => {
                        const m = document.getElementById(id);
                        if (m && m.classList.contains('open')) {
                            m.classList.remove('open');
                            m.classList.add('closing');
                            m.addEventListener('animationend', () => {
                                m.classList.remove('closing');
                                m.classList.add('closed');
                            }, { once: true });
                        }
                    });

                    if (profileMenu.classList.contains('open')) {
                        profileMenu.classList.remove('open');
                        profileMenu.classList.add('closing');
                        profileMenu.addEventListener('animationend', () => {
                            profileMenu.classList.remove('closing');
                            profileMenu.classList.add('closed');
                        }, { once: true });
                    } else {
                        profileMenu.classList.remove('closed');
                        profileMenu.classList.remove('closing');
                        profileMenu.classList.add('open');
                        checkMarquees();
                    }
                });
            }

            if (toggleButton && menu) {
                toggleButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Close other menus
                    const otherMenus = ['profile-menu-container', 'pin-context-menu'];
                    otherMenus.forEach(id => {
                        const m = document.getElementById(id);
                        if (m && m.classList.contains('open')) {
                            m.classList.remove('open');
                            m.classList.add('closing');
                            m.addEventListener('animationend', () => {
                                m.classList.remove('closing');
                                m.classList.add('closed');
                            }, { once: true });
                        }
                    });

                    if (menu.classList.contains('open')) {
                        menu.classList.remove('open');
                        menu.classList.add('closing');
                        menu.addEventListener('animationend', () => {
                            menu.classList.remove('closing');
                            menu.classList.add('closed');
                        }, { once: true });
                    } else {
                        menu.classList.remove('closed');
                        menu.classList.remove('closing');
                        menu.classList.add('open');
                        checkMarquees();
                    }
                });
            }

            const moreButton = document.getElementById('more-button');
            const moreSection = document.getElementById('more-section');
            const moreButtonIcon = document.getElementById('more-button-icon');
            const moreButtonText = document.getElementById('more-button-text');

            if (moreButton && moreSection) {
                moreButton.addEventListener('click', () => {
                    // Toggle the 'expanded' class instead of inline display
                    const isExpanded = moreSection.classList.contains('expanded');
                    if (isExpanded) {
                        moreSection.classList.remove('expanded');
                    } else {
                        moreSection.classList.add('expanded');
                    }
                    moreButtonText.textContent = !isExpanded ? 'Show Less' : 'Show More';
                    moreButtonIcon.classList.toggle('fa-chevron-down', isExpanded);
                    moreButtonIcon.classList.toggle('fa-chevron-up', !isExpanded);
                });
            }

            const showPinButton = document.getElementById('show-pin-button');
            if (showPinButton) {
                showPinButton.addEventListener('click', () => {
                    localStorage.setItem(PIN_BUTTON_HIDDEN_KEY, 'false'); 
                    updateAuthControlsArea();
                });
            }

            if (user) {
                const logoutButton = document.getElementById('logout-button');
                if (logoutButton) {
                    // Remove existing listeners if any
                    const newLogoutButton = logoutButton.cloneNode(true);
                    logoutButton.parentNode.replaceChild(newLogoutButton, logoutButton);
                    
                    newLogoutButton.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            console.log("Navigation: Attempting logout...");
                            if (window.supabase) {
                                await window.supabase.auth.signOut();
                                console.log("Navigation: Supabase signed out.");
                            }
                            // Using the global firebase auth object if available
                            const firebaseAuth = typeof firebase !== 'undefined' ? firebase.auth() : auth;
                            if (firebaseAuth) await firebaseAuth.signOut();
                            console.log("Navigation: Firebase signed out.");
                            window.location.href = '/authentication.html';
                        } catch (err) {
                            console.error("Logout failed:", err);
                        }
                    });
                }
            }
        };

        const updateAuthControlsArea = () => {
            const authWrapper = document.getElementById('auth-controls-wrapper');
            if (!authWrapper) return;
            const profileHtml = getProfileButtonHtml(currentUser, currentUserData);
            const authHtml = getAuthControlsHtml();
            authWrapper.innerHTML = `${profileHtml}${authHtml}`;
            setupPinEventListeners();
            setupAuthToggleListeners(currentUser); 
        }

        const checkMarquees = () => {
            requestAnimationFrame(() => {
                const containers = document.querySelectorAll('.marquee-container');
                containers.forEach(container => {
                    const content = container.querySelector('.marquee-content');
                    if (!content) return;
                    container.classList.remove('active');
                    if (content.nextElementSibling && content.nextElementSibling.classList.contains('marquee-content')) {
                        content.nextElementSibling.remove();
                    }
                    if (content.offsetWidth > container.offsetWidth) {
                        container.classList.add('active');
                        const duplicate = content.cloneNode(true);
                        duplicate.setAttribute('aria-hidden', 'true'); 
                        content.style.paddingRight = '2rem'; 
                        duplicate.style.paddingRight = '2rem';
                        container.appendChild(duplicate);
                    } else {
                        content.style.paddingRight = '';
                    }
                });
            });
        };

        const rerenderNavbar = (preserveScroll = false) => {
             if (preserveScroll) {
                const tabContainer = document.querySelector('.tab-scroll-container');
                if (tabContainer) {
                    currentScrollLeft = tabContainer.scrollLeft;
                } else {
                    currentScrollLeft = 0;
                }
            }
            renderNavbar(currentUser, currentUserData, allPages, currentIsPrivileged);
        };

        const renderNavbar = (user, userData, pages, isPrivilegedUser) => {
            const container = document.getElementById('navbar-container');
            if (!container) return; 

            // --- Updated Selectors to Match new structure ---
            const tabContainer = document.getElementById('tabs-container');
            const authControlsWrapper = document.getElementById('auth-controls-wrapper');
            const navLeftControls = document.getElementById('nav-left-controls');
            const logos = document.querySelectorAll('.navbar-logo, #navbar-logo');

            // Preserve menu states
            const menuStates = {
                auth: document.getElementById('auth-menu-container')?.classList.contains('open'),
                profile: document.getElementById('profile-menu-container')?.classList.contains('open'),
                pin: document.getElementById('pin-context-menu')?.classList.contains('open'),
                notif: document.getElementById('notification-menu-container')?.classList.contains('open'),
                more: document.getElementById('more-section')?.classList.contains('expanded')
            };

            let currentTheme;            
            try {
                currentTheme = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)) || DEFAULT_THEME;
            } catch (e) { currentTheme = DEFAULT_THEME; }

            const logoPath = (currentTheme.name === 'Christmas') ? '/images/logo-christmas.png' :
                             (currentTheme.name === 'Potato') ? '/images/potato.png' :
                             currentTheme['logo-src'] || DEFAULT_THEME['logo-src'];
            
            logos.forEach(logoImg => {
                if (logoImg) logoImg.src = logoPath;
            });
            
            // Determine the single active page key first
            const activePageKey = getCurrentPageKey();

            // Check leaderboard eligibility
            const canSeeLeaderboard = !userData || (userData.leaderboardAccepted && !userData.leaderboardOptOut);

            const tabsHtml = Object.entries(pages || {})
                .filter(([key, page]) => {
                    if (page.adminOnly && !isPrivilegedUser) return false;
                    if (page.testerOnly && !(isPrivilegedUser || (userData && (userData.isTester || userData.tester)))) return false;
                    if (key === 'leaderboard' && !canSeeLeaderboard) return false;
                    return true;
                }) 
                .map(([key, page]) => { 
                    const isActive = (key === activePageKey); 
                    const activeClass = isActive ? 'active' : '';
                    const iconClasses = getIconClass(page.icon);
                    return `<a href="${page.url}" class="nav-tab ${activeClass}"><i class="${iconClasses} mr-2"></i>${page.name}</a>`;
                }).join('');

            if (tabContainer) {
                tabContainer.innerHTML = tabsHtml;
            }

            if (navLeftControls) {
                const pinHtml = getPinButtonHtml();
                const notifHtml = getNotificationButtonHtml();
                navLeftControls.innerHTML = `${notifHtml}${pinHtml}`;
            }

            if (authControlsWrapper) {
                const profileHtml = getProfileButtonHtml(user, userData);
                const authHtml = getAuthControlsHtml();
                authControlsWrapper.innerHTML = `${profileHtml}${authHtml}`;
            }

            // Restore menu states
            if (menuStates.auth) {
                const m = document.getElementById('auth-menu-container');
                if (m) { m.classList.remove('closed'); m.classList.add('open'); }
            }
            if (menuStates.profile) {
                const m = document.getElementById('profile-menu-container');
                if (m) { m.classList.remove('closed'); m.classList.add('open'); }
            }
            if (menuStates.pin) {
                const m = document.getElementById('pin-context-menu');
                if (m) { m.classList.remove('closed'); m.classList.add('open'); }
            }
            if (menuStates.notif) {
                const m = document.getElementById('notification-menu-container');
                if (m) { m.classList.remove('closed'); m.classList.add('open'); }
            }
            if (menuStates.more) {
                const s = document.getElementById('more-section');
                const t = document.getElementById('more-button-text');
                const i = document.getElementById('more-button-icon');
                if (s) s.classList.add('expanded');
                if (t) t.textContent = 'Show Less';
                if (i) { i.classList.remove('fa-chevron-down'); i.classList.add('fa-chevron-up'); }
            }

            const tabCount = tabContainer ? tabContainer.querySelectorAll('.nav-tab').length : 0;
            if (tabCount <= 9) {
                if(tabContainer) {
                    tabContainer.style.justifyContent = 'center';
                }
            } else {
                if(tabContainer) {
                    tabContainer.style.justifyContent = 'flex-start';
                }
            }

            setupEventListeners(user);

            let savedTheme;
            try {
                savedTheme = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY));
            } catch (e) { savedTheme = null; }
            window.applyTheme(savedTheme || DEFAULT_THEME); 

            if (currentScrollLeft > 0) {
                const savedScroll = currentScrollLeft;
                requestAnimationFrame(() => {
                    if (tabContainer) tabContainer.scrollLeft = savedScroll;
                    currentScrollLeft = 0; 
                    requestAnimationFrame(() => {
                        updateScrollGilders();
                    });
                });
            } else if (!hasScrolledToActiveTab) { 
                const activeTab = document.querySelector('.nav-tab.active');
                if (activeTab && tabContainer) {
                    const centerOffset = (tabContainer.offsetWidth - activeTab.offsetWidth) / 2;
                    const idealCenterScroll = activeTab.offsetLeft - centerOffset;
                    const maxScroll = tabContainer.scrollWidth - tabContainer.offsetWidth;
                    const extraRoomOnRight = maxScroll - idealCenterScroll;
                    let scrollTarget;

                    if (idealCenterScroll > 0 && extraRoomOnRight < centerOffset) {
                        scrollTarget = maxScroll + 50;
                    } else {
                        scrollTarget = Math.max(0, idealCenterScroll);
                    }
                    requestAnimationFrame(() => {
                        tabContainer.scrollLeft = scrollTarget;
                        requestAnimationFrame(() => {
                            updateScrollGilders();
                        });
                    });
                    hasScrolledToActiveTab = true; 
                } else if (tabContainer) {
                    requestAnimationFrame(() => {
                        updateScrollGilders();
                    });
                }
            }
            
            checkMarquees();
        };

        const updateScrollGilders = () => {
            const container = document.querySelector('.tab-scroll-container');
            const leftButton = document.getElementById('glide-left');
            const rightButton = document.getElementById('glide-right');
            const tabCount = document.querySelectorAll('.nav-tab').length;
            const isNotScrolling = container && container.style.flexGrow === '0';
            
            if (tabCount <= 9 || isNotScrolling) {
                if (leftButton) leftButton.classList.add('hidden');
                if (rightButton) rightButton.classList.add('hidden');
                return; 
            }

            if (!container || !leftButton || !rightButton) return;
            const hasHorizontalOverflow = container.scrollWidth > container.offsetWidth + 2; 

            if (hasHorizontalOverflow) {
                const isScrolledToLeft = container.scrollLeft <= 5;
                const maxScrollLeft = container.scrollWidth - container.offsetWidth;
                const isScrolledToRight = (container.scrollLeft + 5) >= maxScrollLeft;

                if (isScrolledToLeft) {
                    leftButton.classList.add('hidden');
                } else {
                    leftButton.classList.remove('hidden');
                }

                if (isScrolledToRight) {
                    rightButton.classList.add('hidden');
                } else {
                    rightButton.classList.remove('hidden');
                }
            } else {
                leftButton.classList.add('hidden');
                rightButton.classList.add('hidden');
            }
        };

        const forceScrollToRight = () => {
            const tabContainer = document.querySelector('.tab-scroll-container');
            if (!tabContainer) return;
            const maxScroll = tabContainer.scrollWidth - tabContainer.offsetWidth;
            requestAnimationFrame(() => {
                tabContainer.scrollLeft = maxScroll + 50;
                requestAnimationFrame(() => {
                    updateScrollGilders();
                });
            });
        };
        
        const setupPinEventListeners = () => {
            const pinButton = document.getElementById('pin-button');
            const pinContextMenu = document.getElementById('pin-context-menu');
            const repinButton = document.getElementById('repin-button');
            const removePinButton = document.getElementById('remove-pin-button');
            const hidePinButton = document.getElementById('hide-pin-button');

            if (pinButton && pinContextMenu) {
                pinButton.addEventListener('click', (e) => {
                    if (pinButton.getAttribute('href') === '#') {
                        e.preventDefault(); 
                        const hintShown = localStorage.getItem(PIN_HINT_SHOWN_KEY) === 'true';
                        if (!hintShown) {
                            const hintEl = document.getElementById('pin-hint');
                            if (hintEl) {
                                hintEl.classList.add('show');
                                localStorage.setItem(PIN_HINT_SHOWN_KEY, 'true');
                                setTimeout(() => {
                                    hintEl.classList.remove('show');
                                }, 6000); 
                            }
                        }
                        const currentPageKey = getCurrentPageKey();
                        if (currentPageKey) {
                            localStorage.setItem(PINNED_PAGE_KEY, currentPageKey);
                            updatePinButtonArea(); 
                        } else {
                            console.warn("This page cannot be pinned as it's not in page-identification.json");
                        }
                    }
                });

                pinButton.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    
                    // Close other menus
                    const otherMenus = ['auth-menu-container', 'profile-menu-container'];
                    otherMenus.forEach(id => {
                        const m = document.getElementById(id);
                        if (m && m.classList.contains('open')) {
                            m.classList.remove('open');
                            m.classList.add('closing');
                            m.addEventListener('animationend', () => {
                                m.classList.remove('closing');
                                m.classList.add('closed');
                            }, { once: true });
                        }
                    });

                    if (pinContextMenu.classList.contains('open')) {
                        pinContextMenu.classList.remove('open');
                        pinContextMenu.classList.add('closing');
                        pinContextMenu.addEventListener('animationend', () => {
                            pinContextMenu.classList.remove('closing');
                            pinContextMenu.classList.add('closed');
                        }, { once: true });
                    } else {
                        pinContextMenu.classList.remove('closed');
                        pinContextMenu.classList.remove('closing');
                        pinContextMenu.classList.add('open');
                    }
                });
            }

            if (repinButton) {
                repinButton.addEventListener('click', () => {
                    const currentPageKey = getCurrentPageKey();
                    if (currentPageKey) {
                        localStorage.setItem(PINNED_PAGE_KEY, currentPageKey);
                        updatePinButtonArea(); 
                    }
                    if (pinContextMenu && pinContextMenu.parentNode) {
                         pinContextMenu.classList.remove('open');
                         pinContextMenu.classList.add('closing');
                         pinContextMenu.addEventListener('animationend', () => {
                             pinContextMenu.classList.remove('closing');
                             pinContextMenu.classList.add('closed');
                         }, { once: true });
                    }
                });
            }
            if (removePinButton) {
                removePinButton.addEventListener('click', () => {
                    localStorage.removeItem(PINNED_PAGE_KEY);
                    updatePinButtonArea(); 
                });
            }
            if (hidePinButton) {
                hidePinButton.addEventListener('click', () => {
                    localStorage.setItem(PIN_BUTTON_HIDDEN_KEY, 'true');
                    updateAuthControlsArea();
                });
            }
        }

        const setupEventListeners = (user) => {
            const tabContainer = document.querySelector('.tab-scroll-container');
            const leftButton = document.getElementById('glide-left');
            const rightButton = document.getElementById('glide-right');
            const debouncedUpdateGilders = debounce(updateScrollGilders, 50);

            if (tabContainer) {
                const scrollAmount = tabContainer.offsetWidth * 0.8; 
                tabContainer.addEventListener('scroll', updateScrollGilders);
                
                window.addEventListener('resize', () => {
                    debouncedUpdateGilders();
                });
                
                if (leftButton) {
                    leftButton.addEventListener('click', () => {
                        tabContainer.scrollLeft = 0; 
                    });
                }
                if (rightButton) {
                    rightButton.addEventListener('click', () => {
                        const maxScroll = tabContainer.scrollWidth - tabContainer.offsetWidth;
                        tabContainer.scrollLeft = maxScroll; 
                    });
                }
            }

            setupAuthToggleListeners(user);
            setupPinEventListeners();

            if (!globalClickListenerAdded) {
                document.addEventListener('click', (e) => {
                    const authMenu = document.getElementById('auth-menu-container');
                    const authToggle = document.getElementById('auth-toggle');
                    
                    if (authMenu && authMenu.classList.contains('open')) {
                        if (!authMenu.contains(e.target) && (authToggle && !authToggle.contains(e.target))) {
                            authMenu.classList.remove('open');
                            authMenu.classList.add('closing');
                            authMenu.addEventListener('animationend', () => {
                                authMenu.classList.remove('closing');
                                authMenu.classList.add('closed');
                            }, { once: true });
                        }
                    }

                    const profileMenu = document.getElementById('profile-menu-container');
                    const profileToggle = document.getElementById('profile-toggle');

                    if (profileMenu && profileMenu.classList.contains('open')) {
                        if (!profileMenu.contains(e.target) && (profileToggle && !profileToggle.contains(e.target))) {
                            profileMenu.classList.remove('open');
                            profileMenu.classList.add('closing');
                            profileMenu.addEventListener('animationend', () => {
                                profileMenu.classList.remove('closing');
                                profileMenu.classList.add('closed');
                            }, { once: true });
                        }
                    }

                    const notifMenu = document.getElementById('notification-menu-container');
                    const notifButton = document.getElementById('notification-button');
                    if (notifMenu && notifMenu.classList.contains('open')) {
                        if (!notifMenu.contains(e.target) && (notifButton && !notifButton.contains(e.target))) {
                            notifMenu.classList.remove('open');
                            notifMenu.classList.add('closing');
                            notifMenu.addEventListener('animationend', () => {
                                notifMenu.classList.remove('closing');
                                notifMenu.classList.add('closed');
                            }, { once: true });
                        }
                    }
                    
                    const pinButton = document.getElementById('pin-button');
                    const pinContextMenu = document.getElementById('pin-context-menu');

                    if (pinContextMenu && pinContextMenu.classList.contains('open')) {
                        if (!pinContextMenu.contains(e.target) && (pinButton && !pinButton.contains(e.target))) {
                            pinContextMenu.classList.remove('open');
                            pinContextMenu.classList.add('closing');
                            pinContextMenu.addEventListener('animationend', () => {
                                pinContextMenu.classList.remove('closing');
                                pinContextMenu.classList.add('closed');
                            }, { once: true });
                        }
                    }
                });
                
                window.addEventListener('pfp-updated', (e) => {
                    if (!currentUserData) currentUserData = {};
                    Object.assign(currentUserData, e.detail);
                    
                    const newAvatarHtml = getAvatarHTML(currentUserData, "w-10 h-10", false, currentUser, "rounded-xl");
                    const dN = currentUserData.display_name || currentUserData.displayName || currentUser?.displayName || 'User';

                    const authToggle = document.getElementById('auth-toggle');
                    if (authToggle) {
                        authToggle.style.transition = 'opacity 0.2s ease';
                        authToggle.style.opacity = '0';
                        setTimeout(() => {
                            authToggle.innerHTML = newAvatarHtml;
                            authToggle.style.opacity = '1';
                        }, 200);
                    }
                    const menuAvatar = document.getElementById('auth-menu-avatar-container');
                    if (menuAvatar) {
                        menuAvatar.innerHTML = newAvatarHtml;
                    }
                    const menuDisplayName = document.querySelector('.auth-menu-displayname');
                    if (menuDisplayName) {
                        menuDisplayName.textContent = dN;
                    }
                });

                globalClickListenerAdded = true;
            }

            if (user) {
                if (window._laggardInterval) clearInterval(window._laggardInterval);
                setTimeout(checkLaggardNotifications, 5000);
                window._laggardInterval = setInterval(checkLaggardNotifications, 45 * 60 * 1000);
            }
        };

    async function checkLaggardNotifications() {
        if (!currentUser || !window.supabase) return;
        
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        
        try {
            const { data: laggards, error } = await window.supabase.rpc('get_daily_photo_laggards', {
                current_user_id: currentUser.uid || currentUser.id,
                client_today_start: startOfDay.toISOString(),
                client_today_end: endOfDay.toISOString()
            });

            if (error) {
                console.error("Failed to check daily photo laggards:", error);
                return;
            }

            if (laggards && laggards.length > 0) {
                laggards.forEach(laggard => {
                    const laggardName = laggard.laggard_display_name || laggard.laggard_username || 'a friend';
                    showLaggardNotification(laggardName, laggard.laggard_id);
                });
            }
        } catch (err) {
            console.error("Error in checkLaggardNotifications:", err);
        }
    }

    function showLaggardNotification(friendName, friendId) {
        const existingNotif = document.getElementById(`laggard-notif-${friendId}`);
        if (existingNotif) return;

        const notifContainer = document.getElementById('viro-notif-container');
        if (!notifContainer) return;

        const notifId = `laggard-notif-${friendId}`;
        const notifHtml = `
            <div id="${notifId}" class="viro-notif" style="border-left: 4px solid #f97316;">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center flex-shrink-0">
                        <span class="text-orange-500 text-lg leading-none" style="filter: drop-shadow(0 0 4px rgba(249, 115, 22, 0.5));">🔥</span>
                    </div>
                    <div class="viro-notif-content">
                        Remind <span class="font-bold text-orange-400">${friendName}</span> to post!
                    </div>
                </div>
                <button class="viro-notif-close" onclick="this.closest('.viro-notif').classList.add('fade-out'); setTimeout(() => this.closest('.viro-notif').remove(), 300);">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
        
        notifContainer.insertAdjacentHTML('beforeend', notifHtml);
    }

    const run = async () => {
        if (!document.getElementById('navbar-container')) {
            const navbarDiv = document.createElement('div');
            navbarDiv.id = 'navbar-container';
            document.body.prepend(navbarDiv);
        }
        
        if (!document.getElementById('viro-notif-container')) {
            const notifDiv = document.createElement('div');
            notifDiv.id = 'viro-notif-container';
            document.body.appendChild(notifDiv);
        }

        injectStyles();
        const container = document.getElementById('navbar-container');
        const logoPath = '/images/logo.png'; 
        
        // --- Structure ---
        container.innerHTML = `
            <div id="fireworks-container"></div>
            
            <a href="/" class="navbar-logo-container flex items-center space-x-2 flex-shrink-0 overflow-hidden relative" style="z-index: 20;">
                <img src="${logoPath}" alt="4SP Logo" class="navbar-logo" id="navbar-logo">
            </a>

            <div id="nav-left-controls" style="z-index: 20;">
                <div class="nav-left-placeholder"></div>
            </div>
            
            <div class="tab-wrapper" style="z-index: 20;">
                <button id="glide-left" class="scroll-glide-button hidden"><i class="fa-solid fa-chevron-left"></i></button>
                <div class="tab-scroll-container" id="tabs-container">
                    <div class="nav-tab-placeholder"></div>
                    <div class="nav-tab-placeholder hidden sm:block"></div>
                    <div class="nav-tab-placeholder hidden md:block"></div>
                </div>
                <button id="glide-right" class="scroll-glide-button hidden"><i class="fa-solid fa-chevron-right"></i></button>
            </div>

            <div id="auth-controls-wrapper" class="auth-controls-wrapper" style="z-index: 20;">
                <div class="auth-toggle-placeholder"></div>
            </div>
        `;

        let pages = {};
        await loadCSS("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css");
        // Load Fireworks JS and Party JS
        await loadScript("https://cdn.jsdelivr.net/npm/fireworks-js@2.x/dist/index.umd.js");
        await loadScript("https://cdn.jsdelivr.net/npm/party-js@latest/bundle/party.min.js");
        
        // Load Schedule Notifications
        // Try/Catch to avoid blocking app if file missing/error
        try {
            await loadScript("/schedule_notifications.js");
        } catch(e) { console.warn("Schedule notifications script not loaded", e); }
        
        // Load Admin Keybinds
        try {
            await loadScript("/admin_keybinds.js", true); // Load as module
        } catch(e) { console.warn("Admin keybinds script not loaded", e); }

        try {
            const response = await fetch(window.PAGE_CONFIG_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            pages = await response.json();
            allPages = pages; // Set allPages early
            
            // Render navbar immediately with null user to show auth button while Firebase loads
            renderNavbar(null, null, pages, false);
        } catch (error) {
            console.error("Failed to load page identification config:", error);
            pages = { 'home': { name: "Home", url: "../index.html", icon: "fa-solid fa-house" } };
            allPages = pages;
            renderNavbar(null, null, pages, false);
        }

        try {
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js", true);
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js", true);
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js", true);
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions-compat.js", true);
            initializeApp(pages, window.FIREBASE_CONFIG);
        } catch (error) {
            console.error("Failed to load core Firebase SDKs:", error);
            renderNavbar(null, null, pages, false);
        }
    };

    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            /* Base Styles */
            body { padding-top: 64px !important; }
            
            /* --- Navbar Styles --- */
            #navbar-container {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                z-index: 9999 !important;
                background: var(--navbar-bg, rgba(0, 0, 0, 0.6)) !important;
                backdrop-filter: blur(12px) !important;
                -webkit-backdrop-filter: blur(12px) !important;
                border-bottom: 1px solid var(--navbar-border, rgba(255, 255, 255, 0.08)) !important;
                height: 64px !important;
                width: 100% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                padding: 0 1rem !important; /* Kept minimal padding so logo doesn't hit edge */
                box-sizing: border-box !important;
                transition: background-color 0.3s ease, border-color 0.3s ease !important;
                overflow: visible !important;
                font-family: var(--font-primary, 'Manrope'), sans-serif !important;
            }

            /* Fireworks Container Style */
            #fireworks-container {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                pointer-events: none !important;
                z-index: 1 !important; 
                opacity: 0;
                transition: opacity 0.5s ease !important;
                overflow: hidden !important;
            }
            
            /* Ensure navbar content sits ABOVE the fireworks */
            #navbar-container > *:not(#fireworks-container) {
                position: relative !important;
                z-index: 10 !important;
            }

            .navbar-logo { height: 40px !important; width: auto !important; transition: filter 0.3s ease !important; }

            /* --- GLIDE / SCROLL STYLES --- */
            .tab-wrapper { 
                flex-grow: 1; 
                display: flex; 
                align-items: center; 
                position: relative; 
                min-width: 0; 
                margin: 0 1rem; 
                justify-content: center; 
                overflow: hidden; 
            }

            .tab-scroll-container { 
                display: flex; 
                align-items: center; 
                gap: 0.5rem; 
                overflow-x: auto; 
                scrollbar-width: none; 
                white-space: nowrap; 
                max-width: 100%;
                scroll-behavior: smooth; 
                padding-left: 20px;      
                padding-right: 20px;
                padding-block: 10px;
            }
            .tab-scroll-container::-webkit-scrollbar { display: none; }

            /* Glide Buttons */
            .scroll-glide-button {
                position: absolute; 
                top: 0; 
                height: 100%; 
                width: 60px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                color: var(--glide-btn-color, #ffffff); 
                font-size: 1rem; 
                cursor: pointer; 
                opacity: 1; 
                transition: opacity 0.3s, color 0.3s ease, background-color 0.3s ease; 
                z-index: 55; 
                pointer-events: auto;
                background: transparent;
                border: none;
            }

            #glide-left { 
                left: 0; 
                background-color: var(--navbar-bg, #000000);
                -webkit-mask-image: linear-gradient(to right, black 30%, transparent);
                mask-image: linear-gradient(to right, black 30%, transparent);
                justify-content: flex-start; 
                padding-left: 8px; 
            }
            #glide-right { 
                right: 0; 
                background-color: var(--navbar-bg, #000000);
                -webkit-mask-image: linear-gradient(to left, black 30%, transparent);
                mask-image: linear-gradient(to left, black 30%, transparent);
                justify-content: flex-end; 
                padding-right: 8px; 
            }
            
            .scroll-glide-button.hidden { opacity: 0 !important; pointer-events: none !important; }

            .nav-tab { 
                padding: 0.5rem 1rem; 
                color: var(--tab-text, #9ca3af); 
                font-size: 0.875rem; font-weight: 400; 
                border-radius: var(--button-radius, 16px); 
                text-decoration: none; display: flex; align-items: center; gap: 0.5rem;
                border: 1px solid transparent; transition: all 0.2s; cursor: pointer;
                flex-shrink: 0; 
                position: relative;
                font-family: var(--font-secondary, 'Manrope'), sans-serif !important;
            }
            .nav-tab:hover { 
                color: var(--tab-hover-text, #ffffff); 
                background-color: var(--tab-hover-bg, rgba(79, 70, 229, 0.05));
                border-color: var(--tab-active-border, #4f46e5);
                transform: translateY(-1px);
                z-index: 50; 
            }
            .nav-tab.active { 
                color: var(--tab-active-text, #4f46e5); 
                border-color: var(--tab-active-border, #4f46e5); 
                background-color: var(--tab-active-bg, rgba(79, 70, 229, 0.1)); 
            }
            .nav-tab.active:hover {
                color: var(--tab-active-hover-text, #6366f1);
                border-color: var(--tab-active-hover-border, #6366f1);
                background-color: var(--tab-active-hover-bg, rgba(79, 70, 229, 0.15));
            }

            .auth-controls-wrapper { display: flex; align-items: center; gap: 1rem; position: relative; }
            
            .initial-avatar {
                background: var(--avatar-gradient);
                font-family: sans-serif; text-transform: uppercase; display: flex; align-items: center; justify-content: center; color: white;
            }
            #auth-toggle {
                border-color: var(--avatar-border);
                transition: border-color 0.3s ease;
                border-radius: 16px; /* Reset to 16px */
                border-width: 1px; /* Explicit 1px */
                width: 40px; height: 40px;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; position: relative;
            }
            #auth-toggle:hover { z-index: 50; }

            /* Auth Dropdown Menu Styles */
            .auth-menu-container {
                position: absolute; right: 0; top: 55px; width: 16rem;
                background: var(--menu-bg, #000);
                border: 1px solid var(--menu-border, #333);
                border-radius: var(--button-radius, 26px); 
                padding: 0.75rem; /* Equal spacing on edges */
                display: flex; flex-direction: column; gap: 0.5rem; /* Flex gap for equal internal spacing */
                box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                transition: transform 0.2s ease-out, opacity 0.2s ease-out, background-color 0.3s ease, border-color 0.3s ease;
                transform-origin: top right; z-index: 10000;
                font-family: var(--font-secondary, 'Manrope'), sans-serif !important;
            }
            .auth-menu-container .border-b { border-color: var(--menu-divider, #333) !important; padding-bottom: 0.5rem; } /* Added padding and visible border */
            .auth-menu-displayname {
                color: var(--menu-username-text, #ffffff) !important;
                text-align: left !important; margin: 0 !important; font-weight: 600 !important;
            }
            .auth-menu-username-handle {
                color: var(--menu-email-text, #9ca3af) !important;
                text-align: left !important; margin: 0 !important; font-weight: 400 !important;
            }
            .auth-menu-username {
                color: var(--menu-username-text, white);
                transition: color 0.3s ease;
                text-align: left !important; margin: 0 !important; font-weight: 400 !important;
            }

            /* Profile Stat Styles */
            .profile-stat-container {
                display: flex;
                gap: 1.25rem;
                padding: 0.25rem 0.5rem;
                margin-bottom: 0.5rem;
            }
            .profile-stat-item {
                display: flex;
                flex-direction: column;
                cursor: pointer;
                transition: transform 0.2s ease;
            }
            .profile-stat-item:hover {
                transform: translateY(-2px);
            }
            .profile-stat-item:hover .stat-count, .profile-stat-item:hover .stat-label {
                color: var(--tab-active-text, #4f46e5) !important;
            }
            .stat-count {
                font-weight: 600;
                font-size: 0.95rem;
                color: var(--menu-username-text, #ffffff);
                transition: color 0.2s ease;
            }
            .stat-label {
                font-size: 0.7rem;
                color: var(--menu-email-text, #9ca3af);
                text-transform: uppercase;
                letter-spacing: 0.025em;
                transition: color 0.2s ease;
            }

            .auth-menu-email { color: var(--menu-email-text, #9ca3af); text-align: left !important; margin: 0 !important; font-weight: 400 !important; padding-left: 0.25rem; }
            @keyframes menu-pop-in {
                0% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                70% { transform: translateY(2px) scale(1.01); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes menu-pop-out {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-10px); }
            }

            .auth-menu-container.open { 
                display: flex !important; 
                animation: menu-pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            .auth-menu-container.closing {
                display: flex !important;
                animation: menu-pop-out 0.3s ease-in forwards;
                pointer-events: none;
            }
            .auth-menu-container.closed { opacity: 0; pointer-events: none; transform: translateY(-10px); display: none !important; }

            /* Show More Section - Updated to use Flex for spacing */
            .auth-menu-more-section { 
                display: none; /* Hidden by default */
                padding-top: 0.5rem; 
                margin-top: 0.5rem; 
                border-top: 1px solid var(--menu-divider, #333); 
                flex-direction: column;
                gap: 0.5rem;
            }
            .auth-menu-more-section.expanded { display: flex; }

            /* Updated Auth Menu Buttons - Colored Default Background */
            .auth-menu-link, .auth-menu-button { 
                display: flex; align-items: center; gap: 0.75rem; width: 100%; text-align: left; 
                padding: 0.75rem 1rem; font-size: 0.9rem; color: var(--menu-text, #d1d5db); 
                background: var(--tab-hover-bg, rgba(79, 70, 229, 0.05)); /* Default background color */
                border-radius: var(--button-radius, 16px); 
                transition: all 0.2s ease; cursor: pointer;
                border: 1px solid var(--tab-hover-bg, rgba(79, 70, 229, 0.05));
                margin-bottom: 0; 
                font-family: var(--font-primary, 'Manrope'), sans-serif !important;
            }
            .auth-menu-link:hover, .auth-menu-button:hover { 
                background-color: var(--tab-hover-bg, rgba(79, 70, 229, 0.05)); 
                border-color: var(--tab-active-border, #4f46e5);
                color: var(--menu-item-hover-text, #ffffff);
                transform: translateY(-2px) scale(1.02);
            }

            .logged-out-auth-toggle { 
                background: var(--logged-out-icon-bg, #010101); border: 1px solid var(--logged-out-icon-border, #374151); 
                transition: background-color 0.3s ease, border-color 0.3s ease;
                border-radius: 16px; /* Reset to 16px */
            }
            .logged-out-auth-toggle i { color: var(--logged-out-icon-color, #DADADA); transition: color 0.3s ease; }

            .glass-menu { 
                background: var(--glass-menu-bg, rgba(10, 10, 10, 0.8)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); 
                border: 1px solid var(--glass-menu-border, rgba(55, 65, 81, 0.8)); transition: background-color 0.3s ease, border-color 0.3s ease;
            }
            .auth-menu-link i.w-4, .auth-menu-button i.w-4 { width: 1rem; text-align: center; } 

            #pin-button { 
                border-color: var(--pin-btn-border, #4b5563); transition: background-color 0.2s, border-color 0.3s ease; 
                display: flex; align-items: center; justify-content: center; 
                border-radius: 16px; /* Reset to 16px */
                border-width: 1px; /* Explicit 1px */
                width: 40px; height: 40px;
                background: var(--tab-hover-bg, rgba(79, 70, 229, 0.05)); /* Sync with theme */
            }
            #pin-button:hover { background-color: var(--pin-btn-hover-bg, #374151); z-index: 50; }
            #pin-button-icon { color: var(--pin-btn-icon-color, #d1d5db); transition: color 0.3s ease; }

            #profile-toggle {
                border-color: var(--pin-btn-border, #4b5563); transition: background-color 0.2s, border-color 0.3s ease; 
                display: flex; align-items: center; justify-content: center; 
                border-radius: 16px; /* Reset to 16px */
                border-width: 1px; /* Explicit 1px */
                width: 40px; height: 40px;
                background: var(--tab-hover-bg, rgba(79, 70, 229, 0.05)); /* Sync with theme */
            }
            #profile-toggle:hover { background-color: var(--pin-btn-hover-bg, #374151); z-index: 50; }
            #profile-toggle i { color: var(--pin-btn-icon-color, #d1d5db); transition: color 0.3s ease; }

            .pin-hint-container {
                position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%) scale(0.8);
                background: var(--hint-bg, #010101); border: 1px solid var(--hint-border, #374151); color: var(--hint-text, #ffffff);
                padding: 0.5rem 1rem; border-radius: 0.9rem; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                opacity: 0; pointer-events: none; z-index: 10001;
                transition: opacity 0.3s ease, transform 0.3s ease, background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
                white-space: nowrap; font-size: 0.875rem;
            }
            .pin-hint-container.show { opacity: 1; transform: translateX(-50%) scale(1); transition-delay: 0.2s; }

            .marquee-container { overflow: hidden; white-space: nowrap; position: relative; max-width: 100%; }
            .marquee-container.active { mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); }
            .marquee-content { display: inline-block; white-space: nowrap; }
            .marquee-container.active .marquee-content { animation: marquee 10s linear infinite; min-width: 100%; }
            @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

            /* Notifications */
            #viro-notif-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 1000000;
                display: flex;
                flex-direction: column-reverse;
                gap: 12px;
                pointer-events: none;
                width: 320px;
                max-width: calc(100vw - 48px);
            }

            .viro-notif {
                pointer-events: auto;
                background: var(--menu-bg, #ffffff);
                border: 1px solid var(--menu-border, rgba(0,0,0,0.08));
                border-radius: 14px;
                padding: 12px 16px;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                animation: notif-pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .viro-notif.fade-out {
                animation: notif-fade-out 0.3s ease forwards;
            }

            @keyframes notif-pop-in {
                0% { opacity: 0; transform: translateY(20px) scale(0.9); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }

            @keyframes notif-fade-out {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }

            .viro-notif-content {
                font-size: 0.85rem;
                color: var(--menu-username-text, #1c1917);
                font-weight: 500;
                line-height: 1.4;
                flex: 1;
                word-wrap: break-word;
            }

            .viro-notif-close {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                color: var(--menu-email-text, #9ca3af);
                cursor: pointer;
                transition: all 0.2s;
                flex-shrink: 0;
                border: none;
                background: transparent;
            }

            .viro-notif-close:hover {
                background-color: var(--menu-item-hover-bg, #f3f4f6);
                color: var(--menu-item-hover-text, #4b5563);
            }

            .viro-notif-badge {
                background: var(--accent-primary, #f97316);
                color: white;
                font-size: 10px;
                font-weight: 800;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                flex-shrink: 0;
                box-shadow: 0 2px 4px rgba(249, 115, 22, 0.2);
            }

            #notification-button {
                border-color: var(--pin-btn-border, #4b5563); transition: background-color 0.2s, border-color 0.3s ease; 
                display: flex; align-items: center; justify-content: center; 
                border-radius: 16px; 
                border-width: 1px; 
                width: 40px; height: 40px;
                background: var(--tab-hover-bg, rgba(79, 70, 229, 0.05)); 
                cursor: pointer;
            }
            #notification-button:hover { background-color: var(--pin-btn-hover-bg, #374151); z-index: 50; }
            #notification-button i { color: var(--pin-btn-icon-color, #d1d5db); transition: color 0.3s ease; }

            /* Notification Menu */
            #notification-menu-container {
                position: absolute;
                left: 0;
                top: 55px;
                width: 18rem;
                background: var(--menu-bg, #000);
                border: 1px solid var(--menu-border, #333);
                border-radius: 26px;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                transition: transform 0.2s ease-out, opacity 0.2s ease-out, background-color 0.3s ease, border-color 0.3s ease;
                transform-origin: top left;
                z-index: 10000;
            }
            #notification-menu-container.closed { opacity: 0; pointer-events: none; transform: translateY(-10px) scale(0.95); display: none !important; }
            #notification-menu-container.open { display: flex !important; animation: menu-pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            #notification-menu-container.closing { display: flex !important; animation: menu-pop-out 0.3s ease-in forwards; pointer-events: none; }

            .notification-menu-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid var(--menu-divider, #333);
                padding-bottom: 0.5rem;
                margin-bottom: 0.25rem;
            }
            .notification-menu-title {
                font-size: 0.9rem;
                font-weight: 700;
                color: var(--menu-username-text, #fff);
            }
            .notification-menu-clear {
                font-size: 0.75rem;
                color: var(--tab-active-text, #4f46e5);
                cursor: pointer;
                font-weight: 600;
                background: none;
                border: none;
                padding: 0;
            }
            .notification-menu-clear:hover { text-decoration: underline; }

            .notification-list {
                max-height: 250px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                scrollbar-width: thin;
                scrollbar-color: var(--menu-divider, #333) transparent;
            }
            .notification-list::-webkit-scrollbar { width: 4px; }
            .notification-list::-webkit-scrollbar-thumb { background: var(--menu-divider, #333); border-radius: 10px; }

            .notification-item {
                padding: 0.75rem;
                background: var(--tab-hover-bg, rgba(79, 70, 229, 0.05));
                border-radius: 16px;
                border: 1px solid transparent;
                transition: all 0.2s;
                font-size: 0.8rem;
                color: var(--menu-text, #d1d5db);
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
            }
            .notification-item:hover { border-color: var(--menu-divider, #444); background: var(--tab-active-bg, rgba(79, 70, 229, 0.1)); }
            .notification-item i { margin-top: 2px; color: var(--tab-active-text, #4f46e5); flex-shrink: 0; }
            .notification-empty {
                text-align: center;
                padding: 1.5rem 0.5rem;
                color: var(--menu-email-text, #9ca3af);
                font-size: 0.8rem;
                font-style: italic;
            }

            #nav-left-controls {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-left: 1rem;
            }
        `;
        document.head.appendChild(style);
    };

    const initializeApp = (pages, firebaseConfig) => {
        if (!document.getElementById('navbar-container')) {
            const navbarDiv = document.createElement('div');
            navbarDiv.id = 'navbar-container';
            document.body.prepend(navbarDiv);
        }
        
        injectStyles();
        
        let savedTheme;
        try {
            savedTheme = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY));
        } catch (e) {
            savedTheme = null;
            console.warn("Could not parse saved theme from Local Storage.");
        }
        window.applyTheme(savedTheme || DEFAULT_THEME); 

        // Secondary Config Fallback (Ensures consistency across all pages)
        if (!window.FIREBASE_CONFIG_2) {
            window.FIREBASE_CONFIG_2 = {
                apiKey: "AIzaSyAHrP6BCMxI9I8T2iRwKwRJrcpVvxJr8fY",
                authDomain: "foursimpleproblems-extra.firebaseapp.com",
                projectId: "foursimpleproblems-extra",
                storageBucket: "foursimpleproblems-extra.firebasestorage.app",
                messagingSenderId: "125667300841",
                appId: "1:125667300841:web:31dcf4ed67ddf6f07ee778"
            };
        }

        const app = firebase.initializeApp(firebaseConfig);
        const app2 = firebase.initializeApp(window.FIREBASE_CONFIG_2, "secondary");

        auth = firebase.auth();
        db = firebase.firestore();
        const db2 = app2.firestore(); // Secondary DB for notifications

        allPages = pages;

        let firebaseChecked = false;
        let supabaseChecked = false;

        const checkAuthRedirect = async (user, source) => {
            if (source === 'firebase') firebaseChecked = true;
            if (source === 'supabase') supabaseChecked = true;

            const path = window.location.pathname;
            const isPublicPage = path.endsWith('authentication.html') || 
                                path.endsWith('/authentication') ||
                                path.endsWith('index.html') || 
                                path === '/' || 
                                path.endsWith('404.html') ||
                                path.endsWith('verify.html') ||
                                path.endsWith('/verify') ||
                                path.endsWith('legal.html') ||
                                path.endsWith('/legal') ||
                                path.endsWith('changelog.html') ||
                                path.endsWith('/changelog') ||
                                path.endsWith('documentation.html') ||
                                path.endsWith('/documentation') ||
                                path.includes('/VALO_PLUS') ||
                                path.includes('/@') ||
                                path.endsWith('dashboard.html') || path.includes('/dashboard') ||
                                path.endsWith('games.html') || path.includes('/games') ||
                                path.endsWith('pxgames.html') || path.includes('/pxgames') ||
                                path.endsWith('soundboard.html') || path.includes('/soundboard') ||
                                path.endsWith('third-party-soundboard.html') || path.includes('/third-party-soundboard') ||
                                path.endsWith('dictionary.html') || path.includes('/dictionary') ||
                                path.endsWith('weather.html') || path.includes('/weather') ||
                                path.endsWith('countdowns.html') || path.includes('/countdowns') ||
                                path.endsWith('settings.html') || path.includes('/settings') ||
                                path.endsWith('velium.html') || path.includes('/velium') ||
                                path.includes('/VELIUM');
            
            if (isPublicPage || isRedirecting) return;

            // Wait until both auth providers have been checked at least once
            if (!firebaseChecked || !supabaseChecked) {
                return;
            }

            // At this point both have checked.
            const firebaseUser = auth.currentUser;
            let hasSupabaseSession = false;
            if (window.supabase) {
                const { data } = await window.supabase.auth.getSession();
                hasSupabaseSession = !!data?.session;
            }

            if (!firebaseUser && !hasSupabaseSession) {
                console.log("User logged out. Displaying V7 login wall.");
                cleanupGlobalListeners();
                
                const renderBlocker = () => {
                    document.body.innerHTML = `
                        <div style="min-height: 100vh; background-color: #0B0A10; color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Manrope', sans-serif; padding: 2rem; box-sizing: border-box; position: relative; overflow: hidden; margin: 0;">
                            <div style="position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(157, 123, 255, 0.05) 0%, rgba(0,0,0,0) 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 0;"></div>
                            
                            <div style="background: #15131C; border: 1px solid #2D273D; border-radius: 24px; padding: 3rem 2rem; width: 100%; max-width: 480px; text-align: center; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); position: relative; z-index: 1; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
                                <div style="width: 4.5rem; height: 4.5rem; border-radius: 20px; background: rgba(157, 123, 255, 0.1); border: 1px solid rgba(157, 123, 255, 0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; color: #9D7BFF; font-size: 2rem;">
                                    <i class="fas fa-lock"></i>
                                </div>
                                <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 0.75rem; color: #fff; tracking-tight: -0.025em;">Authentication Required</h2>
                                <p style="font-size: 0.875rem; color: #9ca3af; line-height: 1.6; margin-bottom: 2.25rem;">You need to log in to use/see this page.</p>
                                
                                <div style="display: flex; flex-direction: column; gap: 1rem;">
                                    <a href="/authentication.html" style="background: #0B0A10; border: 1px solid #9D7BFF; color: #C4B0FF; padding: 1rem 2rem; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 20px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer;" onmouseover="this.style.background='rgba(157, 123, 255, 0.2)'; this.style.color='#fff'; this.style.transform='scale(1.02) translateY(-2px)';" onmouseout="this.style.background='#0B0A10'; this.style.color='#C4B0FF'; this.style.transform='none';">
                                        Sign In / Up <i class="fas fa-sign-in-alt"></i>
                                    </a>
                                    <a href="/index.html" style="color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; margin-top: 1rem; display: inline-block; transition: color 0.2s;" onmouseover="this.style.color='#fff';" onmouseout="this.style.color='rgba(255, 255, 255, 0.5)';">
                                        Back to Home
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                };

                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', renderBlocker);
                } else {
                    renderBlocker();
                }
            }
        };

        // --- DUAL AUTH HANDLER ---
        const handleUser = async (user, source = 'firebase') => {
            cleanupGlobalListeners();
            let isPrivilegedUser = false;
            let userData = null;

            if (user) {
                const uid = user.uid || user.id;
                const email = user.email;

                // --- NIOBIUM BAN SYSTEM CHECK ---
                if (window.supabase) {
                    try {
                        const { data: banData } = await window.supabase.from('bans').select('reason').eq('user_id', uid).maybeSingle();
                        if (banData) {
                            console.error("User is banned. Initiating forced logout.");
                            alert(`Your account has been suspended.\nReason: ${banData.reason || 'Violation of Terms of Service'}`);
                            
                            // Sign out everywhere
                            await window.supabase.auth.signOut();
                            if (typeof firebase !== 'undefined' && auth) await auth.signOut();
                            
                            isRedirecting = true;
                            window.location.href = '/index.html';
                            return; // Halt navigation render
                        }
                    } catch (e) {
                        console.warn("Ban check failed or unavailable:", e);
                    }
                }
                // --------------------------------
                
                // Check if hardcoded privileged email
                isPrivilegedUser = email === PRIVILEGED_EMAIL;

                // Notifications Listener (Using db2 for offloading)
                if (source === 'firebase') {
                    unsubNotifs = db2.collection('notifications')
                        .where('recipientId', '==', uid)
                        .limit(50)
                        .onSnapshot(snap => {
                            snap.docChanges().forEach(change => {
                                if (change.type === 'added') {
                                    const data = change.doc.data();
                                    const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
                                    const isNew = (new Date() - timestamp) < 10000; 
                                    const alreadyInHistory = notificationHistory.find(n => n.id === change.doc.id);
                                    if (!alreadyInHistory) {
                                        notificationHistory.unshift({
                                            message: data.message,
                                            timestamp: timestamp,
                                            id: change.doc.id
                                        });
                                        notificationHistory.sort((a, b) => b.timestamp - a.timestamp);
                                        if (notificationHistory.length > 20) notificationHistory.pop();
                                        updateNotificationMenu();
                                        if (isNew) {
                                            window.showNotification(data.message, true);
                                        }
                                    }
                                }
                            });
                        }, err => {
                            if (err.code !== 'permission-denied') console.warn("Notifications listener error:", err);
                        });
                }

                if (source === 'supabase' && window.supabase) {
                    try {
                        const { data: profile } = await window.supabase.from('profiles').select('*').eq('id', uid).single();
                        const { data: roles } = await window.supabase.from('roles').select('role').eq('user_id', uid);
                        
                        // Extract metadata from Supabase user object if available
                        const metadata = user.user_metadata || user.raw_user_meta_data || {};
                        const metaName = metadata.full_name || metadata.name;
                        const metaPfp = metadata.picture || metadata.avatar_url;

                        if (profile) {
                            // AUTO-SYNC: If profile is missing avatar_url but metadata has it, update DB
                            if (!profile.avatar_url && metaPfp) {
                                console.log("Navigation: Auto-syncing metadata PFP to profile...");
                                window.supabase.from('profiles').update({ avatar_url: metaPfp }).eq('id', uid).then(() => {
                                    // Trigger local update so UI reflects change without refresh
                                    window.dispatchEvent(new CustomEvent('pfp-updated', { 
                                        detail: { avatar_url: metaPfp } 
                                    }));
                                });
                            }

                            userData = {
                                ...profile,
                                displayName: profile.display_name || metaName || profile.username || email.split('@')[0],
                                username: profile.username || email.split('@')[0],
                                pfpType: profile.pfp_type || (metaPfp ? 'google' : 'letter'),
                                customPfp: profile.avatar_url || metaPfp,
                                role: roles?.[0]?.role || profile.role 
                            };

                            // Sync theme if different
                            if (userData.navbarTheme && JSON.stringify(userData.navbarTheme) !== JSON.stringify(savedTheme)) {
                                window.applyTheme(userData.navbarTheme);
                                localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(userData.navbarTheme));
                            }

                            // Check Admin Status from Supabase roles
                            if (roles?.some(r => r.role === 'full_admin' || r.role === 'sub_admin') || profile.is_admin) {
                                isPrivilegedUser = true;
                            }
                        } else if (metaName || metaPfp) {
                            // Fallback if profile row doesn't exist yet but we have metadata
                            userData = {
                                displayName: metaName || email.split('@')[0],
                                username: email.split('@')[0],
                                pfpType: metaPfp ? 'custom' : 'letter',
                                customPfp: metaPfp
                            };
                        }
                    } catch (e) { console.warn("Error fetching Supabase profile:", e); }
                } else {
                    // Firebase Data Sync
                    unsubUserDoc = db.collection('users').doc(uid).onSnapshot(async (doc) => {
                        userData = doc.exists ? doc.data() : null;
                        currentUserData = userData;
                        if (userData) {
                            let updated = false;
                            const originalUsername = userData.username || email.split('@')[0] || 'user';
                            const correctedUsername = originalUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (originalUsername !== correctedUsername) {
                                if (!userData.displayName) userData.displayName = originalUsername.slice(0, 24);
                                userData.username = correctedUsername;
                                updated = true;
                            } else if (!userData.displayName) {
                                userData.displayName = originalUsername.slice(0, 24);
                                updated = true;
                            }
                            if (updated) {
                                try {
                                    await db.collection('users').doc(uid).update({
                                        username: userData.username,
                                        displayName: userData.displayName
                                    });
                                } catch (e) { console.error("Error updating user data:", e); }
                            }
                            if (userData.navbarTheme && JSON.stringify(userData.navbarTheme) !== JSON.stringify(savedTheme)) {
                                window.applyTheme(userData.navbarTheme);
                                localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(userData.navbarTheme));
                            }
                        }
                        renderNavbar(currentUser, currentUserData, allPages, currentIsPrivileged);
                    }, err => {
                        if (err.code !== 'permission-denied') console.warn("Firebase UserDoc error:", err);
                    });
                }

                // Check Admin Status
                try {
                    if (userData?.role === 'admin' || userData?.role === 'superadmin') {
                        isPrivilegedUser = true;
                    } else if (source === 'firebase') {
                        const adminDoc = await db.collection('admins').doc(uid).get();
                        if (!isPrivilegedUser && adminDoc.exists) {
                            isPrivilegedUser = true;
                        }
                    }
                } catch (error) {
                    if (error.code !== 'permission-denied') console.error("Error fetching admin data:", error);
                }
            }

            currentUser = user;
            currentUserData = userData;
            currentIsPrivileged = isPrivilegedUser;
            
            // --- Sync Online Status (Supabase) ---
            if (currentUser && window.supabase && !window._presenceInitialized) {
                window._presenceInitialized = true;
                const uid = currentUser.uid || currentUser.id;
                window.supabase.from('profiles').update({ is_online: true }).eq('id', uid);
                
                // Set offline on tab close
                window.addEventListener('beforeunload', () => {
                    const supabaseUrl = window.supabaseConfig?.url || window.supabase.supabaseUrl;
                    const supabaseAnonKey = window.supabaseConfig?.anonKey || window.supabase.supabaseKey;

                    if (supabaseUrl && supabaseAnonKey) {
                        const url = `${supabaseUrl}/rest/v1/profiles?id=eq.${uid}`;
                        fetch(url, {
                            method: 'PATCH',
                            headers: {
                                'apikey': supabaseAnonKey,
                                'Authorization': `Bearer ${supabaseAnonKey}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=minimal'
                            },
                            body: JSON.stringify({ is_online: false }),
                            keepalive: true
                        });
                    }
                });
            }

            renderNavbar(currentUser, currentUserData, allPages, currentIsPrivileged);

            if (!authCheckCompleted) {
                authCheckCompleted = true;
            }
            await checkAuthRedirect(user, source);
        };

        // Firebase Listener
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                handleUser(user, 'firebase');
            } else {
                // If we have a Supabase session, wait for its listener
                if (window.supabase) {
                    const { data: { session } } = await window.supabase.auth.getSession();
                    if (session) {
                        firebaseChecked = true;
                        return;
                    }
                }
                handleUser(null, 'firebase');
            }
        });

        // Supabase Listener (if available)
        if (window.supabase) {
            window.supabase.auth.onAuthStateChange(async (event, session) => {
                if (session) {
                    handleUser(session.user, 'supabase');
                } else {
                    supabaseChecked = true;
                    const firebaseUser = auth.currentUser;
                    handleUser(firebaseUser, 'firebase');
                }
            });

            // Initial Supabase Check
            window.supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    handleUser(session.user, 'supabase');
                } else {
                    supabaseChecked = true;
                    checkAuthRedirect(null, 'supabase');
                }
            });
        } else {
            supabaseChecked = true;
        }
    };

    // --- Sound & Notification Logic ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let isMuted = false;

    window.playClickSound = function() {
        if (isMuted) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.015);
    };

    const activeNotifs = new Map(); // message -> { element, count, timeout }
    const notificationHistory = [];

    window.showNotification = function(message, skipHistory = false, duration = 3000) {
        if (!message) return;

        if (!skipHistory) {
            // Add to history if it's a local/manual notification (like alert override)
            notificationHistory.unshift({
                message: message,
                timestamp: new Date(),
                id: 'local-' + Date.now()
            });
            if (notificationHistory.length > 20) notificationHistory.pop();
            updateNotificationMenu();
        }

        const container = document.getElementById('viro-notif-container');
        if (!container) return;

        // Deduplication
        if (activeNotifs.has(message)) {
            const data = activeNotifs.get(message);
            data.count++;

            // Update UI
            let badge = data.element.querySelector('.viro-notif-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'viro-notif-badge';
                data.element.prepend(badge);
            }
            badge.textContent = data.count;

            // Reset timeout
            clearTimeout(data.timeout);
            data.timeout = setTimeout(() => removeNotif(message), duration);
            return;
        }

        // Max 5 notifications
        if (container.children.length >= 5) {
            const oldestMessage = Array.from(activeNotifs.keys())[0];
            removeNotif(oldestMessage);
        }

        // Create Element
        const notif = document.createElement('div');
        notif.className = 'viro-notif';
        notif.innerHTML = `
            <div class="viro-notif-content">${message}</div>
            <button class="viro-notif-close">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        notif.querySelector('.viro-notif-close').onclick = () => removeNotif(message);

        container.appendChild(notif);

        if (window.playClickSound) window.playClickSound();

        // Store and Set Auto-remove
        const timeout = setTimeout(() => removeNotif(message), duration);
        activeNotifs.set(message, { element: notif, count: 1, timeout });
    };
    function updateNotificationMenu() {
        const listContent = document.getElementById('notification-list-content');
        if (!listContent) return;

        if (notificationHistory.length === 0) {
            listContent.innerHTML = '<div class="notification-empty">No notifications yet</div>';
            return;
        }

        listContent.innerHTML = notificationHistory.map(n => `
            <div class="notification-item">
                <i class="fa-solid fa-bell"></i>
                <div class="flex-1">
                    <div>${n.message}</div>
                    <div class="text-[10px] opacity-50 mt-1">${formatNotifTime(n.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    function formatNotifTime(date) {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function removeNotif(message) {
        const data = activeNotifs.get(message);
        if (!data) return;

        clearTimeout(data.timeout);
        data.element.classList.add('fade-out');
        
        data.element.addEventListener('animationend', () => {
            data.element.remove();
            activeNotifs.delete(message);
        }, { once: true });
    }

    // Override standard alert
    const originalAlert = window.alert;
    window.alert = function(msg) {
        console.log("4SP Alert Intercepted:", msg);
        window.showNotification(msg);
    };

    if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
} else {
    run();
}
})();
}
