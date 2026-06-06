/**
 * navigation-mini.js (v6.7.1 - Supabase Sync Fix)
 * * This is a fully self-contained script to create a dynamic, authentication-aware
 * navigation bar for your website. It handles everything from Firebase initialization
 * to rendering user-specific information. It now includes a horizontally scrollable
 * tab menu loaded from page-identification.json.
 */

// =========================================================================
// >> ACTION REQUIRED: PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE <<
// =========================================================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAZBKAckVa4IMvJGjcyndZx6Y1XD52lgro",
    authDomain: "project-zirconium.firebaseapp.com",
    projectId: "project-zirconium",
    storageBucket: "project-zirconium.firebasestorage.app",
    messagingSenderId: "1096564243475",
    appId: "1:1096564243475:web:6d0956a70125eeea1ad3e6",
    measurementId: "G-1D4F692C1Q"
};
// =========================================================================

// --- Configuration ---
window.PAGE_CONFIG_URL = window.PAGE_CONFIG_URL || '../page-identification.json';
const PRIVILEGED_EMAIL = '4simpleproblems@gmail.com'; 
const THEME_STORAGE_KEY = 'user-navbar-theme';
const lightThemeNames = ['Light', 'Lavender', 'Rose Gold', 'Mint', 'Pink']; // Define light theme names

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
    'button-text': '#9D7BFF'
};

let fireworksInstance = null; // Store fireworks instance globally

window.applyTheme = (theme) => {
    const root = document.documentElement;
    if (!root) return;
    const themeToApply = theme && typeof theme === 'object' ? theme : DEFAULT_THEME;
    
    const isLightTheme = lightThemeNames.includes(themeToApply.name);

    for (const [key, value] of Object.entries(themeToApply)) {
        if (key !== 'logo-src' && key !== 'name' && key !== 'original-css' && key !== 'effect') {
            root.style.setProperty(`--${key}`, value);
        }
    }

    const existingLink = document.getElementById('originals-stylesheet');
    if (themeToApply['original-css']) {
        if (existingLink) {
            existingLink.href = themeToApply['original-css'];
        } else {
            const link = document.createElement('link');
            link.id = 'originals-stylesheet';
            link.rel = 'stylesheet';
            link.href = themeToApply['original-css'];
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

    // Apply specific colors for light themes
    if (isLightTheme) {
        root.style.setProperty('--menu-username-text', '#000000'); 
        root.style.setProperty('--menu-email-text', '#333333');   
    } else {
        root.style.setProperty('--menu-username-text', themeToApply['menu-username-text'] || DEFAULT_THEME['menu-username-text']);
        root.style.setProperty('--menu-email-text', themeToApply['menu-email-text'] || DEFAULT_THEME['menu-email-text']);
    }

    // --- Fireworks/Birthday Logic ---
    const fwContainer = document.getElementById('fireworks-container');
    if (fwContainer) {
        if (themeToApply.name === 'The New Year') {
            fwContainer.style.opacity = '1';
            const fireworksOptions = {
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
                hue: { min: 0, max: 360 },
                delay: { min: 30, max: 60 },
                rocketsPoint: { min: 50, max: 50 }
            };

            if (typeof Fireworks !== 'undefined') {
                if (!fireworksInstance) {
                    fireworksInstance = new Fireworks.default(fwContainer, fireworksOptions);
                    fireworksInstance.start();
                } else {
                    fireworksInstance.updateOptions(fireworksOptions);
                }
            }
        } else if (themeToApply.name === 'Birthday') {
            fwContainer.style.opacity = '0';
            if (fireworksInstance) {
                fireworksInstance.stop();
            }
            
            // Clear existing bday interval if any
            if (window._bdayInterval) {
                clearInterval(window._bdayInterval);
                window._bdayInterval = null;
            }

            // Trigger initial party popper effect
            const triggerConfetti = () => {
                if (typeof party !== 'undefined') {
                    const nav = document.getElementById('navbar-container') || document.body;

                    party.confetti(nav, {
                        count: party.variation.range(20, 40),
                        size: party.variation.range(0.6, 1.0),
                        spread: party.variation.range(40, 60),
                    });
                }
            };
            triggerConfetti();
            window._bdayInterval = setInterval(triggerConfetti, 3000);
        } else {
            fwContainer.style.opacity = '0';
            if (fireworksInstance) {
                fireworksInstance.stop();
            }
            if (window._bdayInterval) {
                clearInterval(window._bdayInterval);
                window._bdayInterval = null;
            }
        }
    }

    const logoImg = document.getElementById('navbar-logo');
    if (logoImg) {
        let newLogoSrc;
        if (themeToApply.name === 'Christmas') {
            newLogoSrc = '/images/logo-christmas.png';
        } else if (themeToApply.name === 'Potato') {
            newLogoSrc = '/images/potato.png';
        } else {
            newLogoSrc = themeToApply['logo-src'] || DEFAULT_THEME['logo-src'];
        }
        const currentSrc = logoImg.src;
        if (!currentSrc.includes(newLogoSrc)) {
            logoImg.src = newLogoSrc;
        }

        const noFilterThemes = ['Dark', 'Light', 'Christmas', 'Potato'];
        const isNoFilter = noFilterThemes.includes(themeToApply.name);
        
        // Check if mode is changing (Tinted <-> Standard)
        const wasNoFilter = logoImg.style.transform === '' || logoImg.style.transform === 'none';
        const modeChanged = isNoFilter !== wasNoFilter;

        if (modeChanged) {
            logoImg.style.transition = 'none';
        }

        if (isNoFilter) {
            logoImg.style.filter = ''; 
            logoImg.style.transform = '';
        } else {
            const tintColor = themeToApply['tab-active-text'] || '#ffffff';
            logoImg.style.filter = `drop-shadow(100px 0 0 ${tintColor})`;
            logoImg.style.transform = 'translateX(-100px)';
        }

        if (modeChanged) {
            // Force Reflow
            void logoImg.offsetWidth; 
            logoImg.style.transition = 'filter 0.3s ease'; // Restore transition
        }
    }

    // --- Global Theme Shadow Sync & V7 Custom Spring Physics ---
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

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
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

        const getCurrentPageKey = () => {
            const currentPathname = window.location.pathname.toLowerCase();
            let bestMatchKey = null;
            let longestMatchLength = 0; 

            const cleanPath = (path) => {
                try {
                    const resolved = new URL(path, window.location.origin).pathname.toLowerCase();
                    if (resolved.endsWith('/index.html')) return resolved.substring(0, resolved.lastIndexOf('/')) + '/';
                    if (resolved.length > 1 && resolved.endsWith('/')) return resolved.slice(0, -1);
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

                const tabPathSuffix = new URL(page.url, window.location.origin).pathname.toLowerCase();
                const tabSuffixClean = tabPathSuffix.startsWith('/') ? tabPathSuffix.substring(1) : tabPathSuffix;
                if (!isMatch && tabSuffixClean.length > 3 && currentPathname.endsWith(tabSuffixClean)) {
                    isMatch = true;
                }

                if (!isMatch && page.aliases && Array.isArray(page.aliases)) {
                    for (const alias of page.aliases) {
                        const aliasCanonical = cleanPath(alias);
                        if (currentCanonical === aliasCanonical) {
                            isMatch = true;
                            break;
                        }
                        const aliasPathSuffix = new URL(alias, window.location.origin).pathname.toLowerCase();
                         const aliasSuffixClean = aliasPathSuffix.startsWith('/') ? aliasPathSuffix.substring(1) : aliasPathSuffix;
                        if (aliasSuffixClean.length > 3 && currentPathname.endsWith(aliasSuffixClean)) {
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

        const PINNED_PAGE_KEY = 'navbar_pinnedPage';
        const PIN_BUTTON_HIDDEN_KEY = 'navbar_pinButtonHidden';
        const PIN_HINT_SHOWN_KEY = 'navbar_pinHintShown';
        
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
                    <a href="${pinButtonUrl}" id="pin-button" class="w-10 h-10 border flex items-center justify-center hover:bg-gray-700 transition" title="${pinButtonTitle}" style="border-radius: 14px; border-width: 1px;">
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
                const authButtonContainer = document.getElementById('auth-controls-wrapper');
                if (authButtonContainer) {
                    authButtonContainer.insertAdjacentHTML('afterbegin', newPinHtml);
                    setupPinEventListeners();
                }
            }
            document.getElementById('auth-menu-container')?.classList.add('closed');
            document.getElementById('auth-menu-container')?.classList.remove('open');
        };

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

        const getLetterAvatarTextColor = (gradientBg) => {
            if (!gradientBg) return '#FFFFFF'; 
            const match = gradientBg.match(/#([0-9a-fA-F]{3}){1,2}/);
            const firstHexColor = match ? match[0] : null;
            if (!firstHexColor) return '#FFFFFF'; 
            const rgb = hexToRgb(firstHexColor);
            if (!rgb) return '#FFFFFF';
            const luminance = getLuminance(rgb);
            if (luminance > 0.5) { 
                const darkenFactor = 0.5; 
                const darkerR = Math.floor(rgb.r * darkenFactor);
                const darkerG = Math.floor(rgb.g * darkenFactor);
                const darkerB = Math.floor(rgb.b * darkenFactor);
                return `#${((1 << 24) + (darkerR << 16) + (darkerG << 8) + darkerB).toString(16).slice(1)}`;
            } else {
                return '#FFFFFF';
            }
        };

        const getAuthControlsHtml = () => {
            const user = currentUser;
            const userData = currentUserData;
            const pinButtonHtml = getPinButtonHtml();

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
                const username = userData?.username || user.displayName || 'User';
                const email = user.email || 'No email';
                const initial = (userData?.letterAvatarText || username.charAt(0)).toUpperCase();
                let avatarHtml = '';
                const pfpType = userData?.pfpType || 'google'; 

                // FIX: Combined styles to ensure background colors render correctly
                if (pfpType === 'custom' && userData?.customPfp) {
                    avatarHtml = `<img src="${userData.customPfp}" class="w-full h-full object-cover" style="border-radius: 12px;" alt="Profile">`;
                } else if (pfpType === 'mibi' && userData?.mibiConfig) {
                    const { eyes, mouths, hats, bgColor, rotation, size, offsetX, offsetY } = userData.mibiConfig;
                    const scale = (size || 100) / 100;
                    const rot = rotation || 0;
                    const x = offsetX || 0;
                    const y = offsetY || 0;
                    
                    avatarHtml = `
                        <div class="w-full h-full relative overflow-hidden" style="background-color: ${bgColor || '#3B82F6'}; border-radius: 12px;">
                             <div class="absolute inset-0 w-full h-full" style="transform: translate(${x}%, ${y}%) rotate(${rot}deg) scale(${scale}); transform-origin: center;">
                                 <img src="/mibi-avatars/head.png" class="absolute inset-0 w-full h-full object-contain">
                                 ${eyes ? `<img src="/mibi-avatars/eyes/${eyes}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                 ${mouths ? `<img src="/mibi-avatars/mouths/${mouths}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                 ${hats ? `<img src="/mibi-avatars/hats/${hats}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                             </div>
                        </div>
                    `;
                } else if (pfpType === 'letter') {
                    const bg = userData?.pfpLetterBg || DEFAULT_THEME['avatar-gradient'];
                    const textColor = getLetterAvatarTextColor(bg); 
                    const fontSizeClass = initial.length >= 3 ? 'text-xs' : (initial.length === 2 ? 'text-sm' : 'text-base'); 
                    avatarHtml = `<div class="initial-avatar w-full h-full font-semibold ${fontSizeClass}" style="background: ${bg}; color: ${textColor}; border-radius: 12px;">${initial}</div>`;
                } else {
                    const googleProvider = user?.providerData?.find(p => p.providerId === 'google.com');
                    const googlePhoto = googleProvider ? googleProvider.photoURL : null;
                    const displayPhoto = googlePhoto || user.photoURL;

                    if (displayPhoto) {
                        avatarHtml = `<img src="${displayPhoto}" class="w-full h-full object-cover" style="border-radius: 12px;" alt="Profile">`;
                    } else {
                        const bg = DEFAULT_THEME['avatar-gradient'];
                        const textColor = getLetterAvatarTextColor(bg);
                        const fontSizeClass = initial.length >= 3 ? 'text-xs' : (initial.length === 2 ? 'text-sm' : 'text-base');
                        avatarHtml = `<div class="initial-avatar w-full h-full font-semibold ${fontSizeClass}" style="background: ${bg}; color: ${textColor}; border-radius: 12px;">${initial}</div>`;
                    }
                }
                
                const isPinHidden = localStorage.getItem(PIN_BUTTON_HIDDEN_KEY) === 'true';
                const showPinOption = isPinHidden 
                    ? `<button id="show-pin-button" class="auth-menu-link"><i class="fa-solid fa-map-pin w-4"></i>Show Pin Button</button>` 
                    : '';
                
                return `
                    <div id="auth-button-container" class="relative flex-shrink-0 flex items-center">
                        <button id="auth-toggle" class="w-10 h-10 border border-gray-600 overflow-hidden" style="border-radius: 14px;">
                            ${avatarHtml}
                        </button>
                        <div id="auth-menu-container" class="auth-menu-container closed">
                            <div class="border-b mb-2 w-full min-w-0 flex items-center">
                                <div class="min-w-0 flex-1 overflow-hidden">
                                    <div class="marquee-container" id="email-marquee">
                                        <p class="text-xs text-gray-400 auth-menu-email marquee-content">${email}</p>
                                    </div>
                                </div>
                            </div>
                            <a href="/logged-in/settings.html" class="auth-menu-link">
                                <i class="fa-solid fa-gear w-4"></i>
                                Settings
                            </a>
                            ${showPinOption}
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
                ${pinButtonHtml}
                ${user ? loggedInView(user, userData) : loggedOutView}
            `;
        }

        const setupAuthToggleListeners = (user) => {
            const toggleButton = document.getElementById('auth-toggle');
            const menu = document.getElementById('auth-menu-container');

            if (toggleButton && menu) {
                toggleButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    const pinMenu = document.getElementById('pin-context-menu');
                    if (pinMenu && pinMenu.classList.contains('open')) {
                        pinMenu.classList.remove('open');
                        pinMenu.classList.add('closing');
                        pinMenu.addEventListener('animationend', () => {
                            pinMenu.classList.remove('closing');
                            pinMenu.classList.add('closed');
                        }, { once: true });
                    }

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
                            console.log("Navigation-Mini: Attempting logout...");
                            if (window.supabase) {
                                await window.supabase.auth.signOut();
                                console.log("Navigation-Mini: Supabase signed out.");
                            }
                            const firebaseAuth = typeof firebase !== 'undefined' ? firebase.auth() : auth;
                            await firebaseAuth.signOut();
                            console.log("Navigation-Mini: Firebase signed out.");
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
            authWrapper.innerHTML = getAuthControlsHtml();
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
            const navbarLogo = document.getElementById('navbar-logo');

            const logoPath = DEFAULT_THEME['logo-src']; 
            if (navbarLogo) navbarLogo.src = logoPath;
            
            // Tabs Removed in Mini Navigation

            const authControlsHtml = getAuthControlsHtml();

            // Tabs container removed

            if (authControlsWrapper) {
                authControlsWrapper.innerHTML = authControlsHtml;
            }
            
            // Tab scroll logic removed

            setupEventListeners(user);

            // Theme Syncing Removed - Force Default
            window.applyTheme(DEFAULT_THEME); 

            // Scroll logic removed
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
                    
                    const authMenu = document.getElementById('auth-menu-container');
                    if (authMenu && authMenu.classList.contains('open')) {
                        authMenu.classList.remove('open');
                        authMenu.classList.add('closing');
                        authMenu.addEventListener('animationend', () => {
                            authMenu.classList.remove('closing');
                            authMenu.classList.add('closed');
                        }, { once: true });
                    }

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
                
                // --- MODIFIED: REMOVED applyCounterZoom call on resize ---
                window.addEventListener('resize', () => {
                    debouncedUpdateGilders();
                });
                
                if (leftButton) {
                    leftButton.addEventListener('click', () => {
                        tabContainer.scrollLeft = 0; // Scroll to the beginning
                    });
                }
                if (rightButton) {
                    rightButton.addEventListener('click', () => {
                        const maxScroll = tabContainer.scrollWidth - tabContainer.offsetWidth;
                        tabContainer.scrollLeft = maxScroll; // Scroll to the end
                    });
                }
            }

            setupAuthToggleListeners(user);
            setupPinEventListeners();

            if (!globalClickListenerAdded) {
                document.addEventListener('click', (e) => {
                    const menu = document.getElementById('auth-menu-container');
                    const toggleButton = document.getElementById('auth-toggle');
                    
                    if (menu && menu.classList.contains('open')) {
                        if (!menu.contains(e.target) && (toggleButton && !toggleButton.contains(e.target))) {
                            menu.classList.remove('open');
                            menu.classList.add('closing');
                            menu.addEventListener('animationend', () => {
                                menu.classList.remove('closing');
                                menu.classList.add('closed');
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
                    
                    const username = currentUserData.username || currentUser?.displayName || 'User';
                    const initial = (currentUserData.letterAvatarText) ? currentUserData.letterAvatarText : username.charAt(0).toUpperCase();
                    let newContent = '';
                    
                    if (currentUserData.pfpType === 'custom' && currentUserData.customPfp) {
                        newContent = `<img src="${currentUserData.customPfp}" class="w-full h-full object-cover" style="border-radius: 12px;" alt="Profile">`;
                    } else if (currentUserData.pfpType === 'mibi' && currentUserData.mibiConfig) {
                        const { eyes, mouths, hats, bgColor, rotation, size, offsetX, offsetY } = currentUserData.mibiConfig;
                        const scale = (size || 100) / 100;
                        const rot = rotation || 0;
                        const x = offsetX || 0;
                        const y = offsetY || 0;

                        newContent = `
                            <div class="w-full h-full relative overflow-hidden" style="background-color: ${bgColor || '#3B82F6'}; border-radius: 12px;">
                                 <div class="absolute inset-0 w-full h-full" style="transform: translate(${x}%, ${y}%) rotate(${rot}deg) scale(${scale}); transform-origin: center;">
                                     <img src="/mibi-avatars/head.png" class="absolute inset-0 w-full h-full object-contain">
                                     ${eyes ? `<img src="/mibi-avatars/eyes/${eyes}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                     ${mouths ? `<img src="/mibi-avatars/mouths/${mouths}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                     ${hats ? `<img src="/mibi-avatars/hats/${hats}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                 </div>
                            </div>
                        `;
                    } else if (currentUserData.pfpType === 'letter') {
                        const bg = currentUserData.letterAvatarColor || DEFAULT_THEME['avatar-gradient'];
                        const textColor = getLetterAvatarTextColor(bg);
                        const fontSizeClass = initial.length >= 3 ? 'text-xs' : (initial.length === 2 ? 'text-sm' : 'text-base');
                        newContent = `<div class="initial-avatar w-full h-full font-semibold ${fontSizeClass}" style="background: ${bg}; color: ${textColor}; border-radius: 12px;">${initial}</div>`;
                    } else {
                        const googleProvider = currentUser?.providerData?.find(p => p.providerId === 'google.com');
                        const googlePhoto = googleProvider ? googleProvider.photoURL : null;
                        const displayPhoto = googlePhoto || currentUser?.photoURL;

                        if (displayPhoto) {
                            newContent = `<img src="${displayPhoto}" class="w-full h-full object-cover" style="border-radius: 12px;" alt="Profile">`;
                        } else {
                            const bg = DEFAULT_THEME['avatar-gradient'];
                            const textColor = getLetterAvatarTextColor(bg);
                            const fontSizeClass = initial.length >= 3 ? 'text-xs' : (initial.length === 2 ? 'text-sm' : 'text-base');
                            newContent = `<div class="initial-avatar w-full h-full font-semibold ${fontSizeClass}" style="background: ${bg}; color: ${textColor}; border-radius: 12px;">${initial}</div>`;
                        }
                    }

                    const authToggle = document.getElementById('auth-toggle');
                    if (authToggle) {
                        authToggle.style.transition = 'opacity 0.2s ease';
                        authToggle.style.opacity = '0';
                        setTimeout(() => {
                            authToggle.innerHTML = newContent;
                            authToggle.style.opacity = '1';
                        }, 200);
                    }
                    const menuAvatar = document.getElementById('auth-menu-avatar-container');
                    if (menuAvatar) {
                        menuAvatar.innerHTML = newContent; 
                    }
                });

                globalClickListenerAdded = true;
            }
        };

    const isTabActive = (tabUrl, aliases) => {
        const currentPathname = window.location.pathname.toLowerCase();
        
        const cleanPath = (path) => {
            try {
                const resolved = new URL(path, window.location.origin).pathname.toLowerCase();
                if (resolved.endsWith('/index.html')) return resolved.substring(0, resolved.lastIndexOf('/')) + '/';
                if (resolved.length > 1 && resolved.endsWith('/')) return resolved.slice(0, -1);
                return resolved;
            } catch (e) {
                return path; 
            }
        };

        const currentCanonical = cleanPath(currentPathname);
        const tabCanonical = cleanPath(tabUrl);
        if (currentCanonical === tabCanonical) return true;

        const tabPathSuffix = new URL(tabUrl, window.location.origin).pathname.toLowerCase();
        const tabSuffixClean = tabPathSuffix.startsWith('/') ? tabPathSuffix.substring(1) : tabPathSuffix;
        if (tabSuffixClean.length > 3 && currentPathname.endsWith(tabSuffixClean)) return true;

        if (aliases && Array.isArray(aliases)) {
            for (const alias of aliases) {
                const aliasCanonical = cleanPath(alias);
                if (currentCanonical === aliasCanonical) return true;
                
                const aliasPathSuffix = new URL(alias, window.location.origin).pathname.toLowerCase();
                 const aliasSuffixClean = aliasPathSuffix.startsWith('/') ? aliasPathSuffix.substring(1) : aliasPathSuffix;
                if (aliasSuffixClean.length > 3 && currentPathname.endsWith(aliasSuffixClean)) return true;
            }
        }

        return false;
    };

    const run = async () => {
        if (!document.getElementById('navbar-container')) {
            const navbarDiv = document.createElement('div');
            navbarDiv.id = 'navbar-container';
            document.body.prepend(navbarDiv);
        }
        
        if (!document.getElementById('notification-container')) {
            const notifDiv = document.createElement('div');
            notifDiv.id = 'notification-container';
            document.body.appendChild(notifDiv);
        }
        
        injectStyles();

        const container = document.getElementById('navbar-container');
        const logoPath = '/images/logo.png'; 
        
        // --- Structure ---
        container.innerHTML = `
            <div id="fireworks-container"></div>
            
            <a href="/" class="flex items-center space-x-2 flex-shrink-0 overflow-hidden relative" style="z-index: 20;">
                <img src="${logoPath}" alt="4SP Logo" class="navbar-logo" id="navbar-logo">
            </a>
            
            <!-- Tabs removed for mini navigation -->

            <div id="auth-controls-wrapper" class="auth-controls-wrapper" style="z-index: 20;">
                <div class="auth-toggle-placeholder"></div>
            </div>
        `;

        let pages = {};
        await loadCSS("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css");
        // Load Fireworks JS and Party JS
        await loadScript("https://cdn.jsdelivr.net/npm/fireworks-js@2.x/dist/index.umd.js");
        await loadScript("https://cdn.jsdelivr.net/npm/party-js@latest/bundle/party.min.js");
        
        try {
            const response = await fetch(window.PAGE_CONFIG_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            pages = await response.json();
            allPages = pages; // Ensure allPages is set for renderNavbar
            
            // Render navbar immediately with null user to show auth button while Firebase loads
            renderNavbar(null, null, pages, false);
        } catch (error) {
            console.error("Failed to load page identification config:", error);
            pages = { 'home': { name: "Home", url: "../index.html", icon: "fa-solid fa-house" } };
            allPages = pages;
            renderNavbar(null, null, pages, false);
        }

        try {
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js");
            initializeApp(pages, FIREBASE_CONFIG);
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
            }

            /* Fireworks Container Style */
            #fireworks-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1; 
                opacity: 0;
                transition: opacity 0.5s ease;
                overflow: hidden;
            }
            
            /* Ensure navbar content sits ABOVE the fireworks */
            #navbar-container > *:not(#fireworks-container) {
                position: relative;
                z-index: 10;
            }

            .navbar-logo { height: 40px; width: auto; transition: filter 0.3s ease; }

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
                border-radius: 14px; /* Updated to 14px */
                text-decoration: none; display: flex; align-items: center; gap: 0.5rem;
                border: 1px solid transparent; transition: all 0.2s; cursor: pointer;
                flex-shrink: 0; 
                position: relative;
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
                border-radius: 14px; /* Updated to 14px */
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
                border-radius: 1.25rem; 
                padding: 0.75rem; /* Equal spacing on edges */
                display: flex; flex-direction: column; gap: 0.5rem; /* Flex gap for equal internal spacing */
                box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                transition: transform 0.2s ease-out, opacity 0.2s ease-out, background-color 0.3s ease, border-color 0.3s ease;
                transform-origin: top right; z-index: 10000;
            }
            .auth-menu-container .border-b { border-color: var(--menu-divider, #333) !important; transition: border-color 0.3s ease; padding-bottom: 0.5rem; }
            .auth-menu-username {
                color: var(--menu-username-text, white);
                transition: color 0.3s ease;
                text-align: left !important; margin: 0 !important; font-weight: 400 !important;
            }
            .auth-menu-email { color: var(--menu-email-text, #9ca3af); text-align: left !important; margin: 0 !important; font-weight: 400 !important; padding-left: 0.25rem; }
            @keyframes menu-pop-in {
                0% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                70% { transform: translateY(2px) scale(1.01); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes menu-pop-out {
                0% { opacity: 1; transform: translateY(0) scale(1); }
                100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
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
            .auth-menu-container.closed { opacity: 0; pointer-events: none; transform: translateY(-10px) scale(0.95); display: none !important; }

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
                border-radius: 1rem; 
                transition: all 0.2s ease; cursor: pointer;
                /* FIXED: Border color now matches the background color */
                border: 1px solid var(--tab-hover-bg, rgba(79, 70, 229, 0.05));
                margin-bottom: 0; 
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
                border-radius: 14px; /* Updated to 14px */
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
                border-radius: 14px; /* Updated to 14px */
                border-width: 1px; /* Explicit 1px */
                width: 40px; height: 40px;
            }
            #pin-button:hover { background-color: var(--pin-btn-hover-bg, #374151); z-index: 50; }
            #pin-button-icon { color: var(--pin-btn-icon-color, #d1d5db); transition: color 0.3s ease; }

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
            #notification-container {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                z-index: 20000;
                pointer-events: none;
            }
            .notification-toast {
                background-color: #0a0a0a; border: 1px solid #333; border-radius: 14px;
                padding: 0.75rem 1.25rem; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem;
                min-width: 200px; transform: translateX(120%);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease, background-color 0.2s;
                opacity: 0; pointer-events: auto; cursor: default;
            }
            .notification-toast.show { transform: translateX(0); opacity: 1; }
            .notification-toast.show:hover {
                transform: scale(1.02) translateX(-5px); background-color: #151515;
                border-color: #555; box-shadow: 0 8px 25px rgba(0,0,0,0.7);
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

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();

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
            if (!firebaseChecked || !supabaseChecked) return;

            // At this point both have checked.
            const firebaseUser = auth.currentUser;
            let hasSupabaseSession = false;
            if (window.supabase) {
                const { data } = await window.supabase.auth.getSession();
                hasSupabaseSession = !!data.session;
            }

            if (!firebaseUser && !hasSupabaseSession) {
                console.log("User logged out. Displaying V7 login wall.");
                
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
            let isPrivilegedUser = false;
            let userData = null;

            if (user) {
                const uid = user.uid || user.id;
                const email = user.email;
                
                // Check if hardcoded privileged email
                isPrivilegedUser = email === PRIVILEGED_EMAIL;

                try {
                    if (source === 'supabase' && window.supabase) {
                        // Fetch from Supabase profiles table
                        const { data: profile } = await window.supabase.from('profiles').select('*').eq('id', uid).single();
                        if (profile) {
                            userData = {
                                ...profile,
                                displayName: profile.display_name,
                                username: profile.username || email.split('@')[0],
                                pfpType: profile.pfp_type,
                                customPfp: profile.avatar_url,
                                role: profile.role
                            };
                        }
                    } else {
                        // Fetch user data and check admin status in parallel
                        const userDocPromise = db.collection('users').doc(uid).get();
                        const adminDocPromise = db.collection('admins').doc(uid).get();

                        const [userDoc, adminDoc] = await Promise.all([userDocPromise, adminDocPromise]);
                        
                        userData = userDoc.exists ? userDoc.data() : null;

                        // If not already privileged via email, check if they are in the admins collection
                        if (!isPrivilegedUser && adminDoc.exists) {
                            isPrivilegedUser = true;
                        }
                    }
                } catch (error) {
                    if (error.code !== 'permission-denied') console.error("Error fetching user or admin data:", error);
                }
            }

            currentUser = user;
            currentUserData = userData;
            
            // Sync privileged status from Supabase role if available
            if (userData?.role === 'admin' || userData?.role === 'superadmin') {
                isPrivilegedUser = true;
            }
            
            currentIsPrivileged = isPrivilegedUser;
            
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

    window.showNotification = function(message, iconClass = 'fa-solid fa-info-circle', type = 'info', duration = 3000) {
        const notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) return;
        
        while (notificationContainer.children.length >= 3) {
            notificationContainer.removeChild(notificationContainer.firstChild);
        }
        
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `<i class="${iconClass} notification-icon ${type}"></i><span>${message}</span>`;
        notificationContainer.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('show');
            if (window.playClickSound) window.playClickSound();
        });
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300);
        }, duration);
    };

    if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
} else {
    run();
}
})();