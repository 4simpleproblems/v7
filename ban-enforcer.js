/**
 * ban-enforcer.js (v6.8 - Supabase High-Performance Enforcement)
 * Optimized for rapid detection and immediate redirection of banned users.
 */

(async function() {
    // Prevent multiple loads
    if (window._banEnforcerLoaded) return;
    window._banEnforcerLoaded = true;

    // Initialize Supabase
    if (!window.supabase) return;
    const supabase = window.supabase;

    // --- Global State ---
    let currentBanData = null;
    let isUserAdmin = false;
    let hwId = null;
    
    const OWNER_EMAIL = "4simpleproblems@gmail.com";
    const REDIRECT_TARGET = "../index.html";
    
    const EXEMPT_PAGES = [
        '/',
        '/index.html',
        '/authentication.html',
        '/verify.html',
        '/404.html',
        '/legal.html',
        '/changelog.html',
        '/documentation.html'
    ];

    function isExempt() {
        const path = window.location.pathname;
        return EXEMPT_PAGES.some(p => path === p || path.endsWith(p));
    }

    // --- 1. Fast Hardware ID ---
    async function getHwId() {
        if (hwId) return hwId;
        let id = localStorage.getItem('__4sp_hw_id');
        if (!id) {
            const canvas = document.createElement('canvas');
            const data = [navigator.userAgent, screen.width, screen.height, navigator.language].join('|');
            let hash = 0;
            for (let i = 0; i < data.length; i++) hash = ((hash << 5) - hash) + data.charCodeAt(i);
            id = 'HW-' + Math.abs(hash).toString(16).toUpperCase();
            localStorage.setItem('__4sp_hw_id', id);
        }
        hwId = id;
        return id;
    }

    // --- 2. Immediate Enforcement ---
    function lockDown(reason) {
        if (isExempt()) return;
        console.warn("Security: Enforcement active. Access restricted.", reason);
        window.location.replace(REDIRECT_TARGET);
    }

    async function checkHwBan() {
        const id = await getHwId();
        const { data } = await supabase.from('hardware_bans').select('*').eq('hardware_id', id).maybeSingle();
        if (data) {
            lockDown("Hardware Blacklist");
            return true;
        }
        return false;
    }

    // --- 3. Real-time Monitoring ---
    async function setupListeners(user) {
        const uid = user.id;
        const id = await getHwId();

        // Account Ban Listener
        supabase.channel(`ban-${uid}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bans', filter: `user_id=eq.${uid}` }, () => lockDown("Account Suspension")).subscribe();

        // Hardware Ban Listener
        supabase.channel(`hw-${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hardware_bans', filter: `hardware_id=eq.${id}` }, () => lockDown("Hardware Blacklist")).subscribe();
            
        // Initial Account Check
        const { data: ban } = await supabase.from('bans').select('*').eq('user_id', uid).maybeSingle();
        if (ban && !isUserAdmin) lockDown(ban.reason);
    }

    async function main() {
        const isHwLocked = await checkHwBan();
        if (isHwLocked) return;

        supabase.auth.onAuthStateChange(async (event, session) => {
            const user = session?.user;
            if (!user) return;

            // Fast Role Check
            const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
            const { data: roles } = await supabase.from('roles').select('role').eq('user_id', user.id);
            
            isUserAdmin = roles?.some(r => r.role === 'full_admin') || profile?.is_admin || user.email === OWNER_EMAIL;
            
            if (!isUserAdmin) await setupListeners(user);
        });
    }

    main();
})();
