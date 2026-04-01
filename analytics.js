(async function () {
    if (window.__4sp_analytics_v3_loaded) return;
    window.__4sp_analytics_v3_loaded = true;

    console.log("Analytics: Initializing v3 (Zero-Read)");

    // ─── State ────────────────────────────────────────────────────────────────
    let db, db2, auth;
    let currentUser     = 'anonymous';
    let isAdmin         = false;
    let hardwareId      = null;
    let sessionId       = null;
    let isTracking      = false;
    let lastSyncTime    = 0;
    let isDirty         = false;

    let pageViews       = [];         
    let activeDuration  = 0;          
    let totalDuration   = 0;          

    // ─── Configuration ────────────────────────────────────────────────────────
    const TICK_MS            = 5000;   // 5 second activity tick
    const SYNC_INTERVAL_MS   = 180000; // 3 min periodic sync
    const MIN_SYNC_GAP_MS    = 10000;  
    const MAX_PAGEVIEWS_STORED = 50;   
    const MAX_LOCAL_HISTORY  = 10;     

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function getSessionId() {
        if (sessionId) return sessionId;
        sessionId = sessionStorage.getItem('an_sid');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
            sessionStorage.setItem('an_sid', sessionId);
        }
        return sessionId;
    }

    function buildHardwareId() {
        if (hardwareId) return hardwareId;
        const raw = [
            navigator.userAgent,
            screen.width,
            screen.height,
            navigator.language,
            navigator.hardwareConcurrency || 0,
            new Date().getTimezoneOffset()
        ].join('|');
        let h = 0;
        for (let i = 0; i < raw.length; i++) {
            h = Math.imul(31, h) + raw.charCodeAt(i) | 0;
        }
        hardwareId = 'HW-' + Math.abs(h).toString(16).toUpperCase();
        return hardwareId;
    }

    function getPageName(path, fallbackTitle) {
        if (path.includes('/VELIUM/')) return 'Velium';
        if (path.includes('/VORA/'))   return 'Vora';
        if (path.includes('/VERN/'))   return 'Vern';
        const file = path.split('/').pop().split('?')[0];
        const PAGE_NAME_MAP = {
            'dashboard.html': 'Dashboard',
            'soundboard.html': 'Soundboard',
            'notes.html': 'Notes',
            'dailyphoto.html': 'Dailyphoto',
            'dictionary.html': 'Dictionary',
            'schedule.html': 'Schedule',
            'games.html': 'Games',
            'settings.html': 'Settings',
            'index.html': 'Home',
            '': 'Home'
        };
        return PAGE_NAME_MAP[file] ?? fallbackTitle ?? 'Unknown';
    }

    function waitForFirebase() {
        if (window.firebase?.apps?.length > 0) {
            initAnalytics();
        } else {
            setTimeout(waitForFirebase, 500);
        }
    }

    async function initAnalytics() {
        if (isTracking) return;
        isTracking = true;
        
        const app = window.firebase.app();
        db   = app.firestore();  
        auth = app.auth(); 

        // Primary Auth Sync
        auth.onAuthStateChanged(user => {
            currentUser = user ? user.uid : 'anonymous';
            isAdmin     = user?.email === '4simpleproblems@gmail.com';
            isDirty     = true;
        });

        // Supabase Auth Sync
        if (window.supabase) {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (session) {
                currentUser = session.user.id;
                isDirty = true;
            }
            window.supabase.auth.onAuthStateChange((event, session) => {
                if (session) currentUser = session.user.id;
            });
        }

        totalDuration    = parseInt(sessionStorage.getItem('an_total_dur')  || '0');
        activeDuration   = 0; 
        pageViews        = [];

        trackPageView();

        // --- Active Duration Tracking (with inactivity) ---
        let lastActivityTime = Date.now();
        const INACTIVITY_THRESHOLD_MS = 60000; // 1 minute

        function updateUserActivity() {
            lastActivityTime = Date.now();
            isDirty = true;
        }

        document.addEventListener('mousemove', updateUserActivity);
        document.addEventListener('mousedown', updateUserActivity);
        document.addEventListener('keydown', updateUserActivity);
        document.addEventListener('touchstart', updateUserActivity);
        document.addEventListener('scroll', updateUserActivity);

        setInterval(() => {
            if (document.visibilityState === 'visible' && (Date.now() - lastActivityTime < INACTIVITY_THRESHOLD_MS)) {
                activeDuration += 5;
                totalDuration  += 5;
                isDirty = true;
            }
        }, TICK_MS);
        // --- End Active Duration Tracking ---

        // Periodic sync for all analytics data
        setInterval(() => {
            if (isDirty) syncToFirebase();
        }, SYNC_INTERVAL_MS);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && isDirty) syncToFirebase();
        });

        window.addEventListener('pagehide', () => {
            persistDuration();
            if (isDirty) syncToFirebase();
        });
    }

    function trackPageView() {
        const path = window.location.pathname;
        if (path.includes('srcdoc') || path.startsWith('javascript:')) return;

        const name = getPageName(path, document.title);
        pageViews.push({ path, title: name, ts: Date.now() });
        isDirty = true;

        try {
            let localHistory = JSON.parse(localStorage.getItem('v6_recent_pages') || '[]');
            localHistory = localHistory.filter(p => p.path !== path);
            localHistory.unshift({ path, title: name, ts: Date.now() });
            if (localHistory.length > MAX_LOCAL_HISTORY) localHistory.pop();
            localStorage.setItem('v6_recent_pages', JSON.stringify(localHistory));
        } catch (e) {}
    }

    function persistDuration() {
        sessionStorage.setItem('an_total_dur', totalDuration.toString());
    }

    async function syncToFirebase() {
        if (!db || !buildHardwareId() || !getSessionId()) return;

        const now = Date.now();
        if (now - lastSyncTime < MIN_SYNC_GAP_MS) return;
        lastSyncTime = now;
        isDirty      = false;

        const mongoPayload = {
            action: 'insertOne',
            collection: 'analytics',
            payload: {
                sessionId: getSessionId(),
                hardwareId: buildHardwareId(),
                userAgent: navigator.userAgent,
                totalDuration,
                isAdmin,
                pageViews: pageViews.map(pv => ({ path: pv.path, title: pv.title, ts: pv.ts })),
                syncCount: pageViews.length
            }
        };

        const timePayload = {
            action: 'update',
            collection: 'user_stats',
            query: { uid: currentUser },
            payload: { 
                $inc: { totalV6Time: activeDuration },
                $set: { lastActive: new Date(), username: localStorage.getItem('v6_username') || 'Anonymous' }
            },
            options: { upsert: true }
        };

        const batchPrimary = db.batch();
        if (currentUser !== 'anonymous') {
            const presenceRef = db.collection('user_presence').doc(currentUser);
            batchPrimary.set(presenceRef, {
                isOnline: true,
                currentActivity: getPageName(window.location.pathname, document.title),
                lastActive: window.firebase.firestore.FieldValue.serverTimestamp(),
                sessionId: getSessionId()
            });
        }

        try {
            const mongoBridge = window.firebase.functions().httpsCallable('mongoBridge');
            const promises = [batchPrimary.commit(), mongoBridge(mongoPayload)];
            if (currentUser !== 'anonymous') promises.push(mongoBridge(timePayload));
            
            if (window.supabase && currentUser !== 'anonymous') {
                promises.push(window.supabase.from('profiles').upsert({
                    id: currentUser,
                    total_v6_time: totalDuration,
                    last_active: new Date().toISOString()
                }));
            }

            await Promise.all(promises);
            activeDuration = 0;
            pageViews = [];
            persistDuration();
        } catch (err) {
            console.error("Analytics: Sync failed", err);
            isDirty = true;
        }
    }

    waitForFirebase();
})();// Made with ❤️ from 4SP
