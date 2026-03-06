const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// ==================================================================
// CONFIGURATION: API KEYS
// Get these from https://dictionaryapi.com/ (Merriam-Webster)
// ==================================================================
const MW_DICT_KEY = "YOUR_MERRIAM_WEBSTER_DICTIONARY_KEY"; 
const MW_THES_KEY = "YOUR_MERRIAM_WEBSTER_THESAURUS_KEY";
// ==================================================================

// V2 Function with built-in CORS support
exports.getWordData = onRequest({ cors: true }, async (req, res) => {
    try {
        const word = req.query.word;

        if (!word) {
            res.status(400).json({ error: "Missing 'word' query parameter" });
            return;
        }

        const [dictResponse, thesResponse] = await Promise.all([
            axios.get(`https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${MW_DICT_KEY}`),
            axios.get(`https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(word)}?key=${MW_THES_KEY}`)
        ]);

        res.status(200).json({
            dictionary: dictResponse.data,
            thesaurus: thesResponse.data
        });

    } catch (error) {
        logger.error("Error in getWordData:", error);
        const status = error.response ? error.response.status : 500;
        const message = error.message || "Internal Server Error";
        res.status(status).json({ error: message });
    }
});

exports.leviumProxy = onRequest({ cors: true }, async (req, res) => {
    const TARGET_ORIGIN = "https://levium-student-management.global.ssl.fastly.net";
    const PROXY_BASE_PATH = "/leviumProxy/";
    let path = req.path;
    if (!path || path === "/") path = "/levium.html";
    const url = TARGET_ORIGIN + path;

    try {
        const response = await axios({
            method: req.method,
            url: url,
            params: req.query,
            responseType: 'arraybuffer',
            validateStatus: () => true,
            headers: {
                ...req.headers,
                host: new URL(TARGET_ORIGIN).host,
                origin: TARGET_ORIGIN,
                referer: TARGET_ORIGIN + '/'
            }
        });

        for (const [key, value] of Object.entries(response.headers)) {
            const lowerKey = key.toLowerCase();
            if (!['host', 'content-length', 'content-encoding'].includes(lowerKey)) {
                res.setHeader(key, value);
            }
        }

        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
            let html = response.data.toString('utf8');
            html = html.replace(/(src|href|action|data-url)=["']\/(?!\/)(.*?)["']/g, (match, attr, path) => {
                const quote = match.includes("'") ? "'" : '"';
                return `${attr}=${quote}${PROXY_BASE_PATH}${path}${quote}`;
            });
            html = html.replace(/"\/uv\//g, `"${PROXY_BASE_PATH}uv/`);
            html = html.replace(/'\/uv\//g, `'${PROXY_BASE_PATH}uv/`);
            html = html.replace(/"\/bare\//g, `"${PROXY_BASE_PATH}bare/`);
            html = html.replace(/'\/bare\//g, `'${PROXY_BASE_PATH}bare/`);
            html = html.replace(/<base\s+href=["']\/(?!\/)(.*?)["']\s*\/?>/i, `<base href="${PROXY_BASE_PATH}$1">`);
            res.status(response.status).send(html);
        } else {
            res.status(response.status).send(response.data);
        }
    } catch (error) {
        logger.error("Proxy Error", error);
        res.status(500).send("Proxy Error: " + error.message);
    }
});

exports.reportContent = onRequest({ cors: true }, async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { collectionName, docId, reason, reportedBy } = req.body;
        if (!collectionName || !docId) {
            res.status(400).json({ error: "Missing required parameters" });
            return;
        }

        await admin.firestore().collection('reports').add({
            targetCollection: collectionName,
            targetDocId: docId,
            reason: reason || 'User Report',
            reportedBy: reportedBy || 'Anonymous',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        await admin.firestore().collection(collectionName).doc(docId).update({
             reported: true,
             reportedBy: admin.firestore.FieldValue.arrayUnion(reportedBy)
        });

        res.status(200).json({ success: true, message: "Report submitted successfully." });
    } catch (error) {
        logger.error("Report Function Error", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

exports.deleteUser = onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            if (req.method !== 'POST') {
                res.status(405).send('Method Not Allowed');
                return;
            }

            const { uid, adminUid } = req.body;
            if (!uid || !adminUid) {
                res.status(400).json({ error: "Missing required parameters" });
                return;
            }

            const adminDoc = await admin.firestore().collection('admins').doc(adminUid).get();
            const isOwner = adminUid === 'TscUv6Y3hWNAw87Y2X694z0k1I3';
            
            if (!adminDoc.exists && !isOwner) {
                res.status(403).json({ error: "Unauthorized" });
                return;
            }

            try {
                await admin.auth().deleteUser(uid);
            } catch (authError) {
                if (authError.code !== 'auth/user-not-found') throw authError;
            }

            const collections = ['users', 'admins', 'bans'];
            await Promise.all(collections.map(col => 
                admin.firestore().collection(col).doc(uid).delete()
            ));

            res.status(200).json({ success: true, message: `User ${uid} deleted successfully.` });
        } catch (error) {
            logger.error("Delete User Error", error);
            res.status(500).json({ error: error.message });
        }
    });
});

exports.listAuthUsers = onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            if (req.method !== 'POST') {
                res.status(405).send('Method Not Allowed');
                return;
            }

            const { adminUid } = req.body;
            if (!adminUid) {
                res.status(400).json({ error: "Missing adminUid" });
                return;
            }

            const adminDoc = await admin.firestore().collection('admins').doc(adminUid).get();
            const isOwner = adminUid === 'TscUv6Y3hWNAw87Y2X694z0k1I3';

            if (!adminDoc.exists && !isOwner) {
                res.status(403).json({ error: "Unauthorized" });
                return;
            }

            const users = [];
            let nextPageToken;
            do {
                const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
                listUsersResult.users.forEach((u) => {
                    users.push({
                        uid: u.uid,
                        email: u.email,
                        displayName: u.displayName,
                        providerId: u.providerData[0]?.providerId || 'unknown',
                        createdAt: u.metadata.creationTime
                    });
                });
                nextPageToken = listUsersResult.pageToken;
            } while (nextPageToken);

            res.status(200).json({ success: true, users });
        } catch (error) {
            logger.error("List Auth Users Error", error);
            res.status(500).json({ error: error.message });
        }
    });
});
