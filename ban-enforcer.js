/**
 * ban-enforcer.js (v7.0 - Remade for v6 Analytics Integration)
 * Remade to fit with the banning system and provide toast notifications on redirect.
 */

(async function() {
    // Prevent multiple loads
    if (window._banEnforcerLoaded) return;
    window._banEnforcerLoaded = true;

    // Wait for Supabase to be available (initialized by injector.js)
    const waitForSupabase = () => {
        return new Promise((resolve) => {
            if (window.supabase) resolve(window.supabase);
            const interval = setInterval(() => {
                if (window.supabase) {
                    clearInterval(interval);
                    resolve(window.supabase);
                }
            }, 50);
        });
    };

    const supabase = await waitForSupabase();
    const OWNER_EMAIL = "4simpleproblems@gmail.com";
    const REDIRECT_TARGET = "/index.html";
    
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

    function getHwId() {
        let id = localStorage.getItem('__4sp_hw_id');
        if (!id) {
            const data = [navigator.userAgent, screen.width, screen.height, navigator.language].join('|');
            let hash = 0;
            for (let i = 0; i < data.length; i++) hash = ((hash << 5) - hash) + data.charCodeAt(i);
            id = 'HW-' + Math.abs(hash).toString(16).toUpperCase();
            localStorage.setItem('__4sp_hw_id', id);
        }
        return id;
    }

    function lockDown(reason) {
        if (isExempt()) return;
        console.warn("Security: Enforcement active. Access restricted.", reason);
        localStorage.setItem('__4sp_ban_reason', reason || "No reason specified.");
        window.location.replace(REDIRECT_TARGET);
    }

    async function checkBans(user) {
        if (!user) return;
        
        // 1. Check Hardcoded Owner
        if (user.email === OWNER_EMAIL) return;

        // 2. Check Admin Roles (Admins are exempt from being banned via the enforcer)
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        const { data: roles } = await supabase.from('roles').select('role').eq('user_id', user.id);
        const isAdmin = profile?.is_admin || roles?.some(r => r.role === 'full_admin');
        if (isAdmin) return;

        // 3. Check Account Ban
        const { data: accountBan } = await supabase.from('bans').select('reason').eq('user_id', user.id).maybeSingle();
        if (accountBan) {
            lockDown(accountBan.reason);
            return;
        }

        // 4. Check Hardware Ban
        const hwId = getHwId();
        const { data: hwBan } = await supabase.from('hardware_bans').select('reason').eq('hardware_id', hwId).maybeSingle();
        if (hwBan) {
            lockDown(hwBan.reason || "Hardware Blacklist");
            return;
        }
    }

    // --- Initial Check ---
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        await checkBans(session.user);
    }

    // --- Real-time Auth Changes ---
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            await checkBans(session.user);
        }
    });

    // --- Real-time Ban Monitoring ---
    if (session?.user) {
        const uid = session.user.id;
        const hwId = getHwId();

        // Listen for new bans on this account
        supabase.channel(`public:bans:user_id=eq.${uid}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bans', filter: `user_id=eq.${uid}` }, (payload) => {
                lockDown(payload.new.reason);
            })
            .subscribe();

        // Listen for hardware bans
        supabase.channel(`public:hardware_bans:hardware_id=eq.${hwId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hardware_bans', filter: `hardware_id=eq.${hwId}` }, (payload) => {
                lockDown(payload.new.reason || "Hardware Blacklist");
            })
            .subscribe();
    }

})();
// Made with ❤️ from 4SP
