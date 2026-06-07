(function() {
    if (window.__4sp_pillbar_loaded) return;
    window.__4sp_pillbar_loaded = true;

    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/pillbar.css';
    document.head.appendChild(link);

    const navHTML = `
        <nav class="nav-pill">
            <a href="/index.html" data-tooltip="Home" class="nav-icon" id="nav-home"><i class="fa-solid fa-house"></i></a>
            <a href="/logged-in/games.html" data-tooltip="Games" class="nav-icon" id="nav-games"><i class="fa-solid fa-gamepad"></i></a>
            <a href="/VELIUM/index.html" data-tooltip="Music" class="nav-icon" id="nav-music"><i class="fa-solid fa-music"></i></a>
            <a href="/logged-in/vora.html" data-tooltip="Movies" class="nav-icon" id="nav-movies"><i class="fa-solid fa-tv"></i></a>
            
            <div class="projects-group" id="favorites-group">
                <button id="toggle-favorites" class="nav-icon" data-tooltip="Favorites"><i class="fa-solid fa-star"></i></button>
                <div class="sub-menu" id="favorites-list">
                    <!-- Favorites will be injected here -->
                </div>
            </div>

            <div class="projects-group" id="more-group">
                <button id="toggle-more" class="nav-icon" data-tooltip="More"><i class="fa-solid fa-ellipsis"></i></button>
                <div class="sub-menu" id="more-links">
                    <a href="/logged-in/soundboard.html" data-tooltip="Soundboard" class="nav-icon sub-icon"><i class="fa-solid fa-volume-up"></i></a>
                    <a href="/logged-in/notes.html" data-tooltip="Notes" class="nav-icon sub-icon account-only"><i class="fa-solid fa-sticky-note"></i></a>
                    <a href="/logged-in/messenger-tutorial.html" data-tooltip="Messenger" class="nav-icon sub-icon account-only"><i class="fa-solid fa-comments"></i></a>
                </div>
            </div>

            <a href="/logged-in/settings.html" data-tooltip="Settings" class="nav-icon" id="nav-settings"><i class="fa-solid fa-gear"></i></a>
            <button onclick="openAuthModal()" data-tooltip="Account" class="nav-icon" id="nav-auth"><i class="fa-solid fa-user"></i></button>
        </nav>
    `;

    const footerHTML = `
        <div class="footer-bar">
            <div class="footer-credit">Made with ❤️ from 4SP. &copy; 2026</div>
            <div class="footer-links">
                <a href="/legal.html">Terms</a>
                <a href="mailto:4simpleproblems@gmail.com">Contact</a>
            </div>
        </div>
    `;

    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem('4sp-v7-favorites')) || [];
        } catch (e) {
            return [];
        }
    }

    function renderFavorites() {
        const favoritesList = document.getElementById('favorites-list');
        if (!favoritesList) return;
        const favs = getFavorites();
        if (favs.length === 0) {
            favoritesList.innerHTML = '<span style="font-size: 10px; color: var(--text-muted); padding: 10px;">No favorites</span>';
            return;
        }
        favoritesList.innerHTML = favs.map(f => `
            <a href="${f.url}" data-tooltip="${f.name}" class="nav-icon sub-icon"><i class="${f.icon || 'fa-solid fa-bookmark'}"></i></a>
        `).join('');
    }

    window.toggleFavorite = function(name, url, icon) {
        let favs = getFavorites();
        const index = favs.findIndex(f => f.url === url);
        if (index > -1) {
            favs.splice(index, 1);
        } else {
            favs.push({ name, url, icon });
        }
        localStorage.setItem('4sp-v7-favorites', JSON.stringify(favs));
        renderFavorites();
    };

    async function updateAuthUI() {
        const authNav = document.getElementById('nav-auth');
        const accountOnlyLinks = document.querySelectorAll('.account-only');
        if (!authNav) return;

        let session = null;
        if (window.supabase) {
            const { data } = await window.supabase.auth.getSession();
            session = data.session;
        }

        if (session && session.user) {
            authNav.style.color = 'var(--accent)';
            accountOnlyLinks.forEach(l => l.style.display = 'flex');
        } else {
            authNav.style.color = 'var(--text-muted)';
            accountOnlyLinks.forEach(l => l.style.display = 'none');
        }
    }

    function init() {
        if (!document.body) {
            setTimeout(init, 10);
            return;
        }

        document.body.insertAdjacentHTML('afterbegin', navHTML);
        document.body.insertAdjacentHTML('beforeend', footerHTML);

        renderFavorites();

        document.getElementById('toggle-favorites')?.addEventListener('click', () => {
            document.getElementById('favorites-group').classList.toggle('expanded');
            document.getElementById('more-group').classList.remove('expanded');
        });

        document.getElementById('toggle-more')?.addEventListener('click', () => {
            document.getElementById('more-group').classList.toggle('expanded');
            document.getElementById('favorites-group').classList.remove('expanded');
        });

        // Highlight active link
        const path = window.location.pathname;
        document.querySelectorAll('.nav-icon').forEach(link => {
            const href = link.getAttribute('href');
            if (href && (path === href || path.startsWith(href) && href !== '/')) {
                link.classList.add('active');
            }
        });
        
        if (window.location.pathname.includes('authentication.html')) {
            const footer = document.querySelector('.footer-bar');
            if (footer) footer.style.display = 'none';
        }

        updateAuthUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addEventListener('supabaseAuthChange', updateAuthUI);
    setInterval(updateAuthUI, 2000); 

    window.openAuthModal = function() {
        window.location.href = '/authentication.html';
    };

})();
