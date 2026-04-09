/**
 * navigation.js (v6.7.3 - Supabase Migration)
 * Fully migrated to Supabase. Tag display active. Management moved to Analytics.
 */

// Prevent multiple loads
if (window.__4sp_nav_loaded) {
    console.warn("Navigation.js already loaded, skipping...");
} else {
    window.__4sp_nav_loaded = true;

// --- Configuration ---
window.PAGE_CONFIG_URL = window.PAGE_CONFIG_URL || '../page-identification.json';
const PRIVILEGED_EMAIL = '4simpleproblems@gmail.com'; 
const THEME_STORAGE_KEY = 'user-navbar-theme';
const lightThemeNames = ['Light', 'Lavender', 'Rose Gold', 'Mint', 'Pink', 'Birthday'];

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

const hexToRgb = (hex) => {
    if (!hex || typeof hex !== 'string') return null;
    let c = hex.substring(1); 
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
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

    for (const [key, value] of Object.entries(themeToApply)) {
        if (key !== 'logo-src' && key !== 'name') {
            root.style.setProperty(`--${key}`, value);
        }
    }

    const lightestAccent = themeToApply['tab-active-hover-text'] || themeToApply['tab-active-text'] || themeToApply['accent-primary'] || '#ffffff';
    const rgb = hexToRgb(lightestAccent);
    const cardBlurBg = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.75)` : 'rgba(79, 70, 229, 0.75)';
    root.style.setProperty('--card-blur-bg', cardBlurBg);

    if (isLightTheme) {
        root.style.setProperty('--menu-username-text', '#000000'); 
        root.style.setProperty('--menu-email-text', '#333333');   
    } else {
        root.style.setProperty('--menu-username-text', themeToApply['menu-username-text'] || DEFAULT_THEME['menu-username-text']);
        root.style.setProperty('--menu-email-text', themeToApply['menu-email-text'] || DEFAULT_THEME['menu-email-text']);
    }
};

(function() {
    let allPages = {};
    let currentUser = null;
    let currentUserData = null;
    let currentIsPrivileged = false;
    let authCheckCompleted = false;

    const PINNED_PAGE_KEY = 'navbar_pinnedPage';
    const PIN_BUTTON_HIDDEN_KEY = 'navbar_pinButtonHidden';

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

    const getAvatarHTML = (userData, sizeClass = "w-10 h-10", forceCSS = false, authUser = null) => {
        const pT = userData?.pfp_type || 'user';
        const dN = userData?.display_name || authUser?.email?.split('@')[0] || 'User';
        const customPfp = userData?.avatar_url;
        const letterBg = userData?.pfp_letter_bg || DEFAULT_THEME['avatar-gradient'];
        const letterChar = (userData?.pfp_letter_char || dN).charAt(0).toUpperCase();
        
        let innerHTML = '';
        if (pT === 'custom' && customPfp) {
            innerHTML = `<img src="${customPfp}" class="w-full h-full object-cover">`;
        } else {
            innerHTML = `<div class="w-full h-full flex items-center justify-center font-bold text-white" style="background:${letterBg};">${letterChar}</div>`;
        }
        return `<div class="${sizeClass} aspect-square rounded-xl shrink-0 flex items-center justify-center overflow-hidden border border-white/5">${innerHTML}</div>`;
    };

    const getProfileButtonHtml = (user, userData) => {
        if (!user) return '';
        const username = userData?.username || user.email.split('@')[0];
        const dN = userData?.display_name || username;
        const avatarHtml = getAvatarHTML(userData, "w-10 h-10", false, user);
        const userTagHtml = (userData?.user_tag) 
            ? `<div class="text-[10px] font-italic" style="color: ${userData.user_tag.color}; font-style: italic;">${userData.user_tag.text}</div>`
            : '';

        return `
            <div id="profile-area-wrapper" class="relative flex-shrink-0 flex items-center">
                <button id="profile-toggle" class="w-10 h-10 border border-gray-600 flex items-center justify-center hover:bg-gray-700 transition" style="border-radius: 14px; background: var(--tab-hover-bg, rgba(79, 70, 229, 0.05));">
                    <i class="fa-solid fa-address-card text-gray-300"></i>
                </button>
                <div id="profile-menu-container" class="auth-menu-container closed">
                    <div class="border border-gray-700/50 mb-2 w-full flex items-center gap-3 cursor-pointer hover:bg-white/5 transition rounded-2xl p-2" onclick="window.location.href='/logged-in/@${username}'">
                        <div class="w-10 h-10 flex-shrink-0 relative">${avatarHtml}</div>
                        <div class="min-w-0 flex-1 overflow-hidden">
                            <p class="text-sm font-bold text-white truncate">${dN}</p>
                            <p class="text-xs text-gray-500 truncate">@${username}</p>
                            ${userTagHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const getAuthControlsHtml = () => {
        const user = currentUser;
        const userData = currentUserData;
        const isAdmin = currentIsPrivileged;

        if (!user) {
            return `
                <div id="auth-button-container" class="relative flex-shrink-0 flex items-center">
                    <button id="auth-toggle" class="w-10 h-10 border border-gray-600 flex items-center justify-center hover:bg-gray-700 transition" style="border-radius: 14px;">
                        <i class="fa-solid fa-user text-gray-300"></i>
                    </button>
                    <div id="auth-menu-container" class="auth-menu-container closed">
                        <a href="/authentication.html" class="auth-menu-link"><i class="fa-solid fa-lock w-4"></i> Authenticate</a>
                    </div>
                </div>
            `;
        }

        const adminSection = isAdmin ? `
            <div class="border-t border-white/5 pt-2 mt-2 flex flex-col gap-1">
                <p class="text-[9px] uppercase tracking-widest font-black opacity-30 px-3 mb-1">Administrative</p>
                <a href="/logged-in/analytics.html" class="auth-menu-link">
                    <i class="fa-solid fa-chart-line w-4"></i> Analytics
                </a>
            </div>
        ` : '';

        const userTagHtml = (userData?.user_tag) 
            ? `<div class="text-[10px] font-italic px-2 mb-1" style="color: ${userData.user_tag.color}; font-style: italic;">${userData.user_tag.text}</div>`
            : '';

        return `
            <div id="auth-button-container" class="relative flex-shrink-0 flex items-center">
                <button id="auth-toggle" class="w-10 h-10 border border-gray-600 overflow-hidden" style="border-radius: 14px; background: var(--bg-secondary);">
                    ${getAvatarHTML(userData, "w-10 h-10", false, user)}
                </button>
                <div id="auth-menu-container" class="auth-menu-container closed">
                    <div class="border-b border-white/5 mb-2 pb-2">
                        <p class="text-xs text-gray-400 truncate px-2">${user.email}</p>
                        ${userTagHtml}
                    </div>
                    <a href="/logged-in/settings.html" class="auth-menu-link"><i class="fa-solid fa-gear w-4"></i> Settings</a>
                    ${adminSection}
                    <button id="logout-button" class="auth-menu-button text-red-400 hover:bg-red-900/20"><i class="fa-solid fa-right-from-bracket w-4"></i> Log Out</button>
                </div>
            </div>
        `;
    };

    const renderNavbar = (user, userData, pages, isAdmin) => {
        const container = document.getElementById('navbar-container');
        if (!container) return;

        container.innerHTML = `
            <div id="navbar-container-inner" style="position:fixed; top:0; left:0; right:0; height:64px; background:black; border-bottom:1px solid #222; display:flex; align-items:center; justify-content:space-between; padding:0 1rem; z-index:9999;">
                <a href="/"><img src="/images/logo.png" style="height:40px;"></a>
                <div id="tabs-container" style="display:flex; gap:0.5rem; flex-grow:1; justify-content:center;"></div>
                <div id="auth-controls-wrapper" style="display:flex; align-items:center; gap:0.75rem;"></div>
            </div>
        `;

        const tabContainer = document.getElementById('tabs-container');
        const authWrapper = document.getElementById('auth-controls-wrapper');
        
        const tabsHtml = Object.entries(pages || {}).map(([key, page]) => {
            const isActive = window.location.pathname.includes(page.url.replace('..', ''));
            return `<a href="${page.url}" class="nav-tab ${isActive ? 'active' : ''}" style="color:white; text-decoration:none; padding:0.5rem 1rem; border-radius:12px;">${page.name}</a>`;
        }).join('');

        if (tabContainer) tabContainer.innerHTML = tabsHtml;
        if (authWrapper) authWrapper.innerHTML = `${getProfileButtonHtml(user, userData)}${getAuthControlsHtml()}`;

        setupListeners();
    };

    const setupListeners = () => {
        const authToggle = document.getElementById('auth-toggle');
        const authMenu = document.getElementById('auth-menu-container');
        const profileToggle = document.getElementById('profile-toggle');
        const profileMenu = document.getElementById('profile-menu-container');

        if (authToggle && authMenu) {
            authToggle.onclick = (e) => {
                e.stopPropagation();
                if (profileMenu) profileMenu.classList.add('closed');
                authMenu.classList.toggle('closed');
            };
        }

        if (profileToggle && profileMenu) {
            profileToggle.onclick = (e) => {
                e.stopPropagation();
                if (authMenu) authMenu.classList.add('closed');
                profileMenu.classList.toggle('closed');
            };
        }

        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                await window.supabase.auth.signOut();
                window.location.href = '/authentication.html';
            };
        }

        document.onclick = () => {
            if (authMenu) authMenu.classList.add('closed');
            if (profileMenu) profileMenu.classList.add('closed');
        };
    };

    const run = async () => {
        const supabase = window.supabase;
        if (!supabase) { setTimeout(run, 100); return; }

        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session?.user;
        
        if (currentUser) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
            const { data: roles } = await supabase.from('roles').select('role').eq('user_id', currentUser.id);
            currentUserData = profile;
            currentIsPrivileged = roles?.some(r => r.role === 'full_admin') || profile?.is_admin || currentUser.email === PRIVILEGED_EMAIL;
        }

        const res = await fetch(window.PAGE_CONFIG_URL);
        allPages = await res.json();
        renderNavbar(currentUser, currentUserData, allPages, currentIsPrivileged);
    };

    run();
})();
}
// Made with ❤️ from 4SP
