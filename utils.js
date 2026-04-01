        import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
        import { firebaseConfig } from "../firebase-config.js"; 

        // Initialize primary app safely
        let app;
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }
        const db = getFirestore(app);

        /**
         * Syncs the user's Google profile picture URL to their Firestore document.
         * Only runs if the user is authenticated via Google and the photoURL is missing or different.
         */
        export async function syncGooglePhoto(authUser) {
            if (!authUser) return;
            
            try {
                // Determine UID and Google Photo URL based on source (Firebase vs Supabase)
                let uid = authUser.uid || authUser.id;
                let googlePhoto = null;

                // Try Firebase providerData
                const googleProvider = authUser?.providerData?.find(p => p.providerId === 'google.com');
                googlePhoto = googleProvider ? googleProvider.photoURL : authUser.photoURL;

                // Fallback to Supabase metadata if not found in Firebase provider
                if (!googlePhoto && authUser?.user_metadata?.avatar_url) {
                    googlePhoto = authUser.user_metadata.avatar_url;
                }

                if (!googlePhoto) return;

                const userRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const data = userSnap.data();
                    const currentPhoto = data.photoURL;

                    // If photoURL is missing or different from Google's latest, update it
                    if (currentPhoto !== googlePhoto) {
                        console.log("Syncing Google PFP to Firestore...");
                        await updateDoc(userRef, { photoURL: googlePhoto });
                    }
                }
            } catch (e) {
                console.error("Error syncing Google photo:", e);
            }
        }

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
        export function getAvatarHTML(userData, sizeClass = "w-10 h-10", forceCSS = false, authUser = null, roundedClass = "rounded-xl", scaleClass = "", clipOuterContainer = true) {
            const pT = userData?.pfpType || 'user';
            const dN = userData?.username || userData?.displayName || authUser?.displayName || 'User';
            
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

            // 1. Try Specific Types First
            if (pT === 'custom' && userData?.customPfp) {
                innerHTML = `<img src="${userData.customPfp}" class="${innerClasses}">`;
            } else if (pT === 'mibi' && (userData?.mibiConfig || userData?.mibiEyes)) {
                const config = userData.mibiConfig || {
                    eyes: userData.mibiEyes,
                    mouths: userData.mibiMouth,
                    hats: userData.mibiHat,
                    bgColor: userData.mibiBg,
                    rotation: userData.mibiRotation || 0,
                    size: userData.mibiSize || 100,
                    offsetX: userData.mibiOffsetX || 0,
                    offsetY: userData.mibiOffsetY || 0
                };
                
                const { eyes, mouths, hats, bgColor, rotation, size, offsetX, offsetY } = config;
                const scale = (size || 100) / 100;
                const rot = rotation || 0;
                const x = offsetX || 0;
                const y = offsetY || 0;
                
                innerHTML = `
                    <div class="w-full h-full relative overflow-hidden" style="background-color: ${bgColor || '#3B82F6'};">
                         <div class="absolute inset-0 w-full h-full" style="transform: translate(${x}%, ${y}%) rotate(${rot}deg) scale(${scale}); transform-origin: center;">
                             <img src="/mibi-avatars/head.png" class="absolute inset-0 w-full h-full object-contain">
                             ${eyes ? `<img src="/mibi-avatars/eyes/${eyes}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                             ${mouths ? `<img src="/mibi-avatars/mouths/${mouths}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                             ${hats ? `<img src="/mibi-avatars/hats/${hats}" class="absolute inset-0 w-full h-full object-contain">` : ''}
                         </div>
                    </div>
                `;
            } else if (pT === 'letter') {
                const bg = userData?.pfpLetterBg || userData?.letterAvatarColor || '#4f46e5';
                const letter = (userData?.letterAvatarText || dN).charAt(0).toUpperCase();
                const fontSize = px * 0.35;
                const tC = getLetterAvatarTextColor(bg);
                innerHTML = `<div class="${innerClasses} flex items-center justify-center font-normal" style="background:${bg}; color: ${tC}; font-size: ${fontSize}px; line-height: 1;">${letter}</div>`;
            } else {
                // 2. Default Case (user, google, or undefined) -> Use photoURL if available
                let gP = userData?.photoURL || userData?.avatar_url;

                // Check Supabase metadata if provided directly in userData
                if (!gP && userData?.user_metadata?.avatar_url) {
                    gP = userData.user_metadata.avatar_url;
                }
                if (!gP && userData?.raw_user_meta_data?.avatar_url) {
                    gP = userData.raw_user_meta_data.avatar_url;
                }

                // Fallback to authUser photo if viewing own profile and userData is partial
                if (!gP && authUser && (userData?.uid === authUser.uid || userData?.id === authUser.uid || userData?.id === authUser.id)) {
                    // Try Supabase user_metadata/raw_user_meta_data first
                    gP = authUser?.user_metadata?.avatar_url || authUser?.raw_user_meta_data?.avatar_url;

                    // Try Firebase providerData next
                    if (!gP) {
                        const googleProvider = authUser?.providerData?.find(p => p.providerId === 'google.com');
                        gP = googleProvider ? googleProvider.photoURL : authUser.photoURL;
                    }
                }

                if (gP) {
                    // Ensure high quality Google PFPs
                    gP = gP.replace(/lh\d+\.googleusercontent\.com/g, 'lh3.googleusercontent.com');
                    if (gP.includes('googleusercontent.com')) {
                        if (gP.includes('=')) {
                            gP = gP.split('=')[0] + '=s500-c';
                        } else if (!gP.includes('=s500-c')) {
                            gP = gP + '=s500-c';
                        }
                    }

                    // Robust fallback for image errors: use letter avatar instead of icon
                    const bg = userData?.pfpLetterBg || userData?.letterAvatarColor || '#4f46e5';
                    const letter = (userData?.letterAvatarText || dN).charAt(0).toUpperCase();
                    const fontSizeLetter = px * 0.35;
                    const tC = getLetterAvatarTextColor(bg);
                    const fallbackHTML = `<div class='${innerClasses} flex items-center justify-center font-normal' style='background:${bg}; color: ${tC}; font-size: ${fontSizeLetter}px; line-height: 1;'>${letter}</div>`;

                    innerHTML = `<img src="${gP}" class="${innerClasses}" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML=\`${fallbackHTML}\` ">`;
                }

                if (!innerHTML) {
                    // 3. Absolute Fallback: Icon
                    const fontSizeIcon = px * 0.4;
                    innerHTML = `<div class="${innerClasses} flex items-center justify-center bg-indigo-600/20 text-indigo-500" style="font-size: ${fontSizeIcon}px;"><i class="fa-solid fa-user"></i></div>`;
                }
            }

            const bgClass = (innerHTML.includes('<img') || pT === 'letter' || pT === 'mibi') ? '' : ''; // bg-gray-800 was here but we handle bg in innerHTML now
            const outerContainerClasses = `${sizeClass} aspect-square ${roundedClass} shrink-0 flex items-center justify-center ${bgClass} border border-white/5`;
            const finalOuterContainerClasses = clipOuterContainer ? `${outerContainerClasses} overflow-hidden` : outerContainerClasses;

            return `<div class="${finalOuterContainerClasses}">${innerHTML}</div>`;
        }

        export function getEmbedUrl(url) {
            if (!url) return '';
            const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
            return url;
        }

        /**
         * Checks if the current user is an admin by fetching their profile or admin document.
         */
        export async function checkAdminStatus(uid) {
            if (!uid) return false;

            // 1. Try Supabase First (Modern Primary)
            if (window.supabase) {
                try {
                    const { data } = await window.supabase
                        .from('profiles')
                        .select('is_admin')
                        .eq('id', uid)
                        .maybeSingle();
                    if (data?.is_admin) return true;
                } catch (e) {
                    console.warn("Supabase admin check failed.");
                }
            }

            // 2. Try Firestore (Legacy fallback)
            try {
                const adminDocRef = doc(db, 'admins', uid);
                const adminSnap = await getDoc(adminDocRef);
                
                if (adminSnap.exists()) {
                    const data = adminSnap.data();
                    return data.role === 'admin' || data.role === 'superadmin';
                }
            } catch (e) {
                if (e.code !== 'permission-denied') {
                    console.error("Error checking legacy admin status:", e);
                }
            }

            // 3. Email-based hardcoded override
            if (uid === '709b99b3-ee28-4de1-8070-bd4db8ac46ed') return true; // 4simpleproblems@gmail.com

            return false;
        }
