(async function () {
    if (window.__4sp_analytics_v3_loaded) return;
    window.__4sp_analytics_v3_loaded = true;

    console.log("Analytics: Initializing v3 (Zero-Read)");

    // ─── Configuration ────────────────────────────────────────────────────────
    const TICK_MS            = 5000;   // 5 second activity tick
    const SYNC_INTERVAL_MS   = 180000; // 3 min periodic sync
    const MIN_SYNC_GAP_MS    = 10000;  // First sync can happen sooner
    const MAX_PAGEVIEWS_STORED = 50;   // cap localStorage growth
    const MAX_LOCAL_HISTORY  = 10;     // for dashboard recently accessed

    // ─── State ────────────────────────────────────────────────────────────────
    let db, db2, auth;
    let currentUser     = 'anonymous';
    let isAdmin         = false;
    let hardwareId      = null;
    let sessionId       = null;
    let isTracking      = false;
    let lastSyncTime    = 0;
    let isDirty         = false;      // true when local state hasn't been written yet

    let pageViews       = [];         // accumulated this session, flushed on sync
    let activeDuration  = 0;          // seconds, accumulated since last sync
    let totalDuration   = 0;          // seconds, lifetime for this session doc

    let activityTimer   = null;
    let syncTimer       = null;

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

    const PAGE_NAME_MAP = {
        'dashboard.html': 'Dashboard',
        'soundboard.html': 'Soundboard',
        'notes.html': 'Notes',
        'dailyphoto.html': 'DailyPhoto',
        'dictionary.html': 'Dictionary',
        'schedule.html': 'Schedule',
        'games.html': 'Games',
        'settings.html': 'Settings',
        'index.html': 'Home',
        '': 'Home'
    };

    function getPageName(path, fallbackTitle) {
        if (path.includes('/VELIUM/')) return 'Velium';
        if (path.includes('/VORA/'))   return 'Vora';
        if (path.includes('/VERN/'))   return 'Vern';
        const file = path.split('/').pop().split('?')[0];
        return PAGE_NAME_MAP[file] ?? fallbackTitle ?? 'Unknown';
    }

    // ─── Firebase init ────────────────────────────────────────────────────────

    function waitForFirebase() {
        if (window.firebase?.apps?.length > 0) {
            initAnalytics();
        } else {
            setTimeout(waitForFirebase, 500);
        }
    }

    function initAnalytics() {
        if (isTracking) return;
        isTracking = true;
        console.log("Analytics: Firebase ready. Starting zero-read tracking.");

        const app = window.firebase.app();
        
        // Secondary App for Analytics Data Offloading
        const firebaseConfig2 = {
            apiKey: "AIzaSyAHrP6BCMxI9I8T2iRwKwRJrcpVvxJr8fY",
            authDomain: "foursimpleproblems-extra.firebaseapp.com",
            projectId: "foursimpleproblems-extra",
            storageBucket: "foursimpleproblems-extra.firebasestorage.app",
            messagingSenderId: "125667300841",
            appId: "1:125667300841:web:31dcf4ed67ddf6f07ee778"
        };
        let app2;
        try {
            app2 = window.firebase.app("secondary");
        } catch (e) {
            app2 = window.firebase.initializeApp(firebaseConfig2, "secondary");
        }

        db   = app.firestore();  // Primary DB
        db2  = app2.firestore(); // Secondary DB for analytics
        auth = app.auth(); // Still use primary auth

        auth.onAuthStateChanged(user => {
            currentUser = user ? user.uid : 'anonymous';
            isAdmin     = user?.email === '4simpleproblems@gmail.com';
            isDirty     = true;
        });

        // Restore accumulated duration from previous pageload in same session
        totalDuration    = parseInt(sessionStorage.getItem('an_total_dur')  || '0');
        activeDuration   = 0; // always start fresh per pageload
        pageViews        = [];

        // Track this page immediately
        trackPageView();

        // Passive activity counter — only increments while tab is visible
        activityTimer = setInterval(() => {
            if (document.visibilityState === 'visible') {
                activeDuration += 5;
                totalDuration  += 5;
                isDirty = true;
            }
        }, TICK_MS);

        // Periodic sync
        syncTimer = setInterval(() => {
            if (isDirty) syncToFirebase();
        }, SYNC_INTERVAL_MS);

        // Sync when tab is hidden (switching apps, locking phone, etc.)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && isDirty) {
                syncToFirebase();
            }
        });

        // Final sync on close — sendBeacon would be ideal but Firestore doesn't
        // support it, so we do a best-effort synchronous call
        window.addEventListener('pagehide', () => {
            clearInterval(activityTimer);
            clearInterval(syncTimer);
            persistDuration(); // save to sessionStorage so next page can restore
            if (isDirty) syncToFirebase();
        });
    }

    // ─── Page tracking ────────────────────────────────────────────────────────

    function trackPageView() {
        const path = window.location.protocol === 'file:'
            ? window.location.href
            : window.location.pathname;

        if (path.includes('srcdoc') || path.startsWith('javascript:')) return;

        const name = getPageName(path, document.title);
        pageViews.push({ path, title: name, ts: Date.now() });
        isDirty = true;

        // Local history for dashboard
        try {
            let localHistory = JSON.parse(localStorage.getItem('v6_recent_pages') || '[]');
            // Remove existing entry for this path if exists
            localHistory = localHistory.filter(p => p.path !== path);
            // Add to front
            localHistory.unshift({ path, title: name, ts: Date.now() });
            // Cap size
            if (localHistory.length > MAX_LOCAL_HISTORY) localHistory.pop();
            localStorage.setItem('v6_recent_pages', JSON.stringify(localHistory));
        } catch (e) { console.warn("Analytics: Local history save failed", e); }
    }

    // ─── Persist duration across SPA navigations / page loads ─────────────────

    function persistDuration() {
        sessionStorage.setItem('an_total_dur', totalDuration.toString());
    }

    // ─── Firebase write — NO reads, NO merge ─────────────────────────────────
    //
    // Fix: We now offload analytics data to the secondary project via mongoBridge
    // to bypass primary project Firestore write limits and leverage MongoDB scalability.
    // Redundancy: Also syncing a session pulse to Supabase.

    async function syncToFirebase() {
        if (!db || !hardwareId || !sessionId) return;

        const now = Date.now();
        if (now - lastSyncTime < MIN_SYNC_GAP_MS) return;
        lastSyncTime = now;
        isDirty      = false;

        const FieldValue = window.firebase.firestore.FieldValue;

        // 1. Offload Analytics Session & Page Views to MongoDB (Secondary Project)
        const mongoPayload = {
            action: 'insertOne',
            collection: 'analytics',
            payload: {
                sessionId,
                hardwareId,
                userAgent: navigator.userAgent,
                totalDuration,
                isAdmin,
                pageViews: pageViews.map(pv => ({ path: pv.path, title: pv.title, ts: pv.ts })),
                syncCount: pageViews.length
            }
        };

        // 2. Increment experience time in the secondary project (using mongoBridge)
        const timePayload = {
            action: 'update',
            collection: 'user_stats',
            query: { uid: currentUser },
            payload: { 
                $inc: { totalV6Time: activeDuration },
                $set: { lastActive: new Date() }
            },
            options: { upsert: true }
        };

        // 3. User presence doc — Keep on primary Firestore for real-time navigation components
        const batchPrimary = db.batch();
        if (currentUser !== 'anonymous') {
            const presenceRef = db.collection('user_presence').doc(currentUser);
            const activity    = getPageName(window.location.pathname, document.title);
            
            batchPrimary.set(presenceRef, {
                isOnline:        true,
                currentActivity: activity,
                lastActive:      FieldValue.serverTimestamp(),
                sessionId
            });
        }

        console.log(
            `Analytics: Syncing — ${pageViews.length} new pageview(s) to MongoDB, ` +
            `${activeDuration}s new active time to Secondary.`
        );

        try {
            const mongoBridge = window.firebase.functions().httpsCallable('mongoBridge');
            const promises = [batchPrimary.commit(), mongoBridge(mongoPayload)];
            if (currentUser !== 'anonymous') promises.push(mongoBridge(timePayload));
            
            // 4. Supabase Redundancy (Optional but requested)
            if (window.supabase) {
                promises.push(window.supabase.from('analytics_pulse').upsert({
                    session_id: sessionId,
                    user_id: currentUser,
                    total_duration: totalDuration,
                    last_active: new Date().toISOString()
                }));
            }

            await Promise.all(promises);
            
            // Reset active duration and clear queue only after successful write
            activeDuration = 0;
            pageViews = [];
            persistDuration();
        } catch (err) {
            console.error("Analytics: Sync failed, will retry.", err);
            isDirty = true;
        }
    }

    // ─── Boot ─────────────────────────────────────────────────────────────────
    waitForFirebase();
})();