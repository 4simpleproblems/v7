/**
 * ban-enforcer.js (v6.7 - Supabase Migration)
 * Enforces bans and hardware blacklists in real-time using Supabase.
 */

(async function() {
    console.log("BanEnforcer (v6.7): Script loaded. Monitoring integrity...");

    // Initialize Supabase client if not already available
    if (!window.supabase) {
        console.error("BanEnforcer: Supabase client not found. Ensure injector.js has loaded.");
        return;
    }
    const supabase = window.supabase;

    // --- Global State ---
    let currentBanData = null;
    let isUserAdmin = false;
    let hwId = null;
    let unsubBan = null;
    let unsubHardware = null;

    // --- Configuration ---
    const OWNER_EMAIL = "4simpleproblems@gmail.com";
    const REDIRECT_TARGET = "../index.html";
    
    // Pages that are exempt from redirection even if banned
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

    function isCurrentPageExempt() {
        const path = window.location.pathname;
        return EXEMPT_PAGES.some(p => path === p || path.endsWith(p));
    }

    // --- 1. Hardware Fingerprinting ---
    async function getHardwareId() {
        let persistentId = localStorage.getItem('__4sp_hw_id');
        if (persistentId) return persistentId;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillText("4SP_BAN_ENFORCER_v6", 2, 15);
        const data = [navigator.userAgent, screen.width, screen.height, navigator.language, canvas.toDataURL().length].join('|');
        
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data.charCodeAt(i);
            hash |= 0; 
        }
        const fingerprint = 'HW-' + Math.abs(hash).toString(16).toUpperCase();
        localStorage.setItem('__4sp_hw_id', fingerprint);
        return fingerprint;
    }

    function enforceRedirection() {
        if (!isCurrentPageExempt()) {
            console.warn("BanEnforcer: User is banned. Redirecting to home...");
            window.location.href = REDIRECT_TARGET;
        }
    }

    function lockPage(banData) {
        currentBanData = banData;
        console.warn("BanEnforcer: Enforcement active.", banData.reason);
        enforceRedirection();
        
        // Aggressive guard
        if (!window._banGuard) {
            window._banGuard = setInterval(() => {
                if (currentBanData && !isCurrentPageExempt()) {
                    window.location.href = REDIRECT_TARGET;
                }
            }, 500);
        }
    }

    async function checkHardwareBan() {
        hwId = await getHardwareId();
        const { data, error } = await supabase.from('hardware_bans').select('*').eq('hardware_id', hwId).maybeSingle();
        if (data) {
            lockPage({ severity: 'hardware', ...data });
            return true;
        }
        return false;
    }

    async function setupRealtimeListeners(user) {
        if (unsubBan) unsubBan();
        if (unsubHardware) unsubHardware();

        const uid = user.id;

        // 1. Listen for Account Ban
        unsubBan = supabase.channel(`ban-${uid}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bans', filter: `user_id=eq.${uid}` }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    console.log("BanEnforcer: Account ban lifted.");
                    currentBanData = null;
                    if (window._banGuard) { clearInterval(window._banGuard); window._banGuard = null; }
                } else {
                    lockPage({ severity: 'account', ...payload.new });
                }
            })
            .subscribe();

        // 2. Listen for Hardware Ban
        unsubHardware = supabase.channel(`hw-${hwId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'hardware_bans', filter: `hardware_id=eq.${hwId}` }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    console.log("BanEnforcer: Hardware ban lifted.");
                    currentBanData = null;
                    if (window._banGuard) { clearInterval(window._banGuard); window._banGuard = null; }
                } else {
                    lockPage({ severity: 'hardware', ...payload.new });
                }
            })
            .subscribe();
            
        // Initial Account Check
        const { data: ban } = await supabase.from('bans').select('*').eq('user_id', uid).maybeSingle();
        if (ban && !isUserAdmin) {
            lockPage({ severity: 'account', ...ban });
        }
    }

    async function main() {
        const isHwBanned = await checkHardwareBan();
        
        supabase.auth.onAuthStateChange(async (event, session) => {
            const user = session?.user;
            if (!user) {
                isUserAdmin = false;
                return;
            }

            // Role Check
            const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
            const { data: roles } = await supabase.from('roles').select('role').eq('user_id', user.id);
            
            isUserAdmin = roles?.some(r => r.role === 'full_admin') || profile?.is_admin || user.email === OWNER_EMAIL;
            
            if (isUserAdmin) {
                console.log("BanEnforcer: Admin detected. Bypassing enforcement.");
                currentBanData = null;
                if (window._banGuard) { clearInterval(window._banGuard); window._banGuard = null; }
                return;
            }

            if (!isHwBanned) {
                await setupRealtimeListeners(user);
            }
        });
    }

    main();
})();
