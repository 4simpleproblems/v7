(async function () {
<<<<<<< HEAD
    // ─────────────────────────────────────────────────────────────────────────
    // 4SP Analytics v4  —  "One Doc Per User"
    //
    // ARCHITECTURE:
    //   Firestore collection: user_analytics/{uid}
    //     totalTime      : number  (seconds, incremented with FieldValue.increment)
    //     pages          : map     { 'Dashboard': N, 'Games': N, ... }
    //     lastActive     : timestamp
    //
    //   Anonymous / pre-auth writes go nowhere — we simply don't track guests
    //   at the document level to avoid creating hundreds of orphaned docs.
    //   Guest activity is still counted locally and written once auth resolves.
    //
    // READS USED PER SESSION: 0  (pure writes, no merge, no arrayUnion)
    // ─────────────────────────────────────────────────────────────────────────

    const SYNC_INTERVAL_MS = 120000; // write every 2 min while active
    const MIN_GAP_MS       = 45000;  // never write more than once per 45s
    const TICK_MS          = 5000;   // activity counter granularity

    // ── State ────────────────────────────────────────────────────────────────
    let db, auth;
    let currentUid   = null;   // null until auth resolves
    let isTracking   = false;
    let isDirty      = false;

    let ticksSinceSync  = 0;   // visible ticks accumulated, flushed on sync
    let lastSyncTime    = 0;
    let activityTimer   = null;
    let syncTimer       = null;

    // Page visits buffered locally: { 'Dashboard': 3, 'Games': 1 }
    // Flushed to Firestore as FieldValue.increment per key on sync.
    let pendingPageCounts = {};

    // ── Page name helpers ────────────────────────────────────────────────────
    const PAGE_MAP = {
        'dashboard.html':  'Dashboard',
        'soundboard.html': 'Soundboard',
        'notes.html':      'Notes',
        'dailyphoto.html': 'DailyPhoto',
        'dictionary.html': 'Dictionary',
        'schedule.html':   'Schedule',
        'games.html':      'Games',
        'settings.html':   'Settings',
        'leaderboard.html':'Leaderboard',
        'index.html':      'Home',
        '':                'Home',
    };

    function getPageName(path, fallback) {
        if (path.includes('/VELIUM/')) return 'Velium';
        if (path.includes('/VORA/'))   return 'Vora';
        if (path.includes('/VERN/'))   return 'Vern';
        const file = path.split('/').pop().split('?')[0];
        return PAGE_MAP[file] ?? fallback ?? 'Unknown';
    }

    // ── Firebase boot ────────────────────────────────────────────────────────
    function waitForFirebase() {
        if (window.firebase?.apps?.length > 0) initAnalytics();
        else setTimeout(waitForFirebase, 500);
=======
    console.log("Analytics: Initializing v3 (Zero-Read)");

    // ─── Configuration ────────────────────────────────────────────────────────
    const SYNC_INTERVAL_MS   = 180000; // 3 min periodic sync
    const MIN_SYNC_GAP_MS    = 60000;  // never sync more than once per minute
    const MAX_PAGEVIEWS_STORED = 50;   // cap localStorage growth

    // ─── State ────────────────────────────────────────────────────────────────
    let db, auth;
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
>>>>>>> 9db44f1c400568505f237e512504c55ceaaa0649
    }

    function initAnalytics() {
        if (isTracking) return;
        isTracking = true;
<<<<<<< HEAD
=======
        console.log("Analytics: Firebase ready. Starting zero-read tracking.");
>>>>>>> 9db44f1c400568505f237e512504c55ceaaa0649

        const app = window.firebase.app();
        db   = app.firestore();
        auth = app.auth();

<<<<<<< HEAD
        auth.onAuthStateChanged(user => {
            currentUid = user ? user.uid : null;
            // If we buffered activity before auth resolved, flush it now
            if (currentUid && isDirty) syncToFirebase();
        });

        // Record this page load
        recordPageView();

        // Activity counter — only ticks while tab is visible
        activityTimer = setInterval(() => {
            if (document.visibilityState === 'visible') {
                ticksSinceSync++;
=======
        getSessionId();
        buildHardwareId();

        // Restore accumulated duration from previous pageload in same session
        totalDuration    = parseInt(sessionStorage.getItem('an_total_dur')  || '0');
        activeDuration   = 0; // always start fresh per pageload
        pageViews        = [];

        auth.onAuthStateChanged(user => {
            currentUser = user ? user.uid : 'anonymous';
            isAdmin     = user?.email === '4simpleproblems@gmail.com';
            isDirty     = true;
        });

        // Track this page immediately
        trackPageView();

        // Passive activity counter — only increments while tab is visible
        activityTimer = setInterval(() => {
            if (document.visibilityState === 'visible') {
                activeDuration += 5;
                totalDuration  += 5;
>>>>>>> 9db44f1c400568505f237e512504c55ceaaa0649
                isDirty = true;
            }
        }, TICK_MS);

        // Periodic sync
        syncTimer = setInterval(() => {
<<<<<<< HEAD
            if (isDirty && currentUid) syncToFirebase();
        }, SYNC_INTERVAL_MS);

        // Sync on hide
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && isDirty && currentUid) {
=======
            if (isDirty) syncToFirebase();
        }, SYNC_INTERVAL_MS);

        // Sync when tab is hidden (switching apps, locking phone, etc.)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && isDirty) {
>>>>>>> 9db44f1c400568505f237e512504c55ceaaa0649
                syncToFirebase();
            }
        });

<<<<<<< HEAD
        // Final sync on close
        window.addEventListener('pagehide', () => {
            clearInterval(activityTimer);
            clearInterval(syncTimer);
            if (isDirty && currentUid) syncToFirebase();
        });
    }

    // ── Track page visit ─────────────────────────────────────────────────────
    function recordPageView() {
=======
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
>>>>>>> 9db44f1c400568505f237e512504c55ceaaa0649
        const path = window.location.protocol === 'file:'
            ? window.location.href
            : window.location.pathname;

        if (path.includes('srcdoc') || path.startsWith('javascript:')) return;

        const name = getPageName(path, document.title);
<<<<<<< HEAD
        pendingPageCounts[name] = (pendingPageCounts[name] || 0) + 1;
        isDirty = true;
    }

    // ── Write to Firestore ───────────────────────────────────────────────────
    // Structure written to user_analytics/{uid}:
    //
    //   totalTime: increment(secondsActive)   ← server-side atomic, no read
    //   pages.Dashboard: increment(N)         ← map field increment, no read
    //   lastActive: serverTimestamp()
    //
    // All three sentinel types (increment, serverTimestamp) work on a plain
    // set() with NO merge:true. We set the whole document each time.
    // On first write, Firestore creates the doc. On subsequent writes it
    // overwrites non-sentinel fields and applies sentinels atomically.
    // Result: ZERO reads, ever.
    //
    function syncToFirebase() {
        if (!db || !currentUid) return;

        const now = Date.now();
        if (now - lastSyncTime < MIN_GAP_MS) return;
        lastSyncTime = now;

        const secondsActive = ticksSinceSync * (TICK_MS / 1000);
        const pagesToFlush  = { ...pendingPageCounts };

        // Nothing to write
        if (secondsActive === 0 && Object.keys(pagesToFlush).length === 0) return;

        // Reset local buffers immediately so concurrent ticks don't double-write
        ticksSinceSync    = 0;
        pendingPageCounts = {};
        isDirty           = false;

        const FieldValue = window.firebase.firestore.FieldValue;

        // Build the update payload using increment sentinels for every field.
        // increment() on a plain set() (no merge) is safe — Firestore applies
        // the delta on top of whatever the current server value is.
        const payload = {
            lastActive: FieldValue.serverTimestamp(),
            uid: currentUid,
        };

        if (secondsActive > 0) {
            payload.totalTime = FieldValue.increment(secondsActive);
        }

        // Write page increments as `pages.PageName` dot-notation keys
        for (const [name, count] of Object.entries(pagesToFlush)) {
            payload[`pages.${name}`] = FieldValue.increment(count);
        }

        const ref = db.collection('user_analytics').doc(currentUid);

        // update() creates the doc if it doesn't exist when combined with
        // set+merge, but we deliberately use update() here because:
        //   - It NEVER reads first (unlike merge:true set)
        //   - It fails silently on a missing doc (first-ever write for this user)
        // So for first-ever write, we fall back to set() with the same payload.
        ref.update(payload).catch(err => {
            if (err.code === 'not-found') {
                // First write for this user — create the document
                ref.set(payload);
            } else {
                // Re-queue on failure so data isn't lost
                ticksSinceSync    += secondsActive / (TICK_MS / 1000);
                pendingPageCounts  = mergePageCounts(pagesToFlush, pendingPageCounts);
                isDirty            = true;
                console.error('Analytics: write failed, re-queued.', err);
            }
        });
    }

    function mergePageCounts(a, b) {
        const out = { ...a };
        for (const [k, v] of Object.entries(b)) {
            out[k] = (out[k] || 0) + v;
        }
        return out;
    }

=======
        pageViews.push({ path, title: name, ts: Date.now() });
        isDirty = true;
    }

    // ─── Persist duration across SPA navigations / page loads ─────────────────

    function persistDuration() {
        sessionStorage.setItem('an_total_dur', totalDuration.toString());
    }

    // ─── Firebase write — NO reads, NO merge ─────────────────────────────────
    //
    // The original code used `batch.set(..., { merge: true })` which forces
    // Firestore to READ every document before writing so it can merge fields.
    // At 700 users with syncs every 2 min + every visibility change, that
    // compounds to millions of reads/day.
    //
    // Fix: we own the full document shape and overwrite it entirely with
    // plain `set()` (no merge). Page views that have already been written
    // are tracked in sessionStorage as a flat counter so we never need to
    // read the existing array back — we just record a running total.

    function syncToFirebase() {
        if (!db || !hardwareId || !sessionId) return;

        const now = Date.now();
        if (now - lastSyncTime < MIN_SYNC_GAP_MS) return;
        lastSyncTime = now;
        isDirty      = false;

        const FieldValue = window.firebase.firestore.FieldValue;

        // ── Session analytics doc (full overwrite — zero reads) ──────────────
        //
        // Instead of arrayUnion (requires merge → requires read), we write
        // page views as a sub-keyed map: { "ts_<timestamp>": {path, title} }
        // Maps can be set with merge:false because each key is unique.
        // Alternatively, we write them as a batch of small sub-collection docs.
        // Chosen approach: sub-collection `pageviews` — one write per view,
        // no reads, naturally append-only, and queryable.

        const batch = db.batch();

        // 1. Session doc — plain set, full overwrite, ZERO reads
        const sessionRef = db.collection('analytics').doc(sessionId);
        batch.set(sessionRef, {
            sessionId,
            hardwareId,
            userId:       currentUser,
            userAgent:    navigator.userAgent,
            version:      'v3_zero_read',
            lastActive:   FieldValue.serverTimestamp(),
            totalDuration,
            isAdmin,
            // Store a running count of page views seen — NOT the array.
            // The actual page view docs live in the sub-collection below.
            pageViewCount: FieldValue.increment(pageViews.length)
        });
        // NOTE: `increment` is a sentinel that works WITHOUT merge:true.
        // It is applied server-side atomically on a plain set() as long as
        // the field already exists. On first write the field will be set to
        // pageViews.length. Subsequent plain set()s with increment() will add
        // to the stored value — no read required.

        // 2. Page view sub-collection — one tiny doc per view, no reads
        for (const pv of pageViews) {
            const pvRef = sessionRef.collection('pageviews').doc(pv.ts.toString());
            batch.set(pvRef, {
                path:  pv.path,
                title: pv.title,
                ts:    pv.ts
            });
            // Plain set with a deterministic doc ID is idempotent and
            // never requires a prior read.
        }

        // 3. User presence doc — only if logged in (full overwrite, no reads)
        if (currentUser !== 'anonymous') {
            const presenceRef = db.collection('user_presence').doc(currentUser);
            const activity    = getPageName(window.location.pathname, document.title);
            batch.set(presenceRef, {
                isOnline:        true,
                currentActivity: activity,
                lastActive:      FieldValue.serverTimestamp(),
                sessionId
            });
            // No merge:true → no read. This fully replaces the presence doc,
            // which is fine — it only holds ephemeral "who is online" state.
        }

        console.log(
            `Analytics: Syncing — ${pageViews.length} new pageview(s), ` +
            `${totalDuration}s total active time.`
        );

        batch.commit()
            .then(() => {
                // Clear the queue only after a confirmed write
                pageViews = [];
                persistDuration();
            })
            .catch(err => {
                // Put views back so they're retried next sync
                console.error("Analytics: Sync failed, will retry.", err);
                isDirty = true;
            });
    }

    // ─── Boot ─────────────────────────────────────────────────────────────────
>>>>>>> 9db44f1c400568505f237e512504c55ceaaa0649
    waitForFirebase();
})();