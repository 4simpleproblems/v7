/**
 * navigation.js
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
    'navbar-bg': '#000000',
    'navbar-border': 'rgb(31 41 55)',
    'avatar-gradient': 'linear-gradient(135deg, #374151 0%, #111827 100%)',
    'avatar-border': '#4b5563',
    'menu-bg': '#000000',
    'menu-border': 'rgb(55 65 81)',
    'menu-divider': '#374151',
    'menu-text': '#d1d5db',
    'menu-username-text': '#ffffff', 
    'menu-email-text': '#9ca3af', 
    'menu-item-hover-bg': 'rgb(55 65 81)', 
    'menu-item-hover-text': '#ffffff',
    'glass-menu-bg': 'rgba(10, 10, 10, 0.8)',
    'glass-menu-border': 'rgba(55, 65, 81, 0.8)',
    'logged-out-icon-bg': '#010101',
    'logged-out-icon-border': '#374151',
    'logged-out-icon-color': '#DADADA',
    'glide-icon-color': '#ffffff',
    'glide-gradient-left': 'linear-gradient(to right, #000000, transparent)',
    'glide-gradient-right': 'linear-gradient(to left, #000000, transparent)',
    'tab-text': '#9ca3af',
    'tab-hover-text': '#ffffff',
    'tab-hover-border': '#d1d5db',
    'tab-hover-bg': 'rgba(79, 70, 229, 0.05)',
    'tab-active-text': '#4f46e5',
    'tab-active-border': '#4f46e5',
    'tab-active-bg': 'rgba(79, 70, 229, 0.1)',
    'tab-active-hover-text': '#6366f1',
    'tab-active-hover-border': '#6366f1',
    'tab-active-hover-bg': 'rgba(79, 70, 229, 0.15)',
    'pin-btn-border': '#4b5563',
    'pin-btn-hover-bg': '#374151',
    'pin-btn-icon-color': '#d1d5db',
    'hint-bg': '#010101',
    'hint-border': '#374151',
    'hint-text': '#ffffff',
    'bg-primary': '#040404',
    'bg-secondary': '#080808',
    'text-primary': '#ffffff',
    'text-secondary': '#c0c0c0',
    'accent-primary': '#4f46e5',
    'accent-secondary': 'rgba(79, 70, 229, 0.4)',
    'border-primary': '#1a1a1a',
    'border-secondary': 'rgba(255,255,255,0.05)',
    'button-bg': 'rgba(79, 70, 229, 0.1)',
    'button-text': '#4f46e5'
};

let fireworksInstance = null; // Store fireworks instance globally

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
    
    // Determine if it's a light theme
    const isLightTheme = lightThemeNames.includes(themeToApply.name);

    for (const [key, value] of Object.entries(themeToApply)) {
        if (key !== 'logo-src' && key !== 'name') {
            root.style.setProperty(`--${key}`, value);
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

    logos.forEach(logoImg => {
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
            logoImg.style.filter = `drop-shadow(100px 0 0 ${tintColor})`;
            logoImg.style.transform = 'translateX(-100px)';
        }

        if (modeChanged) {
            void logoImg.offsetWidth; 
            logoImg.style.transition = 'filter 0.3s ease'; 
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
    let allPages = {};    let currentUser = null;    let currentUserData = null;
    let currentIsPrivileged = false;
    let currentScrollLeft = 0; 
    let hasScrolledToActiveTab = false; 
    let globalClickListenerAdded = false;
    let authCheckCompleted = false; 
    let isRedirecting = false;

    const loadScript = (src, isModule = false) => {        return new Promise((resolve, reject) => {
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

        const getProfileButtonHtml = (user, userData) => {
            if (!user) return '';
            const username = userData?.username || user.displayName?.toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
            const displayName = userData?.displayName || user.displayName || username;
            const pfpType = userData?.pfpType || 'google'; 

            let avatarHtml = '';
            const initial = (userData?.letterAvatarText || displayName.charAt(0)).toUpperCase();
            if (pfpType === 'custom' && userData?.customPfp) {
                avatarHtml = `<img src="${userData.customPfp}" class="w-full h-full object-cover" style="border-radius: 14px;" alt="Profile">`;
            } else if (pfpType === 'mibi' && userData?.mibiConfig) {
                const { eyes, mouths, hats, bgColor, rotation, size, offsetX, offsetY } = userData.mibiConfig;
                avatarHtml = `
                    <div class="w-full h-full relative overflow-hidden" style="background-color: ${bgColor || '#3B82F6'}; border-radius: 14px;">
                         <div class="absolute inset-0 w-full h-full" style="transform: translate(${offsetX || 0}%, ${offsetY || 0}%) rotate(${rotation || 0}deg) scale(${(size || 100) / 100}); transform-origin: center;">
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
                avatarHtml = `<div class="initial-avatar w-full h-full font-semibold ${fontSizeClass}" style="background: ${bg}; color: ${textColor}; border-radius: 14px;">${initial}</div>`;
            } else {
                const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
                const googlePhoto = googleProvider ? googleProvider.photoURL : null;
                const displayPhoto = googlePhoto || user.photoURL;
                if (displayPhoto) {
                    avatarHtml = `<img src="${displayPhoto}" class="w-full h-full object-cover" style="border-radius: 14px;" alt="Profile">`;
                } else {
                    const bg = DEFAULT_THEME['avatar-gradient'];
                    const textColor = getLetterAvatarTextColor(bg);
                    const fontSizeClass = initial.length >= 3 ? 'text-xs' : (initial.length === 2 ? 'text-sm' : 'text-base');
                    avatarHtml = `<div class="initial-avatar w-full h-full font-semibold ${fontSizeClass}" style="background: ${bg}; color: ${textColor}; border-radius: 14px;">${initial}</div>`;
                }
            }

            const followers = userData?.followerCount || 0;
            const following = userData?.followingCount || 0;
            const followersDisplay = followers > 999 ? (followers / 1000).toFixed(1) + 'k' : followers;
            const followingDisplay = following > 999 ? (following / 1000).toFixed(1) + 'k' : following;
            const isOnline = userData?.isOnline || false;
            const currentActivity = userData?.currentActivity || null;

            const userTagHtml = (userData?.userTag) 
                ? `<div class="text-xs font-italic" style="color: ${userData.userTag.color}; font-style: italic; margin-top: 2px;">${userData.userTag.text}</div>`
                : '';

            const statusHtml = isOnline 
                ? `<div class="flex items-center gap-1.5 mt-1 overflow-hidden">
                     <span class="w-2 h-2 rounded-full bg-[var(--accent-color)] animate-pulse shadow-[0_0_8px_var(--accent-glow)] flex-shrink-0"></span>
                     <span class="text-[10px] text-[var(--accent-color)] font-medium uppercase tracking-wider truncate">${currentActivity ? `On: ${currentActivity}` : 'Online'}</span>
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
                        <div class="border-b border-gray-700 mb-2 w-full min-w-0 flex items-center gap-3 pb-2 cursor-pointer hover:bg-white/5 transition rounded-2xl p-1" onclick="window.location.href='/logged-in/@${username}'">
                            <div class="w-10 h-10 flex-shrink-0 relative" id="auth-menu-avatar-container">
                                ${avatarHtml}
                            </div>
                            <div class="min-w-0 flex-1 overflow-hidden">
                                <div class="marquee-container" id="displayname-marquee">
                                    <p class="text-sm auth-menu-displayname marquee-content">${displayName}</p>
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
        }

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
                            <!-- Notifications will be injected here -->
                            <div class="notification-empty">No notifications yet</div>
                        </div>
                    </div>
                </div>
            `;
        }

        const getAuthControlsHtml = () => {
            const user = currentUser;
            const userData = currentUserData;

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
                const displayName = userData?.displayName || user.displayName || userData?.username || 'User';
                let avatarHtml = '';
                const pfpType = userData?.pfpType || 'google'; 

                if (pfpType === 'custom' && userData?.customPfp) {
                    avatarHtml = `<img src="${userData.customPfp}" class="w-full h-full object-cover" style="border-radius: 14px;" alt="Profile">`;
                } else if (pfpType === 'mibi' && userData?.mibiConfig) {
                    const { eyes, mouths, hats, bgColor, rotation, size, offsetX, offsetY } = userData.mibiConfig;
                    avatarHtml = `
                        <div class="w-full h-full relative overflow-hidden" style="background-color: ${bgColor || '#3B82F6'}; border-radius: 14px;">
                             <div class="absolute inset-0 w-full h-full" style="transform: translate(${offsetX || 0}%, ${offsetY || 0}%) rotate(${rotation || 0}deg) scale(${(size || 100) / 100}); transform-origin: center;">
                                 <img src="/mibi-avatars/head.png" class="absolute inset-0 w-full h-full object-contain">
                                 ${eyes ? `<img src="/mibi-avatars/eyes/${eyes}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                 ${mouths ? `<img src="/mibi-avatars/mouths/${mouths}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                                 ${hats ? `<img src="/mibi-avatars/hats/${hats}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                             </div>
                        </div>
                    `;
                } else if (pfpType === 'letter') {
                    const bg = userData?.pfpLetterBg || DEFAULT_THEME['avatar-gradient'];
                    const initial = (userData?.letterAvatarText || displayName.charAt(0)).toUpperCase();
                    const textColor = getLetterAvatarTextColor(bg); 
                    const fontSizeClass = initial.length >= 3 ? 'text-xs' : (initial.length === 2 ? 'text-sm' : 'text-base'); 
                    avatarHtml = `<div class="initial-avatar w-full h-full font-semibold ${fontSizeClass}" style="background: ${bg}; color: ${textColor}; border-radius: 14px;">${initial}</div>`;
                } else {
                    const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
                    const googlePhoto = googleProvider ? googleProvider.photoURL : null;
                    const displayPhoto = googlePhoto || user.photoURL;
                    if (displayPhoto) {
                        avatarHtml = `<img src="${displayPhoto}" class="w-full h-full object-cover" style="border-radius: 14px;" alt="Profile">`;
                    } else {
                        const bg = DEFAULT_THEME['avatar-gradient'];
                        const initial = (userData?.letterAvatarText || displayName.charAt(0)).toUpperCase();
                        const textColor = getLetterAvatarTextColor(bg);
                        const fontSizeClass = initial.length >= 3 ? 'text-xs' : (initial.length === 2 ? 'text-sm' : 'text-base');
                        avatarHtml = `<div class="initial-avatar w-full h-full font-semibold ${fontSizeClass}" style="background: ${bg}; color: ${textColor}; border-radius: 14px;">${initial}</div>`;
                    }
                }
                
                const isPinHidden = localStorage.getItem(PIN_BUTTON_HIDDEN_KEY) === 'true';
                const showPinOption = isPinHidden 
                    ? `<button id="show-pin-button" class="auth-menu-link"><i class="fa-solid fa-map-pin w-4"></i>Show Pin Button</button>` 
                    : '';

                return `
                    <div id="auth-button-container" class="relative flex-shrink-0 flex items-center">
                        <button id="auth-toggle" class="w-10 h-10 border border-gray-600 overflow-hidden" style="border-radius: 16px;">
                            ${avatarHtml}
                        </button>
                        <div id="auth-menu-container" class="auth-menu-container closed">
                            <div class="border-b mb-2 w-full min-w-0 flex items-center">
                                <div class="min-w-0 flex-1 overflow-hidden">
                                    <div class="marquee-container" id="email-marquee-auth">
                                        <p class="text-xs text-gray-400 auth-menu-email marquee-content">${user.email || 'No email'}</p>
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
                    logoutButton.addEventListener('click', () => {
                        auth.signOut().catch(err => console.error("Logout failed:", err));
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

            let currentTheme;            try {
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

            // Check leaderboard eligibility: show by default (guests/new), but hide if they explicitly haven't agreed or opted out
            const canSeeLeaderboard = !userData || (userData.leaderboardAccepted && !userData.leaderboardOptOut);

            const tabsHtml = Object.entries(pages || {})
                .filter(([key, page]) => {
                    if (page.adminOnly && !isPrivilegedUser) return false;
                    if (page.testerOnly && !(isPrivilegedUser || (userData && (userData.isTester || userData.tester)))) return false;
                    if (key === 'leaderboard' && !canSeeLeaderboard) return false;
                    return true;
                }) 
                .map(([key, page]) => { // Get key and page from entry
                    const isActive = (key === activePageKey); // Compare with the single activePageKey
                    const activeClass = isActive ? 'active' : '';
                    const iconClasses = getIconClass(page.icon);
                    return `<a href="${page.url}" class="nav-tab ${activeClass}"><i class="${iconClasses} mr-2"></i>${page.name}</a>`;
                }).join('');

            // Only update innerHTML if tabContainer exists (it should with new structure)
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
                    // Animation logic handled by updatePinButtonArea usually destroys elements,
                    // but if pinContextMenu persists or if we just want to close it:
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
                        const googleProvider = currentUser?.providerData.find(p => p.providerId === 'google.com');
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
            
            <a href="/" class="flex items-center space-x-2 flex-shrink-0 overflow-hidden relative" style="z-index: 20;">
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
                border-radius: 16px; /* Reset to 16px */
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
                border-radius: 26px; 
                padding: 0.75rem; /* Equal spacing on edges */
                display: flex; flex-direction: column; gap: 0.5rem; /* Flex gap for equal internal spacing */
                box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                transition: transform 0.2s ease-out, opacity 0.2s ease-out, background-color 0.3s ease, border-color 0.3s ease;
                transform-origin: top right; z-index: 10000;
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
                border-radius: 16px; /* Updated to 16px */
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

        const app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        allPages = pages;

        auth.onAuthStateChanged(async (user) => {
            let isPrivilegedUser = false;
            let userData = null;
            currentUser = user;

            if (user) {
                // Check if hardcoded privileged email
                isPrivilegedUser = user.email === PRIVILEGED_EMAIL;

                // Notifications Listener
                db.collection('notifications')
                    .where('recipientId', '==', user.uid)
                    .limit(50)
                    .onSnapshot(snap => {
                        let newDocs = snap.docChanges()
                            .filter(change => change.type === 'added')
                            .map(change => ({ id: change.doc.id, ...change.doc.data() }));
                        
                        // Sort by timestamp desc client-side if needed, 
                        // but here we just process them as they come.
                        
                        snap.docChanges().forEach(change => {
                            if (change.type === 'added') {
                                const data = change.doc.data();
                                const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
                                
                                // Avoid showing old notifications as popups on initial load
                                const isNew = (new Date() - timestamp) < 10000; 

                                // Add to history
                                const alreadyInHistory = notificationHistory.find(n => n.id === change.doc.id);
                                if (!alreadyInHistory) {
                                    notificationHistory.unshift({
                                        message: data.message,
                                        timestamp: timestamp,
                                        id: change.doc.id
                                    });
                                    
                                    // Keep history sorted
                                    notificationHistory.sort((a, b) => b.timestamp - a.timestamp);
                                    
                                    if (notificationHistory.length > 20) notificationHistory.pop();
                                    updateNotificationMenu();
                                    
                                    if (isNew) {
                                        window.showNotification(data.message, true);
                                    }
                                }
                            }
                        });
                    }, err => console.warn("Notifications listener error:", err));

                // Set up real-time listener for user data
                db.collection('users').doc(user.uid).onSnapshot(async (doc) => {
                    userData = doc.exists ? doc.data() : null;
                    currentUserData = userData;

                    // --- DATA CORRECTION LOGIC ---
                    if (userData) {
                        let updated = false;
                        const originalUsername = userData.username || user.displayName || 'user';
                        const correctedUsername = originalUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
                        
                        // If username violates new strict rules, fix it
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
                                await db.collection('users').doc(user.uid).update({
                                    username: userData.username,
                                    displayName: userData.displayName
                                });
                            } catch (e) { console.error("Error updating user data:", e); }
                        }
                    }

                    // --- Apply Theme from Firestore ---
                    if (userData && userData.navbarTheme) {
                        window.applyTheme(userData.navbarTheme);
                        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(userData.navbarTheme));
                    }

                    renderNavbar(currentUser, currentUserData, allPages, currentIsPrivileged);
                    
                });

                try {
                    const adminDoc = await db.collection('admins').doc(user.uid).get();
                    if (!isPrivilegedUser && adminDoc.exists) {
                        isPrivilegedUser = true;
                    }
                } catch (error) {
                    console.error("Error fetching admin data:", error);
                }
            } else {
                renderNavbar(null, null, allPages, false);
                
            }

            currentIsPrivileged = isPrivilegedUser;
            renderNavbar(currentUser, currentUserData, allPages, currentIsPrivileged);

            // Set flag after the first check
            if (!authCheckCompleted) {
                authCheckCompleted = true;
            }

            // Only redirect if auth check is completed, user is logged out, and we are not already redirecting
            if (authCheckCompleted && !user && !isRedirecting) {
                const targetUrl = '../index.html'; 
                console.log(`User logged out. Restricting access and redirecting to ${targetUrl}`);
                isRedirecting = true;
                window.location.href = targetUrl;
            }
        });
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

    window.showNotification = function(message, skipHistory = false) {
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
            data.timeout = setTimeout(() => removeNotif(message), 3000);
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
        const timeout = setTimeout(() => removeNotif(message), 3000);
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

// Made with ❤️ from 4SP
