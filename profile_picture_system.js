/**
 * Profile Picture System
 * Handles all logic for rendering and loading profile pictures.
 */

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
        let gP = userData?.photoURL;
        // Fallback to authUser photo if viewing own profile and userData is partial
        if (!gP && authUser && (userData?.uid === authUser.uid || userData?.id === authUser.uid)) {
            gP = authUser.photoURL;
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
            const fallbackHTML = `<div class="${innerClasses} flex items-center justify-center font-normal" style="background:${bg}; color: ${tC}; font-size: ${fontSizeLetter}px; line-height: 1;">${letter}</div>`;

            innerHTML = `<img src="${gP}" class="${innerClasses}" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML=\`${fallbackHTML}\` ">`;
        }

        if (!innerHTML) {
            const bg = userData?.pfpLetterBg || userData?.letterAvatarColor || '#4f46e5';
            const letter = (userData?.letterAvatarText || dN).charAt(0).toUpperCase();
            const fontSizeLetter = px * 0.35;
            const tC = getLetterAvatarTextColor(bg);
            innerHTML = `<div class="${innerClasses} flex items-center justify-center font-normal" style="background:${bg}; color: ${tC}; font-size: ${fontSizeLetter}px; line-height: 1;">${letter}</div>`;
        }
    }

    const bgClass = (innerHTML.includes('<img') || pT === 'letter' || pT === 'mibi' || !innerHTML.includes('fa-user')) ? '' : 'bg-gray-800';
    const outerContainerClasses = `${sizeClass} aspect-square ${roundedClass} shrink-0 flex items-center justify-center ${bgClass} border border-white/5`;
    const finalOuterContainerClasses = clipOuterContainer ? `${outerContainerClasses} overflow-hidden` : outerContainerClasses;

    return `
        <div class="${finalOuterContainerClasses}">
            ${innerHTML}
        </div>
    `;
}
