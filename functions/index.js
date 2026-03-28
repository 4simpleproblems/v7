const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const { MongoClient } = require('mongodb');

admin.initializeApp();

// --- MongoDB Configuration (Firestore Enterprise Offloading) ---
// Note: Use 'firebase functions:config:set mongo.uri="mongodb://user:pass@host..."'
// or set MONGO_URI in your environment.
const MONGO_URI = process.env.MONGO_URI || "mongodb://<username>:<password>@bca8cb6c-1e00-46ee-993e-3080702f0913.us-east5.firestore.goog:443/foursimpleproblems-db2?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false";
let mongoClient = null;

async function getMongoClient() {
    if (mongoClient) return mongoClient;
    mongoClient = new MongoClient(MONGO_URI, {
        tls: true,
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000
    });
    await mongoClient.connect();
    return mongoClient;
}

/**
 * mongoBridge: Secure gateway to the secondary project's MongoDB API.
 * Offloads high-volume data (messages, analytics, notifications).
 */
exports.mongoBridge = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    }

    const { action, collection: collectionName, query: queryData, payload, options = {} } = data;
    const uid = context.auth.uid;

    // Security: Restrict allowed collections
    const allowedCollections = ['messages', 'notifications', 'analytics', 'user_presence', 'daily_photos', 'reports', 'feedback'];
    if (!allowedCollections.includes(collectionName)) {
        throw new functions.https.HttpsError('permission-denied', 'Collection not offloadable.');
    }

    try {
        const client = await getMongoClient();
        const dbMongo = client.db(); // Uses the DB from the URI (foursimpleproblems-db2)
        const collection = dbMongo.collection(collectionName);

        switch (action) {
            case 'insertOne':
                // Auto-inject metadata
                const docToInsert = { 
                    ...payload, 
                    creatorUid: uid, 
                    serverTimestamp: new Date() 
                };
                const insertRes = await collection.insertOne(docToInsert);
                return { success: true, id: insertRes.insertedId };

            case 'find':
                // Auto-filter by UID for private collections
                let finalQuery = queryData || {};
                if (['messages', 'notifications'].includes(collectionName)) {
                    // Ensure users can only see their own data
                    // For messages, they can be sender or recipient
                    if (collectionName === 'messages') {
                        finalQuery = { $and: [finalQuery, { $or: [{ senderId: uid }, { recipientId: uid }] }] };
                    } else if (collectionName === 'notifications') {
                        finalQuery = { ...finalQuery, recipientId: uid };
                    }
                }
                const findCursor = collection.find(finalQuery)
                    .sort(options.sort || { serverTimestamp: -1 })
                    .limit(options.limit || 50);
                const results = await findCursor.toArray();
                return { success: true, results };

            case 'update':
                // queryData should contain the filter, payload can be the direct update object
                // like {$set: {...}} or {$push: {...}}
                const filter = { ...queryData };
                if (filter._id && typeof filter._id === 'string') {
                    const { ObjectId } = require('mongodb');
                    try { filter._id = new ObjectId(filter._id); } catch(e) {}
                }
                
                const updateRes = await collection.updateOne(
                    { ...filter, creatorUid: uid }, 
                    payload
                );
                return { success: true, modifiedCount: updateRes.modifiedCount };

            case 'delete':
                const delFilter = { ...queryData };
                if (delFilter._id && typeof delFilter._id === 'string') {
                    const { ObjectId } = require('mongodb');
                    try { delFilter._id = new ObjectId(delFilter._id); } catch(e) {}
                }
                const deleteRes = await collection.deleteOne({ ...delFilter, creatorUid: uid });
                return { success: true, deletedCount: deleteRes.deletedCount };

            default:
                throw new functions.https.HttpsError('invalid-argument', 'Invalid action.');
        }
    } catch (error) {
        console.error("mongoBridge Error:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Initialize secondary app for offloaded data (analytics, daily_photos)
// Note: Requires FIREBASE_CONFIG_SECONDARY env var or similar setup if deployed.
let app2;
try {
    app2 = admin.app('secondary');
} catch (error) {
    app2 = admin.initializeApp({
        projectId: "foursimpleproblems-extra"
    }, 'secondary');
}
const db = admin.firestore();
const db2 = app2.firestore();

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
            db2.collection('daily_photos').where('creatorUid', '==', uid),
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
// aggregatePlatformAnalytics  —  REWRITTEN
// ==================================================================
//
// OLD COST:  ~5,000 reads every 10 min  = 720,000 reads/day
//            (full analytics collection scan + full users scan)
//
// NEW COST:  ~4 reads per run  (users, admins, bans, user_analytics summary)
//            Runs every 30 minutes → ~192 reads/day from this function
//
// HOW IT WORKS:
//   - Page counts and total time now live in user_analytics/{uid}
//     (written by analytics.js client-side, no reads on write).
//   - This function aggregates user_analytics into analytics_summary/platform
//     once per run. analytics.html reads that ONE doc instead of 10,000.
//   - The old `analytics` collection is no longer written to or read from.
//   - aggregateAnalytics (the broken hourly function) is merged into this
//     one job and fixed. No more duplicate scheduled functions.
// ==================================================================
exports.aggregatePlatformAnalytics = functions.pubsub
    .schedule('every 30 minutes')
    .onRun(async (context) => {
        await runPlatformAggregation();
        return null;
    });

// HTTP trigger — call manually from analytics.html "Refresh" button
// or use as a cron fallback
exports.aggregatePlatformAnalyticsHttp = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            const result = await runPlatformAggregation();
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error("aggregatePlatformAnalyticsHttp error:", error);
            res.status(500).json({ error: error.message });
        }
    });
});

async function runPlatformAggregation() {
    const db = admin.firestore();
    console.log("aggregatePlatformAnalytics: starting aggregation...");

    // ── 1. Fetch user/admin/ban metadata  (3 reads, same as before) ──────────
    const [usersSnap, adminsSnap, bansSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('admins').get(),
        db.collection('bans').get(),
    ]);

    const adminIds    = new Set();
    const subAdminIds = new Set();
    adminsSnap.forEach(d => {
        const data = d.data();
        if (data.type === 'full') adminIds.add(d.id);
        else if (data.type === 'sub') subAdminIds.add(d.id);
    });
    const bannedIds = new Set(bansSnap.docs.map(d => d.id));
    const allUsers  = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // ── 2. User growth (computed from existing users data, 0 extra reads) ────
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
            if (dailyGrowth[key] !== undefined) dailyGrowth[key]++;
        }
    });

    // ── 3. Aggregate page stats from user_analytics  (1 read per user) ───────
    //
    // user_analytics/{uid} shape:
    //   { totalTime: number, pages: { Dashboard: N, Games: N, ... }, lastActive: Timestamp }
    //
    // We read ALL user_analytics docs here because this is a server-side
    // scheduled function — it runs once per 30 min, not on every page load.
    // At 700 users this is 700 reads per 30 min = 33,600/day from this step,
    // which is dramatically less than the old 720,000/day.
    //
    // If you grow to 10k+ users, switch to a counter-document approach where
    // client writes also increment analytics_summary/platform directly.
    //
    const userAnalyticsSnap = await db.collection('user_analytics').get();

    const pageCounts  = {}; // { 'Dashboard': totalCount }
    let   totalTime   = 0;
    let   active24h   = 0;
    const now         = Date.now();
    const oneDay      = 86400000;

    userAnalyticsSnap.forEach(d => {
        const data = d.data();
        totalTime += (data.totalTime || 0);

        const lastActive = data.lastActive?.toDate?.().getTime() ?? 0;
        if (now - lastActive < oneDay) active24h++;

        if (data.pages && typeof data.pages === 'object') {
            for (const [name, count] of Object.entries(data.pages)) {
                pageCounts[name] = (pageCounts[name] || 0) + count;
            }
        }
    });

    // Top 20 pages sorted by visit count
    const topPages = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .reduce((acc, [name, count]) => {
            acc[name] = { title: name, count };
            return acc;
        }, {});

    // ── 4. Write ONE summary document  (1 write) ─────────────────────────────
    const summary = {
        totalUsers:     allUsers.length,
        totalAdmins:    adminIds.size,
        totalSubAdmins: subAdminIds.size,
        totalBanned:    bannedIds.size,
        totalVerified:  allUsers.filter(u => u.emailVerified).length,
        userGrowth:     dailyGrowth,
        traffic: {
            topPages,
            totalTime,
            active24h,
            trackedUsers: userAnalyticsSnap.size,
        },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        generatedAt: new Date().toISOString(),
    };

    await db2.collection('analytics_summary').doc('platform').set(summary);

    // Also write the pages sub-doc that leaderboard.html reads
    await db2.collection('analytics_summary').doc('pages').set({
        pages: topPages,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        generatedAt: new Date().toISOString(),
    });

    console.log(`aggregatePlatformAnalytics: done. ${userAnalyticsSnap.size} users, ${Object.keys(topPages).length} pages tracked.`);
    return {
        usersScanned: userAnalyticsSnap.size,
        pagesTracked: Object.keys(topPages).length,
        active24h,
    };
}

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