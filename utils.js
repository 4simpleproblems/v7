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
         * Syncs the user's Google profile picture URL to their Supabase profile.
         */
        export async function syncGooglePhoto(authUser) {
            if (!authUser || !window.supabase) return;
            
            try {
                let uid = authUser.uid || authUser.id;
                const meta = authUser.user_metadata || authUser.raw_user_meta_data || {};
                const googlePhoto = meta.picture || meta.avatar_url;

                if (!googlePhoto) return;

                // Update Supabase profiles table
                await window.supabase.from('profiles').update({ avatar_url: googlePhoto }).eq('id', uid);
            } catch (e) {
                console.error("Error syncing Google photo to Supabase:", e);
            }
        }

        export const getLetterAvatarTextColor = (colorOrGradient) => {
            if (!colorOrGradient) return '#FFFFFF';
            
            // Extract first hex color if it's a gradient
            const match = colorOrGradient.match(/#([0-9a-fA-F]{3}){1,2}/);
            const hex = match ? match[0] : colorOrGradient;

            if (!hex.startsWith('#')) return '#FFFFFF';
            
            try {
                const cleanHex = hex.startsWith('#') ? hex : '#' + hex;
                let r, g, b;
                if (cleanHex.length === 4) {
                    r = parseInt(cleanHex[1] + cleanHex[1], 16);
                    g = parseInt(cleanHex[2] + cleanHex[2], 16);
                    b = parseInt(cleanHex[3] + cleanHex[3], 16);
                } else {
                    r = parseInt(cleanHex.substring(1, 3), 16);
                    g = parseInt(cleanHex.substring(3, 5), 16);
                    b = parseInt(cleanHex.substring(5, 7), 16);
                }
                return (0.299 * r + 0.587 * g + 0.114 * b) > 128 ? '#000000' : '#FFFFFF';
            } catch (e) {
                return '#FFFFFF';
            }
        };

        /**
         * Returns the HTML for a user's avatar, wrapped in a container.
         */
        export function getAvatarHTML(userData, sizeClass = "w-10 h-10", forceCSS = false, authUser = null, roundedClass = "rounded-xl", scaleClass = "", clipOuterContainer = true) {
            // Normalize field access (Support both Firestore camelCase and Supabase snake_case)
            const pT = userData?.pfp_type || userData?.pfpType || 'user';
            const dN = userData?.display_name || userData?.displayName || userData?.username || authUser?.displayName || 'User';
            const customPfp = userData?.avatar_url || userData?.customPfp || userData?.photoURL;
            const letterBg = userData?.pfp_letter_bg || userData?.pfpLetterBg || userData?.letterAvatarColor || '#4f46e5';
            const letterChar = userData?.pfp_letter_char || userData?.pfpLetterChar || userData?.letterAvatarText || dN;
            
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
            if (pT === 'custom' && customPfp) {
                innerHTML = `<img src="${customPfp}" class="${innerClasses}">`;
            } else if (pT === 'mibi' && (userData?.mibi_config || userData?.mibiConfig || userData?.mibiEyes)) {
                const config = userData.mibi_config || userData.mibiConfig || {
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
                const letter = letterChar.charAt(0).toUpperCase();
                const fontSize = px * 0.35;
                const tC = getLetterAvatarTextColor(letterBg);
                innerHTML = `<div class="${innerClasses} flex items-center justify-center font-normal" style="background:${letterBg}; color: ${tC}; font-size: ${fontSize}px; line-height: 1;">${letter}</div>`;
            } else {
                // 2. Default Case (user, google, or undefined) -> Use normalized customPfp (which includes avatar_url/photoURL)
                let gP = customPfp;

                // Priority 1: Supabase Metadata (from auth user object or profile)
                const meta = userData?.raw_user_meta_data || authUser?.raw_user_meta_data || userData?.user_metadata || authUser?.user_metadata;
                if (!gP && meta) {
                    gP = meta.picture || meta.avatar_url;
                }

                // Priority 2: Firebase Provider fallback
                if (!gP && authUser?.providerData) {
                    const googleProvider = authUser.providerData.find(p => p.providerId === 'google.com');
                    if (googleProvider) gP = googleProvider.photoURL;
                }

                if (gP) {
                    // Ensure high quality Google PFPs
                    if (gP.includes('googleusercontent.com')) {
                        gP = gP.replace(/lh\d+\.googleusercontent\.com/g, 'lh3.googleusercontent.com');
                        if (gP.includes('=')) {
                            gP = gP.split('=')[0] + '=s500-c';
                        } else if (!gP.includes('=s500-c')) {
                            gP = gP + '=s500-c';
                        }
                    }

                    // Robust fallback for image errors: use letter avatar instead of icon
                    const letter = letterChar.charAt(0).toUpperCase();
                    const fontSizeLetter = px * 0.35;
                    const tC = getLetterAvatarTextColor(letterBg);
                    const fallbackHTML = `<div class='flex items-center justify-center font-normal w-full h-full' style='background:${letterBg}; color: ${tC}; font-size: ${fontSizeLetter}px; line-height: 1;'>${letter}</div>`;

                    innerHTML = `<img src="${gP}" class="${innerClasses}" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.parentElement.innerHTML=\`${fallbackHTML}\` ">`;
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
         * Checks if the current user is an admin by fetching their profile from Supabase.
         */
        export async function checkAdminStatus(uid) {
            if (!uid || !window.supabase) return false;

            try {
                const { data } = await window.supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', uid)
                    .maybeSingle();
                
                return data?.is_admin === true;
            } catch (e) {
                console.warn("Supabase admin check failed:", e);
                return false;
            }
        }
