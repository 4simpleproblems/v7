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
let banGuardInterval = null;
let currentBanData = null; 

// --- 1. Font Injection (Geist) & Styling Constraints ---
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
    console.log("BanEnforcer: Calling renderBanVisuals(). Attempting to draw shield and message box.");
    
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
    }

    const reason = banData.reason ? String(banData.reason).replace(/</g, "&lt;") : 'No reason provided.';
    let banTimestamp = '';
    if (banData.bannedAt && banData.bannedAt.toDate) {
        const date = banData.bannedAt.toDate();
        banTimestamp = `on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    }

    const spacing = '30px'; 
    const homeBtnSize = '60px'; 

    let actionButton = '';
    if (banData.link) {
         actionButton = `
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
    }

    let shield = document.getElementById('ban-enforcer-shield');
    if (!shield) {
        shield = document.createElement('div');
        shield.id = 'ban-enforcer-shield';
        document.documentElement.appendChild(shield);
    }
    shield.style.cssText = `
        position: fixed !important; top: 0 !important; left: 0 !important; 
        width: 100vw !important; height: 100vh !important;
        background-color: rgba(0, 0, 0, 0.95) !important;
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
    messageBox.innerHTML = `
        <h1 style="font-size: 4rem !important; color: #ffffff !important; margin: 0 0 20px 0 !important; font-weight: 400 !important; line-height: 1 !important; white-space: nowrap !important;">Access Denied</h1>
        <p style="font-size: 1.25rem !important; margin: 0 0 10px 0 !important; color: #ef4444 !important; font-weight: 400 !important;">Account Suspended</p>
        <div style="width: 50px !important; height: 4px !important; background-color: #ef4444 !important; margin-bottom: 20px !important;"></div>
        <p style="font-size: 1rem !important; margin: 0 0 10px 0 !important; color: #d1d5db !important; max-width: 500px !important; line-height: 1.6 !important; font-weight: 400 !important;">
            <strong>Reason:</strong> ${reason}
        </p>
        ${actionButton ? `<div style="margin-top: 20px !important;">${actionButton}</div>` : ''}
        <p style="font-size: 0.85rem !important; color: #6b7280 !important; margin-top: 20px !important; font-weight: 400 !important;">
            Banned by administrator ${banTimestamp}.<br>
            ID: ${banData.uid || 'UNKNOWN'}
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
    console.log(`BanEnforcer: lockPageAsBanned triggered for UID: ${banData.uid}.`);
    currentBanData = banData;
    renderBanVisuals(banData);

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

// --- 3. Auth & Firestore Listener ---
const path = window.location.pathname;
if (!path.includes('messenger-v2.html')) {
    onAuthStateChanged(auth, user => {
        if (user) {
            onSnapshot(doc(db, 'bans', user.uid), docSnap => {
                if (docSnap.exists()) {
                    lockPageAsBanned({ uid: user.uid, ...docSnap.data() });
                } else {
                    if (currentBanData) unlockPage();
                }
            });
        } else {
            unlockPage();
        }
    });
}
