async function init4SPAnalytics() {
    if (window.__4sp_analytics_v4_loaded) return
    window.__4sp_analytics_v4_loaded = true

    console.log("Analytics: Initializing Supabase V4 Session Summaries")

    let currentUser = 'anonymous'
    let hardwareId = null
    let sessionId = null
    let isTracking = false
    let lastSyncTime = 0
    let isDirty = false

    let pageViews = []
    let sessionDuration = 0
    let unreportedDuration = 0

    const TICK_MS = 5000
    const SYNC_INTERVAL_MS = 30000 // Sync every 30s instead of 60s for better accuracy
    const MIN_SYNC_GAP_MS = 5000
    const INACTIVITY_THRESHOLD_MS = 600000 // 10 minutes - much less strict

    function getSessionId() {
        if (sessionId) return sessionId
        sessionId = sessionStorage.getItem('an_sid')
        if (!sessionId) {
            sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
            sessionStorage.setItem('an_sid', sessionId)
        }
        return sessionId
    }

    function buildHardwareId() {
        if (hardwareId) return hardwareId
        const raw = [
            navigator.userAgent,
            screen.width,
            screen.height,
            navigator.language,
            navigator.hardwareConcurrency || 0,
            new Date().getTimezoneOffset()
        ].join('|')
        
        let h = 0
        let i = 0
        while (i < raw.length) {
            h = Math.imul(31, h) + raw.charCodeAt(i) | 0
            i++
        }
        hardwareId = 'HW-' + Math.abs(h).toString(16).toUpperCase()
        return hardwareId
    }

    function getPageName(path, fallbackTitle) {
        if (path.includes('/VELIUM/')) return 'Velium'
        if (path.includes('/VORA/')) return 'Vora'
        if (path.includes('/VERN/')) return 'Vern'
        
        const file = path.split('/').pop().split('?')[0]
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
        }
        return PAGE_NAME_MAP[file] ?? fallbackTitle ?? 'Unknown'
    }

    async function startTracking() {
        if (isTracking) return
        isTracking = true

        if (window.supabase) {
            const { data: { session } } = await window.supabase.auth.getSession()
            if (session) {
                currentUser = session.user.id
                isDirty = true
            }
            window.supabase.auth.onAuthStateChange((event, session) => {
                if (session) currentUser = session.user.id
            })
        }

        trackPageView()

        let lastActivityTime = Date.now()

        // Throttled activity updater
        function updateUserActivity() {
            const now = Date.now()
            if (now - lastActivityTime > 2000) {
                lastActivityTime = now
                isDirty = true
            }
        }

        // Broaden activity detection
        document.addEventListener('mousedown', updateUserActivity)
        document.addEventListener('keydown', updateUserActivity)
        document.addEventListener('touchstart', updateUserActivity)
        document.addEventListener('mousemove', updateUserActivity)
        document.addEventListener('scroll', updateUserActivity)

        setInterval(() => {
            const timeSinceLastActivity = Date.now() - lastActivityTime
            // Track if user was active recently, even if tab is hidden (background usage)
            // But only track half-time if hidden to be fair to server resources
            if (timeSinceLastActivity < INACTIVITY_THRESHOLD_MS) {
                const increment = document.visibilityState === 'visible' ? 5 : 2
                sessionDuration += increment
                unreportedDuration += increment
                isDirty = true
            }
        }, TICK_MS)

        setInterval(() => {
            if (isDirty) syncToSupabase()
        }, SYNC_INTERVAL_MS)

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && isDirty) syncToSupabase()
        })

        window.addEventListener('pagehide', () => {
            if (isDirty) syncToSupabase()
        })
    }

    function trackPageView() {
        const path = window.location.pathname
        if (path.includes('srcdoc') || path.startsWith('javascript:')) return

        const name = getPageName(path, document.title)
        pageViews.push({ path, title: name, ts: Date.now() })
        isDirty = true
    }

    async function syncToSupabase() {
        if (!window.supabase) return
        if (!buildHardwareId() || !getSessionId()) return

        const now = Date.now()
        if (now - lastSyncTime < MIN_SYNC_GAP_MS) return
        
        lastSyncTime = now
        isDirty = false

        const timeToReport = unreportedDuration
        unreportedDuration = 0

        const sessionPayload = {
            session_id: getSessionId(),
            user_id: currentUser === 'anonymous' ? null : currentUser,
            hardware_id: buildHardwareId(),
            user_agent: navigator.userAgent,
            duration: sessionDuration,
            page_views: pageViews
        }

        try {
            await window.supabase
                .from('traffic_logs')
                .upsert(sessionPayload)

            if (currentUser !== 'anonymous' && timeToReport > 0) {
                await window.supabase.rpc('increment_v7_time', {
                    uid: currentUser,
                    added_time: timeToReport
                })
            }
            
        } catch (err) {
            console.error("Analytics: Sync failed", err)
            unreportedDuration += timeToReport 
            isDirty = true
        }
    }

    function waitForSupabase() {
        if (window.supabase) {
            startTracking()
        } else {
            setTimeout(waitForSupabase, 500)
        }
    }

    waitForSupabase()
}

init4SPAnalytics()
