/**
 * ban-enforcer.js (v6.6 - Modular Firebase Migration)
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

console.log("BanEnforcer (v6.6): Script loaded. Initializing modular Firebase...");

// Initialize Firebase if not already initialized
if (!getApps().length) initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// --- Global State ---
let unsubHardware = null;
let unsubRole = null;
let unsubBan = null;
let banGuardInterval = null;
let currentBanData = null; 

function cleanupAllListeners() {
    console.log("BanEnforcer: Cleaning up all listeners.");
    if (unsubHardware) { unsubHardware(); unsubHardware = null; }
    if (unsubRole) { unsubRole(); unsubRole = null; }
    if (unsubBan) { unsubBan(); unsubBan = null; }
}

// Ensure listeners are cleaned up when the page is unloaded or hidden
window.addEventListener('pagehide', cleanupAllListeners);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // We can be less aggressive here, but for now, this is safest.
        // cleanupAllListeners(); 
    }
});

// --- 1. Hardware Fingerprinting ---
async function getHardwareId() {
    // Enhanced fingerprinting to reduce collisions
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("4SP_BAN_ENFORCER_v6", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("4SP_BAN_ENFORCER_v6", 4, 17);
    const canvasData = canvas.toDataURL();

    const components = [
        navigator.userAgent,
        screen.width + 'x' + screen.height,
        navigator.language,
        navigator.hardwareConcurrency || 'unknown',
        navigator.deviceMemory || 'unknown',
        new Date().getTimezoneOffset(),
        canvasData.length // Use length as a simple proxy for uniqueness
    ];
    const data = components.join('|');
    
    // MurmurHash3-like simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; 
    }
    const fingerprint = 'HW-' + Math.abs(hash).toString(16).toUpperCase();
    
    // Persistent ID handling
    let persistentId = localStorage.getItem('__4sp_hw_id');
    if (!persistentId) {
        persistentId = fingerprint;
        localStorage.setItem('__4sp_hw_id', fingerprint);
    }
    
    return persistentId;
}

const DEATH_SENTENCE_KEY = '__4sp_death_sentence';

async function checkDeathSentence() {
    const stored = localStorage.getItem(DEATH_SENTENCE_KEY);
    if (stored) {
        const data = JSON.parse(stored);
        const currentHwId = await getHardwareId();
        // Only enforce if the stored HWID matches the current device
        if (data.hwId === currentHwId) {
            console.warn("Hardware Ban: Persistent marker detected for this device.");
            return data;
        } else {
            // If it doesn't match, it might be a remnant from another account/device on a shared machine
            // We'll let the DB check handle it rather than auto-locking.
            return null;
        }
    }
    return null;
}

// --- 2. Font Injection (Geist) & Styling Constraints ---
(function() {
    console.log("BanEnforcer: Injecting fonts and custom styles...");
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Geist"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap';
        document.head.appendChild(link);
    }
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
        document.head.appendChild(link);
    }
    
    const style = document.createElement('style');
    style.innerHTML = `
        #ban-enforcer-message *, #ban-enforcer-home-button, #ban-enforcer-policy-btn {
            font-weight: 400 !important;
        }
    `;
    document.head.appendChild(style);
})();

function unlockPage() {
    // Cannot unlock if it's a hardware ban
    if (currentBanData && currentBanData.severity === 'hardware') {
        console.log("BanEnforcer: Cannot unlock. Severity is Hardware.");
        return;
    }

    console.log("BanEnforcer: Calling unlockPage(). Removing visuals and interval guard.");
    if (banGuardInterval) {
        clearInterval(banGuardInterval);
        banGuardInterval = null;
    }
    currentBanData = null;

    const shield = document.getElementById('ban-enforcer-shield');
    if (shield) shield.remove();
    const msg = document.getElementById('ban-enforcer-message');
    if (msg) msg.remove();
    const btn = document.getElementById('ban-enforcer-home-button');
    if (btn) btn.remove();

    document.documentElement.style.cssText = document.documentElement.style.cssText.replace(/overflow:\s*hidden\s*!important;?/, '');
    document.body.style.cssText = document.body.style.cssText.replace(/overflow:\s*hidden\s*!important;?/, '');
}

function renderBanVisuals(banData) {
    console.log("BanEnforcer: Calling renderBanVisuals(). Severity:", banData.severity);
    
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
    }

    const severity = banData.severity || 'account';
    const reason = banData.reason ? String(banData.reason).replace(/</g, "&lt;") : 'Violation of Terms of Service';
    let banTimestamp = '';
    if (banData.bannedAt && banData.bannedAt.toDate) {
        const date = banData.bannedAt.toDate();
        banTimestamp = `on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    }

    const spacing = '30px'; 
    const homeBtnSize = '60px'; 

    let actionButton = `
        <a id="ban-enforcer-policy-btn" href="../legal.html#terms-of-service" target="_blank" style="
            display: inline-flex !important;
            align-items: center !important;
            gap: 10px !important;
            padding: 12px 24px !important;
            background-color: rgba(239, 68, 68, 0.1) !important;
            border: 1px solid #d1d5db !important; 
            color: #d1d5db !important; 
            text-decoration: none !important;
            border-radius: 1.25rem !important; 
            font-weight: 400 !important; 
            transition: all 0.2s !important;
            margin-right: 10px !important;
            pointer-events: auto !important;
            backdrop-filter: blur(5px) !important;
            -webkit-backdrop-filter: blur(5px) !important;
        ">
            <i class="fa-solid fa-file-lines"></i> Review Policy
        </a>
     `;

    let shield = document.getElementById('ban-enforcer-shield');
    if (!shield) {
        shield = document.createElement('div');
        shield.id = 'ban-enforcer-shield';
        document.documentElement.appendChild(shield);
    }
    shield.style.cssText = `
        position: fixed !important; top: 0 !important; left: 0 !important; 
        width: 100vw !important; height: 100vh !important;
        background-color: ${severity === 'hardware' ? 'rgba(20, 0, 0, 0.98)' : 'rgba(0, 0, 0, 0.95)'} !important;
        backdrop-filter: blur(10px) !important; -webkit-backdrop-filter: blur(10px) !important;
        z-index: 2147483646 !important; cursor: default !important;
    `;

    let messageBox = document.getElementById('ban-enforcer-message');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.id = 'ban-enforcer-message';
        document.documentElement.appendChild(messageBox);
    }
    messageBox.style.cssText = `
        position: fixed !important; bottom: ${spacing} !important; left: ${spacing} !important; 
        color: #ffffff !important;
        font-family: 'Geist', sans-serif !important; z-index: 2147483647 !important;
        text-align: left !important; text-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
    `;

    const statusText = severity === 'hardware' ? 'SYSTEM BLACKLISTED' : 'ACCOUNT SUSPENDED';
    const subTitle = severity === 'hardware' ? 'Permanent Hardware Block' : 'Violation Detected';

    messageBox.innerHTML = `
        <h1 style="font-size: 4rem !important; color: #ffffff !important; margin: 0 0 20px 0 !important; font-weight: 400 !important; line-height: 1 !important; white-space: nowrap !important;">${statusText}</h1>
        <p style="font-size: 1.25rem !important; margin: 0 0 10px 0 !important; color: #ef4444 !important; font-weight: 400 !important;">${subTitle}</p>
        <div style="width: 50px !important; height: 4px !important; background-color: #ef4444 !important; margin-bottom: 20px !important;"></div>
        <p style="font-size: 1rem !important; margin: 0 0 10px 0 !important; color: #d1d5db !important; max-width: 500px !important; line-height: 1.6 !important; font-weight: 400 !important;">
            <strong>Reason:</strong> ${reason}
        </p>
        <div style="margin-top: 20px !important;">${actionButton}</div>
        <p style="font-size: 0.85rem !important; color: #6b7280 !important; margin-top: 20px !important; font-weight: 400 !important;">
            ${severity === 'hardware' ? 'Hardware Ban enforced by Core Authority.' : `Banned by administrator ${banTimestamp}.`} <br>
            Reference: ${banData.originalUid || banData.uid || 'UNKNOWN'}
        </p>
    `;

    let homeButton = document.getElementById('ban-enforcer-home-button');
    if (!homeButton) {
        homeButton = document.createElement('a');
        homeButton.id = 'ban-enforcer-home-button';
        homeButton.href = '../index.html';
        homeButton.innerHTML = `<i class="fa-solid fa-house"></i>`;
        document.documentElement.appendChild(homeButton);
    }
    homeButton.style.cssText = `
        position: fixed !important; bottom: ${spacing} !important; right: ${spacing} !important; z-index: 2147483647 !important;
        display: inline-flex !important; align-items: center !important; justify-content: center !important;
        padding: 0.5rem 1rem !important; background-color: transparent !important;
        border: 1px solid #333 !important; border-radius: 14px !important; color: #d1d5db !important;
        font-size: 24px !important; text-decoration: none !important; cursor: pointer !important;
        transition: all 0.2s !important; width: ${homeBtnSize} !important; height: ${homeBtnSize} !important; pointer-events: auto !important;
        font-weight: 400 !important; 
    `;
    homeButton.onmouseover = () => { homeButton.style.backgroundColor = '#000 !important'; homeButton.style.borderColor = '#fff !important'; homeButton.style.color = '#fff !important'; };
    homeButton.onmouseout = () => { homeButton.style.backgroundColor = 'transparent !important'; homeButton.style.borderColor = '#333 !important'; homeButton.style.color = '#d1d5db !important'; };

    document.documentElement.style.overflow = 'hidden !important';
    document.body.style.overflow = 'hidden !important';
}

function lockPageAsBanned(banData) {
    console.log(`BanEnforcer: lockPageAsBanned triggered. Severity: ${banData.severity}`);
    currentBanData = banData;
    renderBanVisuals(banData);

    if (banData.severity === 'hardware') {
        // Ensure the death sentence is locked specifically to this hardware ID
        getHardwareId().then(hwId => {
            localStorage.setItem(DEATH_SENTENCE_KEY, JSON.stringify({ ...banData, hwId }));
        });
    }

    if (banGuardInterval) clearInterval(banGuardInterval);
    banGuardInterval = setInterval(() => {
        if (currentBanData) {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
            }
            const shield = document.getElementById('ban-enforcer-shield');
            const msg = document.getElementById('ban-enforcer-message');
            if (!shield || !msg) renderBanVisuals(currentBanData);
        }
    }, 200);
}

// --- 3. Enforcement Logic ---
(async function initBanEnforcement() {
    const path = window.location.pathname;
    const isExcludedPage = 
        path === '/' || 
        path.endsWith('index.html') || 
        path.endsWith('legal.html') || 
        path.endsWith('authentication.html') ||
        path.includes('messenger-v2.html');

    if (isExcludedPage) {
        console.log("BanEnforcer: On excluded page. Skipping enforcement visuals.");
    }

    const hwId = await getHardwareId();
    if (!hwId) return;

    const checkHardwareEnforcement = () => {
        if (!currentBanData || currentBanData.severity !== 'hardware') return;
        
        const user = auth.currentUser;
        if (user && currentBanData.originalUid === user.uid) {
            if (!isExcludedPage) {
                lockPageAsBanned(currentBanData);
            }
        } else if (currentBanData.severity === 'hardware') {
            unlockPage();
        }
    };

    // Check Hardware Ban in DB
    if (unsubHardware) unsubHardware();
    unsubHardware = onSnapshot(doc(db, 'hardware_bans', hwId), docSnap => {
        if (docSnap.exists()) {
            currentBanData = { severity: 'hardware', ...docSnap.data() };
            checkHardwareEnforcement();
        } else {
            if (currentBanData && currentBanData.severity === 'hardware') {
                console.log("BanEnforcer: Hardware ban lifted in DB. Unlocking...");
                localStorage.removeItem(DEATH_SENTENCE_KEY);
                unlockPage();
                currentBanData = null;
            }
        }
    });

    // B. Check Auth Status and Account Ban
    if (!path.includes('messenger-v2.html')) {
        onAuthStateChanged(auth, async user => {
            cleanupAllListeners(); 

            if (!user) {
                isUserAdmin = false;
                checkHardwareEnforcement();
                return;
            }

            const uid = user.uid;

            // 1. Role Check
            unsubRole = onSnapshot(doc(db, 'admins', uid), roleSnap => {
                const roleData = roleSnap.exists() ? roleSnap.data() : null;
                isUserAdmin = (roleData && roleData.role === 'admin' && roleData.type === 'full') || (user.email === '4simpleproblems@gmail.com');
                
                window.isAdmin = isUserAdmin;
                window.isSuperAdmin = user.email === '4simpleproblems@gmail.com';

                if (isUserAdmin) {
                    unlockPage();
                } else {
                    checkHardwareEnforcement();
                }
            });

            // 2. Account Ban Check
            unsubBan = onSnapshot(doc(db, 'bans', uid), docSnap => {
                if (isUserAdmin) {
                    unlockPage();
                    return;
                }
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (!isExcludedPage) {
                        lockPageAsBanned({ uid: uid, ...data });
                    }
                } else {
                    if (!currentBanData || currentBanData.severity !== 'hardware') {
                        unlockPage();
                    }
                }
            });
        });
    }
})();
               unlockPage();
                    }
                }
            });
        });
    }
})();
