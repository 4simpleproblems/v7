/**
 * birthday.js
 * Handles birthday detection and personalization effects.
 * (c) 4SP - Made with ❤️ from 4SP
 */

(function() {
    const BDAY_KEY = 'user_birthday'; // Stored as "MM-DD"
    const BDAY_LAST_SHOWN_YEAR = 'user_birthday_last_shown_year';
    
    function checkBirthday() {
        const storedBday = localStorage.getItem(BDAY_KEY);
        if (!storedBday) return;

        const today = new Date();
        const currentMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        if (storedBday === currentMonthDay) {
            const currentYear = today.getFullYear();
            const lastShownYear = localStorage.getItem(BDAY_LAST_SHOWN_YEAR);
            
            if (lastShownYear !== String(currentYear)) {
                showBirthdayPopup();
                localStorage.setItem(BDAY_LAST_SHOWN_YEAR, String(currentYear));
                // Unlock theme if not already (logic handled by existence of bday in localstorage usually)
            }
        }
    }

    function showBirthdayPopup() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 2000000;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.5s ease;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: #fff5f8; border: 2px solid #f8bbd0; border-radius: 32px;
            padding: 3rem; text-align: center; max-width: 400px; width: 90%;
            box-shadow: 0 20px 50px rgba(233, 30, 99, 0.3);
            transform: scale(0.8); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        
        content.innerHTML = `
            <div style="font-size: 4rem; margin-bottom: 1rem;">🎂</div>
            <h1 style="font-size: 2rem; color: #ad1457; font-weight: 800; margin-bottom: 1rem;">Happy Birthday!</h1>
            <p style="color: #f06292; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem;">
                The 4SP team wishes you an amazing day! We've unlocked a special <strong>Birthday Theme</strong> for you in Settings.
            </p>
            <button id="close-bday-popup" style="
                background: #00bcd4; color: white; border: none; border-radius: 16px;
                padding: 1rem 2rem; font-weight: 700; cursor: pointer;
                transition: transform 0.2s, background 0.2s; width: 100%;
            ">Sweet! Thanks! ❤️</button>
        `;
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Trigger party popper effect if possible
        if (typeof party !== 'undefined') {
            party.confetti(document.body, {
                count: party.variation.range(60, 100),
                size: party.variation.range(0.8, 1.4),
            });
            
            // Continuous little pops while open? Let's do a few bursts
            const interval = setInterval(() => {
                if (!document.contains(overlay)) {
                    clearInterval(interval);
                    return;
                }
                party.confetti(document.body, {
                    count: party.variation.range(20, 40),
                    size: party.variation.range(0.8, 1.2),
                });
            }, 2000);
        }

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            content.style.transform = 'scale(1)';
        });

        const closeBtn = content.querySelector('#close-bday-popup');
        closeBtn.onclick = () => {
            overlay.style.opacity = '0';
            content.style.transform = 'scale(0.8)';
            setTimeout(() => overlay.remove(), 500);
        };
        closeBtn.onmouseenter = () => closeBtn.style.background = '#26c6da';
        closeBtn.onmouseleave = () => closeBtn.style.background = '#00bcd4';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkBirthday);
    } else {
        checkBirthday();
    }
})();
// Made with ❤️ from 4SP
// Made with ❤️ from 4SP
