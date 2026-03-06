/**
 * navigation-mini.js
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
    'tab-hover-bg': 'rgba(79, 70, 229, 0.05)',
    'tab-active-text': '#4f46e5',
    'tab-active-border': '#4f46e5',
    'tab-active-bg': 'rgba(79, 70, 229, 0.1)',
    'pin-btn-border': '#4b5563',
    'pin-btn-hover-bg': '#374151',
    'pin-btn-icon-color': '#d1d5db',
    'hint-bg': '#010101',
    'hint-border': '#374151',
    'hint-text': '#ffffff'
};

let fireworksInstance = null; // Store fireworks instance globally

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
};

let auth;
let db;

(function() {
    let allPages = {};
    let currentUser = null;
    let currentUserData = null;
    let currentIsPrivileged = false;
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
        if (nameCandidate) baseName = nameCandidate;
        else {
            baseName = nameParts.find(p => !stylePrefixes.includes(p));
            if (baseName && !baseName.startsWith('fa-')) baseName = `fa-${baseName}`;
        }
        return baseName ? `${stylePrefix} ${baseName}` : '';
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
        const match = gradientBg?.match(/#([0-9a-fA-F]{3}){1,2}/);
        const rgb = hexToRgb(match ? match[0] : null);
        if (!rgb) return '#FFFFFF';
        return getLuminance(rgb) > 0.5 ? '#000000' : '#FFFFFF';
    };

    const getProfileButtonHtml = (user, userData) => {
        if (!user) return '';
        const username = userData?.username || user.displayName?.toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
        const displayName = userData?.displayName || user.displayName || username;
        const pfpType = userData?.pfpType || 'google'; 
        let avatarHtml = '';
        const initial = (userData?.letterAvatarText || displayName.charAt(0)).toUpperCase();

        if (pfpType === 'custom' && userData?.customPfp) {
            avatarHtml = `<img src="${userData.customPfp}" class="w-full h-full object-cover" style="border-radius: 20px;" alt="Profile">`;
        } else if (pfpType === 'mibi' && userData?.mibiConfig) {
            const { eyes, mouths, hats, bgColor, rotation, size, offsetX, offsetY } = userData.mibiConfig;
            avatarHtml = `
                <div class="w-full h-full relative overflow-hidden" style="background-color: ${bgColor || '#3B82F6'}; border-radius: 20px;">
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
            avatarHtml = `<div class="initial-avatar w-full h-full font-semibold" style="background: ${bg}; color: ${getLetterAvatarTextColor(bg)}; border-radius: 20px; display: flex; align-items: center; justify-content: center;">${initial}</div>`;
        } else {
            const displayPhoto = user.photoURL;
            if (displayPhoto) avatarHtml = `<img src="${displayPhoto}" class="w-full h-full object-cover" style="border-radius: 20px;" alt="Profile">`;
            else avatarHtml = `<div class="initial-avatar w-full h-full font-semibold" style="background: ${DEFAULT_THEME['avatar-gradient']}; color: white; border-radius: 20px; display: flex; align-items: center; justify-content: center;">${initial}</div>`;
        }

        return `
            <div id="profile-area-wrapper" class="relative flex-shrink-0 flex items-center">
                <button id="profile-toggle" class="w-10 h-10 border border-gray-600 flex items-center justify-center hover:bg-gray-700 transition" style="border-radius: 20px; position: relative; background: var(--tab-hover-bg, rgba(79, 70, 229, 0.05));">
                    <i class="fa-solid fa-address-card text-gray-300"></i>
                </button>
                <div id="profile-menu-container" class="auth-menu-container closed">
                    <div class="mb-2 w-full min-w-0 flex items-center gap-3 pb-2 cursor-pointer hover:bg-white/5 transition rounded-2xl p-1" onclick="window.location.href='/logged-in/@${username}'">
                        <div class="w-10 h-10 flex-shrink-0 relative">${avatarHtml}</div>
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-semibold text-white truncate">${displayName}</p>
                            <p class="text-xs text-gray-400 truncate">@${username}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const PINNED_PAGE_KEY = 'navbar_pinnedPage';
    const PIN_BUTTON_HIDDEN_KEY = 'navbar_pinButtonHidden';
    const PIN_HINT_SHOWN_KEY = 'navbar_pinHintShown';

    const getCurrentPageKey = () => {
        const currentPathname = window.location.pathname.toLowerCase();
        const cleanPath = (path) => {
            try {
                let resolved = new URL(path, window.location.origin).pathname.toLowerCase();
                if (resolved.endsWith('/index.html')) resolved = resolved.substring(0, resolved.lastIndexOf('/')) + '/';
                if (resolved.endsWith('.html')) resolved = resolved.slice(0, -5);
                if (resolved.length > 1 && resolved.endsWith('/')) resolved = resolved.slice(0, -1);
                return resolved;
            } catch (e) { return path; }
        };
        const currentCanonical = cleanPath(currentPathname);
        for (const [key, page] of Object.entries(allPages)) {
            if (currentCanonical === cleanPath(page.url)) return key;
            if (page.aliases && Array.isArray(page.aliases)) {
                for (const alias of page.aliases) {
                    if (currentCanonical === cleanPath(alias)) return key;
                }
            }
        }
        return null;
    };

    const getPinButtonHtml = () => {
        if (!currentUser) return '';
        const pinnedPageKey = localStorage.getItem(PINNED_PAGE_KEY);
        const isPinButtonHidden = localStorage.getItem(PIN_BUTTON_HIDDEN_KEY) === 'true';
        if (isPinButtonHidden) return '';
        const pages = allPages;
        const pinnedPageData = (pinnedPageKey && pages[pinnedPageKey]) ? pages[pinnedPageKey] : null;
        const pinButtonIcon = pinnedPageData ? getIconClass(pinnedPageData.icon) : 'fa-solid fa-map-pin';
        const pinButtonUrl = pinnedPageData ? pinnedPageData.url : '#'; 
        const pinButtonTitle = pinnedPageData ? `Go to ${pinnedPageData.name}` : 'Pin current page';
        const currentPageKey = getCurrentPageKey();
        const shouldShowRepin = (pinnedPageKey && pinnedPageKey !== currentPageKey) || (!pinnedPageKey && currentPageKey);
        
        return `
            <div id="pin-area-wrapper" class="relative flex-shrink-0 flex items-center">
                <a href="${pinButtonUrl}" id="pin-button" class="w-10 h-10 border flex items-center justify-center hover:bg-gray-700 transition" title="${pinButtonTitle}" style="border-radius: 20px; border-width: 1px; border-color: var(--pin-btn-border); color: var(--pin-btn-icon-color);">
                    <i id="pin-button-icon" class="${pinButtonIcon}"></i>
                </a>
                <div id="pin-context-menu" class="auth-menu-container closed" style="width: 12rem;">
                    ${shouldShowRepin ? `<button id="repin-button" class="auth-menu-link"><i class="fa-solid fa-thumbtack w-4"></i>Repin</button>` : ''}
                    ${pinnedPageData ? `<button id="remove-pin-button" class="auth-menu-link text-red-400 hover:text-red-300"><i class="fa-solid fa-xmark w-4"></i>Remove Pin</button>` : `<button id="hide-pin-button" class="auth-menu-link text-red-400 hover:text-red-300"><i class="fa-solid fa-eye-slash w-4"></i>Hide Button</button>`}
                </div>
            </div>
        `;
    };

    const getAuthControlsHtml = () => {
        const user = currentUser;
        const loggedOutView = `
            <button id="auth-toggle" class="w-10 h-10 border flex items-center justify-center hover:bg-gray-700 transition logged-out-auth-toggle">
                <i class="fa-solid fa-user"></i>
            </button>
            <div id="auth-menu-container" class="auth-menu-container closed" style="width: 16rem;">
                <a href="/authentication.html" class="auth-menu-link"><i class="fa-solid fa-lock w-4"></i>Authenticate</a>
            </div>
        `;
        const loggedInView = `
            <button id="auth-toggle" class="w-10 h-10 border border-gray-600 overflow-hidden" style="border-radius: 20px;">
                <i class="fa-solid fa-user-gear text-gray-300"></i>
            </button>
            <div id="auth-menu-container" class="auth-menu-container closed">
                <a href="/logged-in/settings.html" class="auth-menu-link"><i class="fa-solid fa-gear w-4"></i>Settings</a>
                <button id="logout-button" class="auth-menu-button text-red-400"><i class="fa-solid fa-right-from-bracket w-4"></i>Log Out</button>
            </div>
        `;
        return user ? loggedInView : loggedOutView;
    };

    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            body { padding-top: 64px !important; }
            #navbar-container {
                position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important;
                z-index: 9999 !important; background: var(--navbar-bg, #000) !important;
                backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important;
                border-bottom: 1px solid var(--navbar-border, rgba(255, 255, 255, 0.08)) !important;
                height: 64px !important; width: 100% !important; display: flex !important;
                align-items: center !important; justify-content: space-between !important;
                padding: 0 1rem !important; box-sizing: border-box !important;
            }
            .navbar-logo { height: 40px !important; width: auto !important; }
            .auth-menu-container {
                position: absolute !important; right: 0 !important; top: 55px !important; width: 16rem !important;
                background: var(--menu-bg, #000) !important; border: 1px solid var(--menu-border, #333) !important;
                border-radius: 26px !important; padding: 0.75rem !important; display: flex !important; flex-direction: column !important;
                gap: 0.5rem !important; box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important; transform-origin: top right !important;
            }
            .auth-menu-container.closed { display: none !important; }
            .auth-menu-link, .auth-menu-button { 
                display: flex !important; align-items: center !important; gap: 0.75rem !important; width: 100% !important;
                padding: 0.75rem 1rem !important; border-radius: 16px !important; background: var(--tab-hover-bg) !important;
                color: var(--menu-text) !important; border: 1px solid transparent !important; transition: all 0.2s !important;
            }
        `;
        document.head.appendChild(style);
    };

    const run = async () => {
        if (!document.getElementById('navbar-container')) {
            const navbarDiv = document.createElement('div');
            navbarDiv.id = 'navbar-container';
            document.body.prepend(navbarDiv);
        }
        
        injectStyles();
        const container = document.getElementById('navbar-container');
        container.innerHTML = `
            <a href="/" class="flex items-center space-x-2 flex-shrink-0" style="z-index: 20;">
                <img src="/images/logo.png" alt="4SP Logo" class="navbar-logo" id="navbar-logo">
            </a>
            <div id="nav-left-controls" style="z-index: 20; display: flex; align-items: center; gap: 0.5rem; margin-left: 1rem;"></div>
            <div id="auth-controls-wrapper" class="auth-controls-wrapper" style="z-index: 20; display: flex; align-items: center; gap: 1rem;"></div>
        `;

        await loadCSS("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css");

        try {
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
            await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js");
            const app = firebase.initializeApp(FIREBASE_CONFIG);
            auth = firebase.auth();
            db = firebase.firestore();

            const response = await fetch(window.PAGE_CONFIG_URL);
            allPages = await response.json();

            auth.onAuthStateChanged(async (user) => {
                currentUser = user;
                if (user) {
                    db.collection('users').doc(user.uid).onSnapshot(doc => {
                        currentUserData = doc.data();
                        renderNavbar(user, currentUserData);
                    });
                } else {
                    renderNavbar(null, null);
                }
            });
        } catch (e) { console.error(e); }
    };

    const renderNavbar = (user, userData) => {
        const left = document.getElementById('nav-left-controls');
        const right = document.getElementById('auth-controls-wrapper');
        if (left) left.innerHTML = getPinButtonHtml();
        if (right) right.innerHTML = getProfileButtonHtml(user, userData) + getAuthControlsHtml();
        setupToggleListeners();
    };

    const setupToggleListeners = () => {
        const authBtn = document.getElementById('auth-toggle');
        const authMenu = document.getElementById('auth-menu-container');
        const profBtn = document.getElementById('profile-toggle');
        const profMenu = document.getElementById('profile-menu-container');
        const pinBtn = document.getElementById('pin-button');
        const pinMenu = document.getElementById('pin-context-menu');

        const toggle = (btn, menu) => {
            if (!btn || !menu) return;
            btn.onclick = (e) => {
                e.stopPropagation();
                const wasOpen = !menu.classList.contains('closed');
                document.querySelectorAll('.auth-menu-container').forEach(m => m.classList.add('closed'));
                if (!wasOpen) menu.classList.remove('closed');
            };
        };

        toggle(authBtn, authMenu);
        toggle(profBtn, profMenu);
        if (pinBtn) {
            pinBtn.oncontextmenu = (e) => {
                e.preventDefault();
                const wasOpen = !pinMenu.classList.contains('closed');
                document.querySelectorAll('.auth-menu-container').forEach(m => m.classList.add('closed'));
                if (!wasOpen) pinMenu.classList.remove('closed');
            };
        }

        document.onclick = () => document.querySelectorAll('.auth-menu-container').forEach(m => m.classList.add('closed'));
        
        const logout = document.getElementById('logout-button');
        if (logout) logout.onclick = () => auth.signOut();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
})();
