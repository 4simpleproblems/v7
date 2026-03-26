const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// ==================================================================
// CONFIGURATION: API KEYS
// ==================================================================
const MW_DICT_KEY = process.env.MW_DICT_KEY || "YOUR_MERRIAM_WEBSTER_DICTIONARY_KEY"; 
const MW_THES_KEY = process.env.MW_THES_KEY || "YOUR_MERRIAM_WEBSTER_THESAURUS_KEY";
const GROQ_API_KEYS = [process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2].filter(Boolean);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
// ==================================================================

/**
 * Common Authorization Helper for onCall
 */
async function validateAdmin(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const adminUid = context.auth.uid;
    const isOwner = adminUid === 'TscUv6Y3hWNAw87Y2X694z0k1I3';
    if (isOwner) return true;
    const adminDoc = await admin.firestore().collection('admins').doc(adminUid).get();
    if (!adminDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'The function must be called by an admin.');
    }
    return true;
}

// --- Word Data (Gen 1 onRequest) ---
exports.getWordData = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            const word = req.query.word;
            if (!word) return res.status(400).json({ error: "Missing word" });
            const [dictResponse, thesResponse] = await Promise.all([
                axios.get(`https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${MW_DICT_KEY}`),
                axios.get(`https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(word)}?key=${MW_THES_KEY}`)
            ]);
            res.status(200).json({ dictionary: dictResponse.data, thesaurus: thesResponse.data });
        } catch (error) {
            console.error("getWordData Error", error);
            res.status(500).json({ error: error.message });
        }
    });
});

// --- Proxy for external service ---
exports.leviumProxy = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        const TARGET_ORIGIN = "https://levium-student-management.global.ssl.fastly.net";
        const PROXY_BASE_PATH = "/leviumProxy/";
        let path = req.path || "/levium.html";
        const url = TARGET_ORIGIN + (path === "/" ? "/levium.html" : path);
        try {
            const response = await axios({
                method: req.method, url, params: req.query, responseType: 'arraybuffer',
                validateStatus: () => true,
                headers: { ...req.headers, host: new URL(TARGET_ORIGIN).host, origin: TARGET_ORIGIN, referer: TARGET_ORIGIN + '/' }
            });
            for (const [key, value] of Object.entries(response.headers)) {
                if (!['host', 'content-length', 'content-encoding'].includes(key.toLowerCase())) res.setHeader(key, value);
            }
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('text/html')) {
                let html = response.data.toString('utf8');
                html = html.replace(/(src|href|action|data-url)=["']\/(?!\/)(.*?)["']/g, `$1="${PROXY_BASE_PATH}$2"`);
                res.status(response.status).send(html);
            } else res.status(response.status).send(response.data);
        } catch (error) { res.status(500).send("Proxy Error: " + error.message); }
    });
});

// --- Content Reporting (Gen 1 onCall) ---
exports.reportContent = functions.https.onCall(async (data, context) => {
    const { collectionName, docId, reason, reportedBy } = data;
    if (!collectionName || !docId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters.');
    }
    try {
        await admin.firestore().collection('reports').add({
            targetCollection: collectionName, targetDocId: docId,
            reason: reason || 'User Report', reportedBy: reportedBy || 'Anonymous',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        await admin.firestore().collection(collectionName).doc(docId).update({
             reported: true, reportedBy: admin.firestore.FieldValue.arrayUnion(reportedBy)
        });
        return { success: true };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// --- AI Chat (Gen 1 onCall) ---
exports.chatWithGroq = functions.https.onCall(async (data, context) => {
    const { messages, model = "llama3-8b-8192" } = data;
    if (GROQ_API_KEYS.length === 0) {
        return { choices: [{ message: { content: "AI system is in maintenance mode. (No keys configured)" } }] };
    }
    const apiKey = GROQ_API_KEYS[Math.floor(Math.random() * GROQ_API_KEYS.length)];
    try {
        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", 
            { messages, model },
            { headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" } }
        );
        return response.data;
    } catch (error) {
        console.error("chatWithGroq Error", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// --- User Management ---
exports.deleteUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { uid } = data;
    const callerUid = context.auth.uid;

    if (callerUid !== uid) {
        await validateAdmin(context);
    }

    try {
        try { await admin.auth().deleteUser(uid); } catch (e) {
            console.error("Auth deletion error (might already be deleted):", e);
        }

        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        const username = userDoc.exists ? userDoc.data().username : null;

        const batch = admin.firestore().batch();
        
        const collections = ['users', 'admins', 'bans', 'messenger_profiles'];
        collections.forEach(col => batch.delete(admin.firestore().collection(col).doc(uid)));

        if (username) {
            batch.delete(admin.firestore().collection('usernames').doc(username.toLowerCase()));
        }
        
        const relatedQueries = [
            admin.firestore().collection('daily_photos').where('creatorUid', '==', uid),
            admin.firestore().collection('messages').where('senderId', '==', uid),
            admin.firestore().collection('messages').where('recipientId', '==', uid),
            admin.firestore().collection('notifications').where('recipientId', '==', uid),
            admin.firestore().collection('friendRequests').where('senderId', '==', uid),
            admin.firestore().collection('friendRequests').where('recipientId', '==', uid),
            admin.firestore().collection('posts').where('authorId', '==', uid),
            admin.firestore().collection('comments').where('authorId', '==', uid)
        ];

        for (const q of relatedQueries) {
            const snap = await q.limit(50).get();
            snap.forEach(doc => batch.delete(doc.ref));
        }

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("DeleteUser Error:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

exports.getAuthUsers = functions.https.onCall(async (data, context) => {
    await validateAdmin(context);
    const users = [];
    let nextPageToken;
    try {
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            listUsersResult.users.forEach(u => users.push({
                uid: u.uid, email: u.email, displayName: u.displayName,
                providerData: u.providerData.map(p => ({ providerId: p.providerId })),
                createdAt: u.metadata.creationTime,
                lastSignInTime: u.metadata.lastSignInTime
            }));
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
        return users;
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// --- Admin Controls ---
exports.addAdmin = functions.https.onCall(async (data, context) => {
    await validateAdmin(context);
    const { targetUid, role = 'admin' } = data;
    try {
        await admin.firestore().collection('admins').doc(targetUid).set({ role, assignedAt: admin.firestore.FieldValue.serverTimestamp() });
        return { success: true };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

exports.banUser = functions.https.onCall(async (data, context) => {
    await validateAdmin(context);
    const { uid, reason, durationDays, expiresAt, severity, scope, pages } = data;
    try {
        let bannedUntil = null;
        if (expiresAt) {
            bannedUntil = new Date(expiresAt);
        } else if (durationDays) {
            bannedUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
        }

        const banData = {
            reason,
            bannedUntil,
            bannedAt: admin.firestore.FieldValue.serverTimestamp(),
            bannedBy: context.auth.uid,
            severity: severity || 'account',
            scope: scope || 'global',
            pages: pages || []
        };

        await admin.firestore().collection('bans').doc(uid).set(banData);
        await admin.firestore().collection('users').doc(uid).update({ isBanned: true });
        
        // Handle Email Ban if severity is 'email'
        if (severity === 'email') {
            const userDoc = await admin.firestore().collection('users').doc(uid).get();
            if (userDoc.exists && userDoc.data().email) {
                await admin.firestore().collection('email_bans').doc(userDoc.data().email.toLowerCase()).set({
                    bannedAt: admin.firestore.FieldValue.serverTimestamp(),
                    bannedBy: context.auth.uid,
                    originalUid: uid,
                    bannedUntil: bannedUntil
                });
            }
        }

        return { success: true };
    } catch (error) {
        console.error("banUser Error:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Scheduled function to automatically lift expired bans.
 * Runs every 30 minutes.
 */
exports.checkExpiredBans = functions.pubsub
    .schedule('every 30 minutes')
    .onRun(async (context) => {
        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();
        
        try {
            const expiredBansSnap = await db.collection('bans')
                .where('bannedUntil', '<=', now)
                .get();
                
            if (expiredBansSnap.empty) {
                console.log("No expired bans to lift.");
                return null;
            }
            
            const batch = db.batch();
            
            for (const doc of expiredBansSnap.docs) {
                const uid = doc.id;
                batch.delete(doc.ref);
                batch.update(db.collection('users').doc(uid), { isBanned: false });
                
                // Also lift associated email bans if they exist
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists && userDoc.data().email) {
                    batch.delete(db.collection('email_bans').doc(userDoc.data().email.toLowerCase()));
                }
                
                // Hardware bans are usually permanent or handled differently, 
                // but if they are linked to the ban doc, we could handle them here.
            }
            
            await batch.commit();
            console.log(`Successfully lifted ${expiredBansSnap.size} expired bans.`);
            return null;
        } catch (error) {
            console.error("Error in checkExpiredBans:", error);
            return null;
        }
    });

exports.unbanUser = functions.https.onCall(async (data, context) => {
    await validateAdmin(context);
    const { uid } = data;
    try {
        await admin.firestore().collection('bans').doc(uid).delete();
        await admin.firestore().collection('users').doc(uid).update({ isBanned: false });
        return { success: true };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// --- Access Codes ---
exports.generateCode = functions.https.onCall(async (data, context) => {
    await validateAdmin(context);
    const { type = 'download', maxUses = 1 } = data;
    try {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await admin.firestore().collection('access_codes').doc(code).set({
            type, maxUses, uses: 0, createdBy: context.auth.uid, createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, code };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

exports.redeemCode = functions.https.onCall(async (data, context) => {
    const { code, uid } = data;
    try {
        const codeDoc = await admin.firestore().collection('access_codes').doc(code).get();
        if (!codeDoc.exists) throw new functions.https.HttpsError('not-found', 'Invalid code');
        const dataDoc = codeDoc.data();
        if (dataDoc.uses >= dataDoc.maxUses) throw new functions.https.HttpsError('failed-precondition', 'Code expired');
        await admin.firestore().collection('access_codes').doc(code).update({ uses: admin.firestore.FieldValue.increment(1) });
        if (dataDoc.type === 'download') await admin.firestore().collection('users').doc(uid).update({ canDownload: true });
        return { success: true, type: dataDoc.type };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// --- Soundboard ---
exports.soundboardProcessor = functions.https.onCall(async (data, context) => {
    const { youtubeUrl } = data;
    if (!youtubeUrl) throw new functions.https.HttpsError('invalid-argument', 'Missing URL');
    const videoId = youtubeUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1];
    return { success: true, videoId, title: "Processed Audio" };
});

// --- Scheduled Tasks ---
exports.liftExpiredBans = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            const now = new Date();
            const snapshot = await admin.firestore().collection('bans').where('bannedUntil', '<=', now).get();
            const batch = admin.firestore().batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
                batch.update(admin.firestore().collection('users').doc(doc.id), { isBanned: false });
            });
            await batch.commit();
            res.status(200).json({ success: true, liftedCount: snapshot.size });
        } catch (error) { res.status(500).json({ error: error.message }); }
    });
});

// ==================================================================
// NEW: aggregateAnalytics
// ==================================================================
// Runs every hour via Cloud Scheduler. Scans analytics sessions and
// writes a single `analytics_summary/pages` document with aggregated
// page visit counts.
//
// Leaderboard.html now reads ONLY this one document instead of
// scanning every analytics session doc (which could be thousands of
// reads per page load).
//
// HOW TO SCHEDULE: In Firebase console → Functions → Scheduler, or
// deploy with the pubsub trigger below. Either way, point a Cloud
// Scheduler job at the `aggregateAnalyticsHttp` HTTP endpoint as a
// fallback if you're on the Spark plan (Spark doesn't support
// pubsub-triggered scheduled functions).
//
// For Blaze plan (which you need anyway for outbound requests):
//   firebase deploy --only functions:aggregateAnalytics
// The pubsub schedule below will auto-register with Cloud Scheduler.
// ==================================================================
exports.aggregateAnalytics = functions.pubsub
    .schedule('every 60 minutes')
    .onRun(async (context) => {
        await runAnalyticsAggregation();
        return null;
    });

// HTTP fallback — manually trigger or call via cron if on Spark plan
exports.aggregateAnalyticsHttp = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            const result = await runAnalyticsAggregation();
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error("aggregateAnalyticsHttp error:", error);
            res.status(500).json({ error: error.message });
        }
    });
});

async function runAnalyticsAggregation() {
    const db = admin.firestore();
    const pageMap = {};
    let docsScanned = 0;
    let pageToken = null;

    // Paginate through analytics collection in batches of 500
    // to avoid timeout on large datasets
    do {
        let q = db.collection('analytics')
            .where('version', '==', 'project_niobium')
            .limit(500);

        if (pageToken) {
            q = q.startAfter(pageToken);
        }

        const snap = await q.get();
        if (snap.empty) break;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.visitedPages && Array.isArray(data.visitedPages)) {
                data.visitedPages.forEach(p => {
                    const path = p.path || p.url;
                    if (!path || path.includes('srcdoc') || path.includes('blob:')) return;
                    const title = p.title || path;
                    if (!pageMap[path]) {
                        pageMap[path] = { title, count: 0 };
                    }
                    pageMap[path].count++;
                });
            }
            docsScanned++;
        });

        pageToken = snap.docs[snap.docs.length - 1];

        // If batch was smaller than limit, we've reached the end
        if (snap.size < 500) break;

    } while (true);

    // Sort by count descending, keep top 20 pages
    const topPages = Object.entries(pageMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 20)
        .reduce((acc, [path, data]) => {
            acc[path] = data;
            return acc;
        }, {});

    // Write a single summary document — this is the ONLY read leaderboard.html
    // will ever need to do for page stats
    await db.collection('analytics_summary').doc('pages').set({
        pages: topPages,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        docsScanned,
        generatedAt: new Date().toISOString()
    });

    console.log(`Analytics aggregation complete: ${docsScanned} docs scanned, ${Object.keys(topPages).length} pages tracked.`);
    return { docsScanned, pagesTracked: Object.keys(topPages).length };
}

// ==================================================================
// NEW: Analytics Aggregator
// ==================================================================
exports.aggregatePlatformAnalytics = functions.pubsub
    .schedule('every 10 minutes')
    .onRun(async (context) => {
        console.log("Running scheduled analytics aggregation...");
        try {
            const db = admin.firestore();
            const summaryRef = db.collection('analytics_summary').doc('latest');

            // 1. Fetch all raw data in parallel
            const [
                usersSnap,
                adminsSnap,
                bansSnap,
                sessionsSnap
            ] = await Promise.all([
                db.collection('users').get(),
                db.collection('admins').get(),
                db.collection('bans').get(),
                db.collection('analytics').orderBy('lastActive', 'desc').limit(5000).get() // Limit to recent sessions for performance
            ]);

            // 2. Process Admins and Bans
            const adminIds = new Set();
            const subAdminIds = new Set();
            adminsSnap.forEach(doc => {
                const data = doc.data();
                if (data.type === 'full') adminIds.add(doc.id);
                else if (data.type === 'sub') subAdminIds.add(doc.id);
            });
            const bannedIds = new Set(bansSnap.docs.map(d => d.id));

            // 3. Process Users and User Growth
            const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const dailyGrowth = {};
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                dailyGrowth[d.toISOString().split('T')[0]] = 0;
            }

            allUsers.forEach(user => {
                const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : null;
                if (createdAt && createdAt >= thirtyDaysAgo) {
                    const key = createdAt.toISOString().split('T')[0];
                    if (dailyGrowth[key] !== undefined) {
                        dailyGrowth[key]++;
                    }
                }
            });
            
            // 4. Process Sessions for Traffic Analytics
            const pageCounts = {};
            const browsers = {};
            const os = {};
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            let active24h = 0;

            sessionsSnap.forEach(sDoc => {
                const s = sDoc.data();
                if (s.visitedPages && Array.isArray(s.visitedPages)) {
                    s.visitedPages.forEach(p => {
                        const path = p.path || p.url || 'unknown';
                        if (!path.startsWith('/')) return;
                        pageCounts[path] = (pageCounts[path] || 0) + 1;
                    });
                }
                if (s.userAgent) {
                    const ua = parseUserAgent(s.userAgent); // Assumes parseUserAgent is defined below
                    browsers[ua.browser] = (browsers[ua.browser] || 0) + 1;
                    os[ua.os] = (os[ua.os] || 0) + 1;
                }
                const lastActive = s.lastActive?.toDate ? s.lastActive.toDate().getTime() : 0;
                if (now - lastActive < oneDay) active24h++;
            });

            const topPages = Object.entries(pageCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .reduce((acc, [path, count]) => ({ ...acc, [path]: count }), {});

            // 5. Assemble final summary object
            const summary = {
                // Counts
                totalUsers: allUsers.length,
                totalAdmins: adminIds.size,
                totalSubAdmins: subAdminIds.size,
                totalBanned: bannedIds.size,
                totalVerified: allUsers.filter(u => u.emailVerified).length,
                
                // Growth Data
                userGrowth: dailyGrowth,

                // Traffic Data
                traffic: {
                    topPages,
                    browsers,
                    os,
                    active24h,
                    recentSessionsCount: sessionsSnap.size
                },
                
                // Last Updated
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            };
            
            // 6. Write summary to Firestore
            await summaryRef.set(summary);
            console.log("Successfully generated and saved analytics summary.");
            return null;

        } catch (error) {
            console.error("Error aggregating platform analytics:", error);
            return null;
        }
    });

function parseUserAgent(ua) {
    let browser = 'Unknown', os = 'Unknown';
    if (!ua) return { browser, os };
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge'; // Edg for chromium edge
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    return { browser, os };
}

// ==================================================================
// NEW: Leaderboard Aggregator
// ==================================================================
exports.updateLeaderboard = functions.pubsub
    .schedule('every 15 minutes')
    .onRun(async (context) => {
        console.log("Running scheduled leaderboard aggregation...");
        try {
            const db = admin.firestore();
            const usersQuery = db.collection('users')
                .where('leaderboardAccepted', '==', true)
                .where('leaderboardOptOut', '==', false)
                .orderBy('totalV6Time', 'desc')
                .limit(100);

            const usersSnap = await usersQuery.get();
            
            const leaderboardData = usersSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            await db.collection('leaderboard').doc('snapshot').set({
                users: leaderboardData,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Leaderboard updated successfully with ${leaderboardData.length} users.`);
            return null;
        } catch (error) {
            console.error("Error updating leaderboard:", error);
            return null;
        }
    });


// ==================================================================
// Stripe
// ==================================================================
exports.getStripeConfig = functions.https.onCall(async (data, context) => {
    return { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "YOUR_STRIPE_PUBLISHABLE_KEY" };
});

exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    const { priceId, uid } = data;
    if (!STRIPE_SECRET_KEY) throw new functions.https.HttpsError('failed-precondition', 'Stripe not configured.');
    try {
        const stripe = require('stripe')(STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${data.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${data.origin}/canceled`,
            client_reference_id: uid
        });
        return { sessionId: session.id };
    } catch (error) { throw new functions.https.HttpsError('internal', error.message); }
});

exports.createPortalSession = functions.https.onCall(async (data, context) => {
    const { customerId } = data;
    if (!STRIPE_SECRET_KEY) throw new functions.https.HttpsError('failed-precondition', 'Stripe not configured.');
    try {
        const stripe = require('stripe')(STRIPE_SECRET_KEY);
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: data.origin
        });
        return { url: session.url };
    } catch (error) { throw new functions.https.HttpsError('internal', error.message); }
});

// --- Utils ---
exports.downloadEndpoint = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        const { url } = req.query;
        if (!url) return res.status(400).send("Missing URL");
        try {
            const response = await axios({ method: 'GET', url, responseType: 'stream' });
            res.setHeader('Content-Disposition', 'attachment');
            response.data.pipe(res);
        } catch (error) { res.status(500).send(error.message); }
    });
});
// Made with ❤️ from 4SP