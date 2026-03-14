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
    await validateAdmin(context);
    const { uid } = data;
    try {
        try { await admin.auth().deleteUser(uid); } catch (e) {}
        const collections = ['users', 'admins', 'bans'];
        await Promise.all(collections.map(col => admin.firestore().collection(col).doc(uid).delete()));
        return { success: true };
    } catch (error) {
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
    const { uid, reason, durationDays } = data;
    try {
        const bannedUntil = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null;
        await admin.firestore().collection('bans').doc(uid).set({
            reason, bannedUntil, bannedAt: admin.firestore.FieldValue.serverTimestamp(), bannedBy: context.auth.uid
        });
        await admin.firestore().collection('users').doc(uid).update({ isBanned: true });
        return { success: true };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
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

// --- Stripe ---
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
