(async function() {
    console.log("Analytics: Initializing v2 (Efficient)");

    // --- Configuration ---
    const DEBOUNCE_INTERVAL = 120000; // 2 minutes

    // --- Local State ---
    let db, auth, currentUser = 'anonymous', hardwareId = null, sessionId = null;
    let isTracking = false;
    let lastSync = 0;
    let pageViews = [];
    let activeDuration = 0;
    let activityInterval, syncInterval;

    // --- Core Functions ---
    function getSessionId() {
        if (!sessionId) {
            sessionId = sessionStorage.getItem('analytics_session_id') || 'sess_' + Date.now() + Math.random().toString(36).substring(2, 9);
            sessionStorage.setItem('analytics_session_id', sessionId);
        }
        return sessionId;
    }

    async function getHardwareId() {
        if (hardwareId) return hardwareId;
        const components = [navigator.userAgent, screen.width, screen.height, navigator.language, navigator.hardwareConcurrency, new Date().getTimezoneOffset()];
        const data = components.join('|');
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data.charCodeAt(i);
            hash |= 0;
        }
        hardwareId = 'HW-' + Math.abs(hash).toString(16).toUpperCase();
        return hardwareId;
    }
    
    function waitForFirebase() {
        if (window.firebase?.apps.length > 0) initAnalytics();
        else setTimeout(waitForFirebase, 500);
    }

    function initAnalytics() {
        if (isTracking) return;
        isTracking = true;
        console.log("Analytics: Firebase found. Starting efficient tracking.");
        
        const app = window.firebase.app();
        db = app.firestore();
        auth = app.auth();

        getSessionId();
        getHardwareId();

        auth.onAuthStateChanged(user => {
            currentUser = user ? user.uid : 'anonymous';
            if (user?.email === '4simpleproblems@gmail.com') {
                 sessionStorage.setItem('analytics_is_admin', 'true')
            }
        });

        // Restore state from sessionStorage
        pageViews = JSON.parse(sessionStorage.getItem('analytics_pageviews') || '[]');
        activeDuration = parseInt(sessionStorage.getItem('analytics_active_duration') || '0');

        trackPageView(); 
        
        // Start tracking intervals
        activityInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                activeDuration += 5; // 5 seconds
            }
        }, 5000);

        syncInterval = setInterval(syncDataToFirebase, DEBOUNCE_INTERVAL);

        // Sync when user leaves
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') syncDataToFirebase();
        });
        window.addEventListener('beforeunload', () => {
            clearInterval(activityInterval);
            clearInterval(syncInterval);
            syncDataToFirebase(false); // Perform a synchronous final write if possible
        });
    }

    function trackPageView() {
        const path = window.location.protocol === 'file:' ? window.location.href : window.location.pathname;
        if (path.includes('srcdoc') || path.includes('javascript:')) return;
        
        const pageName = getCleanTitle(window.location.pathname, document.title);
        pageViews.push({ path, title: pageName, timestamp: Date.now() });
        sessionStorage.setItem('analytics_pageviews', JSON.stringify(pageViews));
    }

    function syncDataToFirebase(async = true) {
        if (!db || !hardwareId || !sessionId) return;
        
        const now = Date.now();
        if (!async) { // This is a best-effort for beforeunload
            if (pageViews.length === 0 && activeDuration === parseInt(sessionStorage.getItem('analytics_active_duration') || '0')) return;
        } else {
            if (now - lastSync < DEBOUNCE_INTERVAL / 2) return;
        }
        
        console.log(`Analytics: Syncing data. ${pageViews.length} pageviews. Active for ${activeDuration}s.`);
        lastSync = now;

        const FieldValue = window.firebase.firestore.FieldValue;
        const batch = db.batch();

        // 1. Update analytics session document
        const analyticsRef = db.collection('analytics').doc(sessionId);
        const analyticsData = {
            sessionId: sessionId,
            hardwareId: hardwareId,
            userId: currentUser,
            userAgent: navigator.userAgent,
            version: 'project_niobium_v2',
            lastActive: FieldValue.serverTimestamp(),
            duration: activeDuration,
            isAdmin: sessionStorage.getItem('analytics_is_admin') === 'true'
        };
        if (pageViews.length > 0) {
            analyticsData.visitedPages = FieldValue.arrayUnion(...pageViews);
        }
        batch.set(analyticsRef, analyticsData, { merge: true });

        // 2. Update user presence document (if logged in)
        if (currentUser !== 'anonymous') {
            const presenceRef = db.collection('user_presence').doc(currentUser);
            const activity = getCleanTitle(window.location.pathname, document.title);
            batch.set(presenceRef, {
                isOnline: true,
                currentActivity: activity,
                lastActive: FieldValue.serverTimestamp()
            }, { merge: true });
        }

        // Commit the batch
        batch.commit().then(() => {
            // Clear local cache on successful write
            pageViews = [];
            sessionStorage.setItem('analytics_pageviews', '[]');
            sessionStorage.setItem('analytics_active_duration', activeDuration.toString());
        }).catch(err => {
            console.error("Analytics: Batch sync failed.", err);
        });
    }

    const PAGE_NAME_LOOKUP = {
        'dashboard.html': 'Dashboard', 'soundboard.html': 'Soundboard', 'notes.html': 'Notes',
        'dailyphoto.html': 'Dailyphoto', 'dictionary.html': 'Dictionary', 'schedule.html': 'Schedule',
        'games.html': 'Games', 'settings.html': 'Settings', 'index.html': 'Home'
    };

    const getCleanTitle = (path, originalTitle) => {
        const pathSegments = path.split('/');
        if (path.includes('/VELIUM/')) return 'Velium';
        if (path.includes('/VORA/')) return 'Vora';
        if (path.includes('/VERN/')) return 'Vern';
        const fileName = pathSegments.pop().split('?')[0];
        return PAGE_NAME_LOOKUP[fileName] || originalTitle || 'Unknown Page';
    };

    waitForFirebase();
})();
