/**
 * navigation-mini.js (v6.7.3 - Supabase Migration)
 */

if (window.__4sp_nav_mini_loaded) {
    console.warn("NavigationMini already loaded, skipping...");
} else {
    window.__4sp_nav_mini_loaded = true;

    // --- Configuration ---
    const PRIVILEGED_EMAIL = '4simpleproblems@gmail.com'; 
    const THEME_STORAGE_KEY = 'user-navbar-theme';

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
        'tab-hover-bg': 'rgba(79, 70, 229, 0.05)',
        'tab-active-text': '#4f46e5',
        'bg-secondary': '#0d0d0d',
        'logged-out-icon-bg': '#010101',
        'logged-out-icon-border': '#374151',
        'logged-out-icon-color': '#DADADA'
    };

    let currentUser = null;
    let currentUserData = null;
    let currentIsPrivileged = false;
    let authCheckCompleted = false;
    let isRedirecting = false;

    // --- Helpers ---
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

    const getLetterAvatarTextColor = (gradientBg) => {
        const match = gradientBg?.match(/#([0-9a-fA-F]{3}){1,2}/);
        const rgb = hexToRgb(match ? match[0] : '#4f46e5');
        return getLuminance(rgb) > 0.5 ? '#000000' : '#FFFFFF';
    };

    const getAvatarHTML = (userData, sizeClass = "w-10 h-10", authUser = null) => {
        const pT = userData?.pfp_type || 'user';
        const dN = userData?.display_name || authUser?.email?.split('@')[0] || 'User';
        const customPfp = userData?.avatar_url;
        const letterBg = userData?.pfp_letter_bg || DEFAULT_THEME['avatar-gradient'];
        const letterChar = (userData?.pfp_letter_char || dN).charAt(0).toUpperCase();
        
        let innerHTML = '';
        if (pT === 'custom' && customPfp) {
            innerHTML = `<img src="${customPfp}" class="w-full h-full object-cover rounded-xl">`;
        } else {
            innerHTML = `<div class="w-full h-full flex items-center justify-center font-bold text-white" style="background:${letterBg}; color:${getLetterAvatarTextColor(letterBg)}; border-radius:12px;">${letterChar}</div>`;
        }
        return `<div class="${sizeClass} aspect-square rounded-xl shrink-0 flex items-center justify-center overflow-hidden border border-white/5">${innerHTML}</div>`;
    };

    const getAuthControlsHtml = () => {
        const user = currentUser;
        const userData = currentUserData;
        const isAdmin = currentIsPrivileged;

        if (!user) {
            return `
                <div id="auth-button-container" class="relative flex-shrink-0 flex items-center">
                    <button id="auth-toggle" class="w-10 h-10 border border-gray-600 flex items-center justify-center hover:bg-gray-700 transition logged-out-auth-toggle" style="border-radius: 14px;">
                        <i class="fa-solid fa-user text-gray-300"></i>
                    </button>
                    <div id="auth-menu-container" class="auth-menu-container closed" style="width: 16rem;">
                        <a href="/authentication.html" class="auth-menu-link"><i class="fa-solid fa-lock w-4"></i> Authenticate</a>
                    </div>
                </div>
            `;
        }

        const adminSection = isAdmin ? `
            <div class="border-t border-white/5 pt-2 mt-2 flex flex-col gap-1">
                <a href="/logged-in/analytics.html" class="auth-menu-link"><i class="fa-solid fa-chart-line w-4"></i> Analytics</a>
            </div>
        ` : '';

        const userTagHtml = (userData?.user_tag || userData?.userTag) 
            ? `<div class="text-[10px] font-italic px-2 mb-1" style="color: ${(userData.user_tag || userData.userTag).color}; font-style: italic;">${(userData.user_tag || userData.userTag).text}</div>`
            : '';

        return `
            <div id="auth-button-container" class="relative flex-shrink-0 flex items-center">
                <button id="auth-toggle" class="w-10 h-10 border border-gray-600 overflow-hidden" style="border-radius: 14px; background: var(--bg-secondary);">
                    ${getAvatarHTML(userData, "w-10 h-10", user)}
                </button>
                <div id="auth-menu-container" class="auth-menu-container closed">
                    <div class="border-b border-white/5 mb-2 pb-2">
                        <p class="text-[10px] text-gray-500 truncate px-2">${user.email}</p>
                        ${userTagHtml}
                    </div>
                    <a href="/logged-in/settings.html" class="auth-menu-link"><i class="fa-solid fa-gear w-4"></i> Settings</a>
                    ${adminSection}
                    <button id="logout-button" class="auth-menu-button text-red-400 hover:bg-red-900/20"><i class="fa-solid fa-right-from-bracket w-4"></i> Log Out</button>
                </div>
            </div>
        `;
    };

    const renderNavbar = () => {
        const container = document.getElementById('navbar-container');
        if (!container) return;
        
        container.innerHTML = `
            <div id="navbar-container-inner" style="position:fixed; top:0; left:0; right:0; height:64px; background:black; border-bottom:1px solid #222; display:flex; align-items:center; justify-content:space-between; padding:0 1rem; z-index:9999;">
                <a href="/"><img src="/images/logo.png" style="height:40px;"></a>
                <div id="auth-controls-wrapper">${getAuthControlsHtml()}</div>
            </div>
        `;
        setupListeners();
    };

    const setupListeners = () => {
        const toggle = document.getElementById('auth-toggle');
        const menu = document.getElementById('auth-menu-container');
        if (toggle && menu) {
            toggle.onclick = (e) => {
                e.stopPropagation();
                menu.classList.toggle('closed');
            };
        }

        const logout = document.getElementById('logout-button');
        if (logout) {
            logout.onclick = async () => {
                await window.supabase.auth.signOut();
                window.location.href = '/authentication.html';
            };
        }

        document.onclick = () => { if (menu) menu.classList.add('closed'); };
    };

    const run = async () => {
        const supabase = window.supabase;
        if (!supabase) { setTimeout(run, 100); return; }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            const uid = currentUser.id;
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
            const { data: roles } = await supabase.from('roles').select('role').eq('user_id', uid);
            
            currentUserData = profile;
            currentIsPrivileged = roles?.some(r => r.role === 'full_admin' || r.role === 'sub_admin') || profile?.is_admin || currentUser.email === PRIVILEGED_EMAIL;
        }
        renderNavbar();
    };

    run();
}
