        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
        import { firebaseConfig } from "../firebase-config.js"; 

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        export const getLetterAvatarTextColor = (hex) => {
            if (!hex) return '#FFFFFF';
            const cleanHex = hex.startsWith('#') ? hex : '#' + hex;
            const rgb = parseInt(cleanHex.substring(1), 16);
            const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = (rgb >> 0) & 0xff;
            return (0.299 * r + 0.587 * g + 0.114 * b) > 128 ? '#000000' : '#FFFFFF';
        };

        /**
         * Returns the HTML for a user's avatar, wrapped in a container.
         */
        export function getAvatarHTML(userData, sizeClass = "w-10 h-10", forceCSS = false, authUser = null, roundedClass = "rounded-full", scaleClass = "", clipOuterContainer = true) {
            const pT = userData?.pfpType || 'user';
            const dN = userData?.displayName || userData?.username || authUser?.displayName || 'User';
            
            const sizeMap = { 
                "w-32 h-32": 128, "w-28 h-28": 112, "w-24 h-24": 96, "w-16 h-16": 64, 
                "w-12 h-12": 48, "w-10 h-10": 40, "w-8 h-8": 32, 
                "w-full h-full": 128 
            };
            
            let px = 40;
            const match = sizeClass.match(/w-(\d+)/);
            if (match) px = parseInt(match[1]) * 4; 
            else px = sizeMap[sizeClass] || 40;

            let innerHTML = '';
            const innerClasses = `block min-w-full min-h-full w-full h-full object-cover ${scaleClass}`;

            if (pT === 'custom' && userData?.customPfp) {
                innerHTML = `<img src="${userData.customPfp}" class="${innerClasses}">`;
            } else if (pT === 'letter') {
                const bg = userData?.pfpLetterBg || '#4f46e5';
                const letter = (userData?.letterAvatarText || dN).charAt(0).toUpperCase();
                const fontSize = px * 0.35;
                const tC = getLetterAvatarTextColor(bg);
                innerHTML = `<div class="${innerClasses} flex items-center justify-center font-normal" style="background:${bg}; color: ${tC}; font-size: ${fontSize}px; line-height: 1;">${letter}</div>`;
            } else {
                let gP = userData?.photoURL;
                if (!gP && authUser && (userData?.uid === authUser.uid || userData?.id === authUser.uid)) {
                    gP = authUser.photoURL;
                }

                if (gP) {
                    gP = gP.replace(/lh\d+\.googleusercontent\.com/g, 'lh3.googleusercontent.com');
                    if (gP.includes('googleusercontent.com') && gP.includes('=')) {
                        gP = gP.split('=')[0] + '=s500-c';
                    }
                    innerHTML = `<img src="${gP}" class="${innerClasses}" referrerpolicy="no-referrer" onerror="this.src='/images/default_pfp.png'">`;
                }
            }
            
            if (!innerHTML) {
                innerHTML = `<img src="/images/default_pfp.png" class="${innerClasses}">`;
            }

            const bgClass = userData?.pfpType === 'letter' ? '' : 'bg-gray-800';
            const outerContainerClasses = `${sizeClass} aspect-square ${roundedClass} shrink-0 flex items-center justify-center ${bgClass} border border-white/5`;
            const finalOuterContainerClasses = clipOuterContainer ? `${outerContainerClasses} overflow-hidden` : outerContainerClasses;

            return `
                <div class="${finalOuterContainerClasses}">
                    ${innerHTML}
                </div>
            `;
        }

        export function getEmbedUrl(url) {
            if (!url) return '';
            const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
            return url;
        }

        /**
         * Checks if the current user is an admin by fetching their admin document.
         */
        export async function checkAdminStatus(uid) {
            try {
                const adminDocRef = doc(db, 'admins', uid);
                const adminSnap = await getDoc(adminDocRef);
                
                if (adminSnap.exists()) {
                    const data = adminSnap.data();
                    return data.role === 'admin' || data.role === 'superadmin';
                }
                return false;
            } catch (e) {
                console.error("Error checking admin status:", e);
                return false;
            }
        }
