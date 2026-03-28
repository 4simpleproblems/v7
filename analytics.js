(async function () {
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
    }

    function initAnalytics() {
        if (isTracking) return;
        isTracking = true;

        const app = window.firebase.app();
        db   = app.firestore();
        auth = app.auth();

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
                isDirty = true;
            }
        }, TICK_MS);

        // Periodic sync
        syncTimer = setInterval(() => {
            if (isDirty && currentUid) syncToFirebase();
        }, SYNC_INTERVAL_MS);

        // Sync on hide
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && isDirty && currentUid) {
                syncToFirebase();
            }
        });

        // Final sync on close
        window.addEventListener('pagehide', () => {
            clearInterval(activityTimer);
            clearInterval(syncTimer);
            if (isDirty && currentUid) syncToFirebase();
        });
    }

    // ── Track page visit ─────────────────────────────────────────────────────
    function recordPageView() {
        const path = window.location.protocol === 'file:'
            ? window.location.href
            : window.location.pathname;

        if (path.includes('srcdoc') || path.startsWith('javascript:')) return;

        const name = getPageName(path, document.title);
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

    waitForFirebase();
})();