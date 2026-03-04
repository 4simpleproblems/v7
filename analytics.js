/**
 * analytics.js
 * Tracks user sessions, page views, and duration.
 * Saves data to Firestore collection "analytics".
 */
(function() {
    console.log("Analytics: Initializing...");

    // Helper to get/create Session ID
    function getSessionId() {
        let sid = sessionStorage.getItem('analytics_session_id');
        if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            sessionStorage.setItem('analytics_session_id', sid);
        }
        return sid;
    }

    const sessionId = getSessionId();
    let db = null;
    let auth = null;
    let currentUser = 'anonymous';
    // Always track all users including admins
    let isExcluded = false;
    let isTracking = false;

    // Wait for Firebase to be available
    function waitForFirebase() {
        if (window.firebase && window.firebase.apps.length > 0) {
            initAnalytics();
        } else {
            setTimeout(waitForFirebase, 500);
        }
    }

    function initAnalytics() {
        if (isTracking) return;
        isTracking = true;
        console.log("Analytics: Firebase found. Starting tracking.");
        
        const app = window.firebase.app(); 
        db = app.firestore();
        auth = app.auth();

        // Track user
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user.uid;
                try {
                    // Check if Superadmin or Admin to tag them in session
                    const isSuperAdmin = user.email === '4simpleproblems@gmail.com';
                    let isAdmin = false;
                    
                    if (!isSuperAdmin) {
                        const adminDoc = await db.collection('admins').doc(user.uid).get();
                        isAdmin = adminDoc.exists;
                    }

                    if (isSuperAdmin || isAdmin) {
                        console.log("Analytics: Admin detected. Tracking as admin.");
                        sessionStorage.setItem('analytics_is_admin', 'true');
                    } else {
                        sessionStorage.removeItem('analytics_is_admin');
                    }

                    // Ensure totalV6Time exists
                    const userRef = db.collection('users').doc(user.uid);
                    const userDoc = await userRef.get();
                    if (userDoc.exists && userDoc.data().totalV6Time === undefined) {
                        await userRef.update({ totalV6Time: 0 });
                    }
                } catch (e) {
                    console.error("Analytics: Error checking admin status", e);
                }
            } else {
                // Logged out
                currentUser = 'anonymous';
                sessionStorage.removeItem('analytics_is_admin');
            }
            updateSession();
        });

        // Initialize Start Time and Active Duration
        if (!sessionStorage.getItem('analytics_start_time')) {
            sessionStorage.setItem('analytics_start_time', Date.now());
        }
        if (!sessionStorage.getItem('analytics_active_duration')) {
            sessionStorage.setItem('analytics_active_duration', '0');
        }

        // Track Page View
        trackPageView();
        trackActivity();

        // Heartbeat to update duration
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                let activeSecs = parseInt(sessionStorage.getItem('analytics_active_duration') || '0');
                activeSecs += 10;
                sessionStorage.setItem('analytics_active_duration', activeSecs.toString());

                if (currentUser !== 'anonymous') {
                    db.collection('users').doc(currentUser).update({
                        totalV6Time: window.firebase.firestore.FieldValue.increment(10)
                    }).catch(() => {});
                }
            }
            updateSession();
            trackActivity();
        }, 10000); 

        // Visibility / Unload listeners
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                updateSession();
                clearActivity();
            } else {
                trackActivity();
            }
        });
        
        window.addEventListener('beforeunload', () => {
             updateSession();
             clearActivity();
        });
    }

    async function trackActivity() {
        if (!auth || !auth.currentUser || !db) return;
        const user = auth.currentUser;
        
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            
            if (userData.showOffline) {
                await db.collection('users').doc(user.uid).update({
                    isOnline: false,
                    currentActivity: null
                });
                return;
            }

            let activity = getCleanTitle(window.location.pathname, document.title);
            
            // Special Game Tracking
            const isGamesPage = window.location.pathname.includes('games.html');
            if (isGamesPage || window.location.pathname.includes('/GAMES/')) {
                if (userData.disableActivityTracking) {
                    activity = "Games";
                } else {
                    let gameName = "";
                    if (isGamesPage && window.location.hash) {
                        // Extract from hash: #Category?id=GameName
                        const hash = window.location.hash.substring(1);
                        if (hash.includes('id=')) {
                            gameName = hash.split('id=')[1].split('&')[0];
                        } else {
                            gameName = hash.split('?')[0];
                        }
                    } else {
                        gameName = window.location.pathname.split('/').filter(p => p).pop().replace('.html', '');
                    }
                    
                    if (gameName) {
                        activity = `Playing ${decodeURIComponent(gameName).replace(/-/g, ' ').charAt(0).toUpperCase() + decodeURIComponent(gameName).replace(/-/g, ' ').slice(1)}`;
                    } else {
                        activity = "Games";
                    }
                }
            }

            await db.collection('users').doc(user.uid).update({
                isOnline: true,
                currentActivity: activity,
                lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { console.error("Analytics: Activity track failed", e); }
    }

    function clearActivity() {
        if (!auth || !auth.currentUser || !db) return;
        db.collection('users').doc(auth.currentUser.uid).update({
            isOnline: false,
            currentActivity: null
        }).catch(() => {});
    }

    const PAGE_NAME_LOOKUP = {
        'dashboard.html': 'Dashboard',
        'soundboard.html': 'Soundboard',
        'notes.html': 'Notes',
        'dailyphoto.html': 'Dailyphoto',
        'dictionary.html': 'Dictionary',
        'schedule.html': 'Schedule',
        'messenger-tutorial.html': 'Messenger',
        'games.html': 'Games',
        'vana.html': 'Vana',
        'vora.html': 'Vora',
        'vern.html': 'Vern',
        'velium.html': 'Velium',
        'securly-tester.html': 'Securly Tester',
        'settings.html': 'Settings',
        'index.html': 'Home'
    };

    const getCleanTitle = (path, originalTitle) => {
        // Special case for VELIUM folder
        if (path.includes('/VELIUM/')) return 'Velium';
        if (path.includes('/VORA/')) return 'Vora';
        if (path.includes('/VERN/')) return 'Vern';
        
        const fileName = path.split('/').pop().split('?')[0];
        if (PAGE_NAME_LOOKUP[fileName]) return PAGE_NAME_LOOKUP[fileName];
        if (originalTitle && !originalTitle.includes('VERSION 5 CLIENT')) return originalTitle;
        return fileName.replace('.html', '').charAt(0).toUpperCase() + fileName.replace('.html', '').slice(1);
    };

    function trackPageView() {
        if (isExcluded || !db) return;
        const path = window.location.protocol === 'file:' ? window.location.href : window.location.pathname;
        
        // Filter out invalid/internal paths
        if (path.includes('srcdoc') || path.includes('javascript:')) return;

        const pageName = getCleanTitle(window.location.pathname, document.title);
        
        const docRef = db.collection('analytics').doc(sessionId);
        
        // Atomically add page visit and increment counter
        docRef.set({
            sessionId: sessionId,
            userAgent: navigator.userAgent,
            version: 'project_niobium', // Codename for 4SP V6
            lastActive: window.firebase.firestore.FieldValue.serverTimestamp(),
            visitedPages: window.firebase.firestore.FieldValue.arrayUnion({
                path: path,
                title: pageName,
                timestamp: Date.now()
            }),
            pageCount: window.firebase.firestore.FieldValue.increment(1)
        }, { merge: true }).catch(err => console.error("Analytics Error:", err));
    }

    function updateSession() {
        if (isExcluded || !db) return;
        
        const docRef = db.collection('analytics').doc(sessionId);
        
        let startTime = parseInt(sessionStorage.getItem('analytics_start_time') || Date.now());
        const duration = parseInt(sessionStorage.getItem('analytics_active_duration') || '0');
        const isAdmin = sessionStorage.getItem('analytics_is_admin') === 'true';

        docRef.set({
            userId: currentUser,
            version: 'project_niobium', // Codename for 4SP V6
            lastActive: window.firebase.firestore.FieldValue.serverTimestamp(),
            duration: duration,
            startTime: startTime,
            isAdmin: isAdmin
        }, { merge: true });
    }

    waitForFirebase();

})();
