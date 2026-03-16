(async function() {
    console.log("Analytics: Initializing...")

    function getSessionId() {
        let sid = sessionStorage.getItem('analytics_session_id')
        if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now()
            sessionStorage.setItem('analytics_session_id', sid)
        }
        return sid
    }

    async function getHardwareId() {
        const components = [
            navigator.userAgent,
            screen.width,
            screen.height,
            navigator.language,
            navigator.hardwareConcurrency || 'unknown',
            navigator.deviceMemory || 'unknown',
            new Date().getTimezoneOffset()
        ]
        const data = components.join('|')
        let hash = 0
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash |= 0
        }
        const fingerprint = 'HW-' + Math.abs(hash).toString(16).toUpperCase()
        const persistentId = localStorage.getItem('__4sp_hw_id') || fingerprint
        if (!localStorage.getItem('__4sp_hw_id')) {
            localStorage.setItem('__4sp_hw_id', fingerprint)
        }
        return persistentId
    }

    const sessionId = getSessionId()
    let hardwareId = null
    getHardwareId().then(id => { hardwareId = id })
    let db = null
    let auth = null
    let currentUser = 'anonymous'
    let isExcluded = false
    let isTracking = false
    let pendingTime = 0

    function waitForFirebase() {
        if (window.firebase && window.firebase.apps.length > 0) {
            initAnalytics()
        } else {
            setTimeout(waitForFirebase, 500)
        }
    }

    function initAnalytics() {
        if (isTracking) return
        isTracking = true
        console.log("Analytics: Firebase found. Starting tracking.")
        
        const app = window.firebase.app()
        db = app.firestore()
        auth = app.auth()

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user.uid
                try {
                    const isSuperAdmin = user.email === '4simpleproblems@gmail.com'
                    let isAdmin = false
                    
                    if (!isSuperAdmin) {
                        const adminDoc = await db.collection('admins').doc(user.uid).get()
                        isAdmin = adminDoc.exists
                    }

                    if (isSuperAdmin || isAdmin) {
                        sessionStorage.setItem('analytics_is_admin', 'true')
                    } else {
                        sessionStorage.removeItem('analytics_is_admin')
                    }

                    const userRef = db.collection('users').doc(user.uid)
                    const userDoc = await userRef.get()
                    if (userDoc.exists && userDoc.data().totalV6Time === undefined) {
                        await userRef.update({ totalV6Time: 0 })
                    }
                } catch (e) {
                    console.error("Analytics: Error checking admin status", e)
                }
            } else {
                currentUser = 'anonymous'
                sessionStorage.removeItem('analytics_is_admin')
            }
            updateSession()
        })

        if (!sessionStorage.getItem('analytics_start_time')) {
            sessionStorage.setItem('analytics_start_time', Date.now())
        }
        if (!sessionStorage.getItem('analytics_active_duration')) {
            sessionStorage.setItem('analytics_active_duration', '0')
        }

        trackPageView()
        trackActivity()

        setInterval(() => {
            if (document.visibilityState === 'visible') {
                let activeSecs = parseInt(sessionStorage.getItem('analytics_active_duration') || '0')
                activeSecs += 10
                sessionStorage.setItem('analytics_active_duration', activeSecs.toString())
                pendingTime += 10
            }
        }, 10000)

        setInterval(() => {
            syncDataToFirebase()
        }, 60000)

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                syncDataToFirebase()
                clearActivity()
            } else {
                trackActivity()
            }
        })
        
        window.addEventListener('beforeunload', () => {
             syncDataToFirebase()
             clearActivity()
        })
    }

    function syncDataToFirebase() {
        if (pendingTime > 0 && currentUser !== 'anonymous') {
            db.collection('users').doc(currentUser).update({
                totalV6Time: window.firebase.firestore.FieldValue.increment(pendingTime)
            }).catch(() => {})
            pendingTime = 0
        }
        updateSession()
        trackActivity()
    }

    async function trackActivity() {
        if (!auth || !auth.currentUser || !db) return
        const user = auth.currentUser
        
        try {
            const userDoc = await db.collection('users').doc(user.uid).get()
            const userData = userDoc.exists ? userDoc.data() : {}
            
            if (userData.showOffline) {
                await db.collection('users').doc(user.uid).update({
                    isOnline: false,
                    currentActivity: null
                })
                return
            }

            let activity = getCleanTitle(window.location.pathname, document.title)
            
            const isGamesPage = window.location.pathname.includes('games.html')
            if (isGamesPage || window.location.pathname.includes('/GAMES/')) {
                if (userData.disableActivityTracking) {
                    activity = "Games"
                } else {
                    let gameName = ""
                    if (isGamesPage && window.location.hash) {
                        const hash = window.location.hash.substring(1)
                        if (hash.includes('id=')) {
                            gameName = hash.split('id=')[1].split('&')[0]
                        } else {
                            gameName = hash.split('?')[0]
                        }
                    } else {
                        gameName = window.location.pathname.split('/').filter(p => p).pop().replace('.html', '')
                    }
                    
                    if (gameName) {
                        activity = `Playing ${decodeURIComponent(gameName).replace(/-/g, ' ').charAt(0).toUpperCase() + decodeURIComponent(gameName).replace(/-/g, ' ').slice(1)}`
                    } else {
                        activity = "Games"
                    }
                }
            }

            await db.collection('users').doc(user.uid).update({
                isOnline: true,
                currentActivity: activity,
                lastActive: window.firebase.firestore.FieldValue.serverTimestamp()
            })
        } catch (e) { console.error("Analytics: Activity track failed", e) }
    }

    function clearActivity() {
        if (!auth || !auth.currentUser || !db) return
        db.collection('users').doc(auth.currentUser.uid).update({
            isOnline: false,
            currentActivity: null
        }).catch(() => {})
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
    }

    const getCleanTitle = (path, originalTitle) => {
        if (path.includes('/VELIUM/')) return 'Velium'
        if (path.includes('/VORA/')) return 'Vora'
        if (path.includes('/VERN/')) return 'Vern'
        
        const fileName = path.split('/').pop().split('?')[0]
        if (PAGE_NAME_LOOKUP[fileName]) return PAGE_NAME_LOOKUP[fileName]
        if (originalTitle && !originalTitle.includes('VERSION 5 CLIENT')) return originalTitle
        return fileName.replace('.html', '').charAt(0).toUpperCase() + fileName.replace('.html', '').slice(1)
    }

    function trackPageView() {
        if (isExcluded || !db) return
        const path = window.location.protocol === 'file:' ? window.location.href : window.location.pathname
        
        if (path.includes('srcdoc') || path.includes('javascript:')) return

        const pageName = getCleanTitle(window.location.pathname, document.title)
        
        const docRef = db.collection('analytics').doc(sessionId)
        
        docRef.set({
            sessionId: sessionId,
            hardwareId: hardwareId,
            userAgent: navigator.userAgent,
            version: 'project_niobium', 
            lastActive: window.firebase.firestore.FieldValue.serverTimestamp(),
            visitedPages: window.firebase.firestore.FieldValue.arrayUnion({
                path: path,
                title: pageName,
                timestamp: Date.now()
            }),
            pageCount: window.firebase.firestore.FieldValue.increment(1)
        }, { merge: true }).catch(err => console.error("Analytics Error:", err))
    }

    function updateSession() {
        if (isExcluded || !db) return
        
        const docRef = db.collection('analytics').doc(sessionId)
        
        let startTime = parseInt(sessionStorage.getItem('analytics_start_time') || Date.now())
        const duration = parseInt(sessionStorage.getItem('analytics_active_duration') || '0')
        const isAdmin = sessionStorage.getItem('analytics_is_admin') === 'true'

        docRef.set({
            userId: currentUser,
            hardwareId: hardwareId,
            version: 'project_niobium', 
            lastActive: window.firebase.firestore.FieldValue.serverTimestamp(),
            duration: duration,
            startTime: startTime,
            isAdmin: isAdmin
        }, { merge: true })
    }

    waitForFirebase()

})()
