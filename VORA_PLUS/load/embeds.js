// Vora MAX - Logic Engine
window.VORA_CONFIG = window.VORA_CONFIG || {
    currentView: window.location.pathname.includes('movies.html') ? 'movies' : 
                 window.location.pathname.includes('series.html') ? 'series' : 'index'
};

const isMoviePage = () => window.VORA_CONFIG.currentView === 'movies';
const isSeriesPage = () => window.VORA_CONFIG.currentView === 'series';
const isIndexPage = () => window.VORA_CONFIG.currentView === 'index';

window.switchView = function(view, clearHash = true) {
    window.VORA_CONFIG.currentView = view;
    if (clearHash) {
        window.location.hash = ''; 
    }
    
    const hasHash = !!window.location.hash;

    // 1. Sidebar UI Update (for old design)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(`'${view}'`)) {
            link.classList.add('active');
        }
    });

    // 2. Navbar UI Update (for new design)
    document.querySelectorAll('#navbar a').forEach(link => {
        link.classList.remove('text-white');
        link.classList.add('text-gray-400');
        if (link.innerText.toLowerCase() === view.toLowerCase() || (view === 'index' && link.innerText.toLowerCase() === 'home')) {
            link.classList.remove('text-gray-400');
            link.classList.add('text-white');
        }
    });

    // Toggle Sections (Shared logic)
    const favorites = document.getElementById('favorites-section');
    const movies = document.getElementById('movies-section');
    const series = document.getElementById('series-section');
    const dynamic = document.getElementById('dynamic-section');
    const searchResults = document.getElementById('search-results-section');
    const singleGrid = document.getElementById('videoGrid');
    const hero = document.getElementById('hero-banner');
    const header = document.querySelector('header');

    // If player is active, keep everything hidden regardless of view switch
    if (hasHash && !document.getElementById('player-container')) {
        if (header) header.classList.add('hidden');
        if (favorites) favorites.classList.add('hidden');
        if (movies) movies.classList.add('hidden');
        if (series) series.classList.add('hidden');
        if (dynamic) dynamic.classList.add('hidden');
        return; 
    }

    if (view === 'index') {
        if (header) header.classList.remove('hidden');
        if (favorites) favorites.classList.remove('hidden');
        if (movies) movies.classList.remove('hidden');
        if (series) series.classList.remove('hidden');
        if (dynamic) dynamic.classList.add('hidden');
        if (searchResults) searchResults.classList.add('hidden');
        if (hero) hero.style.display = 'flex';
        
        // Rows in new design
        if (movies && movies.querySelector('.horizontal-scroll')) movies.style.display = 'block';
        if (series && series.querySelector('.horizontal-scroll')) series.style.display = 'block';

        window.themoviedb(`trending/movie/week?language=${getTmdbLanguage()}&page=1`);
        window.themoviedb(`trending/tv/week?language=${getTmdbLanguage()}&page=1`);
    } else {
        if (header) header.classList.remove('hidden');
        if (favorites) favorites.classList.add('hidden');
        if (dynamic) dynamic.classList.remove('hidden');
        if (searchResults) searchResults.classList.remove('hidden');
        if (hero) hero.style.display = 'none';

        // Hide rows in new design
        if (movies && movies.querySelector('.horizontal-scroll')) movies.style.display = 'none';
        if (series && series.querySelector('.horizontal-scroll')) series.style.display = 'none';
        
        // Old design hide
        if (movies && !movies.querySelector('.horizontal-scroll')) movies.classList.add('hidden');
        if (series && !series.querySelector('.horizontal-scroll')) series.classList.add('hidden');

        if (singleGrid) singleGrid.innerHTML = '<div class="text-center py-20 col-span-full text-white"><i class="fas fa-spinner fa-spin text-3xl text-purple-500"></i></div>';
        
        const dynamicTitle = document.getElementById('dynamic-title') || (searchResults ? searchResults.querySelector('.category-title') : null);
        if (dynamicTitle) dynamicTitle.innerText = view === 'movies' ? 'Movies' : 'Series';

        if (view === 'movies') {
            window.themoviedb(`discover/movie`, { params: { sort_by: 'primary_release_date.desc', 'primary_release_date.lte': new Date().toISOString().split('T')[0], with_original_language: 'en', language: getTmdbLanguage(), page: 1 } });
        } else {
            window.themoviedb(`discover/tv`, { params: { sort_by: 'first_air_date.desc', 'first_air_date.lte': new Date().toISOString().split('T')[0], with_original_language: 'en', language: getTmdbLanguage(), page: 1 } });
        }
    }
};

const AD_URL = "https://raw.githubusercontent.com/Himanshuxzx/test/refs/heads/main/document_6183624446532656632.mp4";

// Providers Configuration
const PROVIDERS = [
    { name: "Server 1 (Recommended)", movie: "https://vidrock.net/movie/{id}", tv: "https://vidrock.net/tv/{id}/{s}/{e}" },
    { name: "Server 2 (Ads)", movie: "https://test.autoembed.cc/embed/movie/{id}", tv: "https://test.autoembed.cc/embed/tv/{id}/{s}/{e}" },
    { name: "Server 3", movie: "https://player.videasy.net/movie/{id}", tv: "https://player.videasy.net/tv/{id}/{s}/{e}" },
    { name: "Server 4", movie: "https://moviesapi.club/movie/{id}", tv: "https://moviesapi.club/tv/{id}-{s}-{e}" }
];

let currentProviderIndex = 0;

// Helper to get embed URL
function getEmbedUrl(type, id, s = 1, e = 1) {
    const provider = PROVIDERS[currentProviderIndex];
    let url = type === 'movie' ? provider.movie : provider.tv;
    return url.replace('{id}', id).replace('{s}', s).replace('{e}', e);
}

// Autoplay State
let currentMedia = { type: null, id: null, s: null, e: null, item: null };
let nextMedia = null;
let preloadTriggered = false;

// 1. AGGRESSIVE CSS BLOCKER
(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        video[src*="6183624446532656632"], 
        source[src*="6183624446532656632"],
        .w-full.h-full.object-cover.cursor-pointer[src*="raw.githubusercontent"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            top: -9999px !important;
            left: -9999px !important;
            width: 1px !important;
            height: 1px !important;
        }
    `;
    document.documentElement.appendChild(style);
})();

// 2. LOW-LEVEL API OVERRIDE
(function() {
    const forbidden = "6183624446532656632";
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        if (this.src && this.src.includes(forbidden)) {
            console.warn("Vora MAX: Playback blocked for blacklisted ad.");
            this.pause();
            this.remove();
            return Promise.reject("Blocked Ad");
        }
        return originalPlay.apply(this, arguments);
    };
    const originalLoad = HTMLMediaElement.prototype.load;
    HTMLMediaElement.prototype.load = function() {
        if (this.src && this.src.includes(forbidden)) {
            this.remove();
            return;
        }
        return originalLoad.apply(this, arguments);
    };
    const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        set: function(val) {
            if (val && typeof val === 'string' && val.includes(forbidden)) return;
            originalSrcDescriptor.set.call(this, val);
        },
        get: originalSrcDescriptor.get
    });
})();

// 3. DOM SCANNER
const nukeAds = () => {
    const ads = document.querySelectorAll('video, source, iframe');
    ads.forEach(el => {
        const source = el.src || (el.querySelector('source')?.src) || "";
        if (source.includes("6183624446532656632")) el.remove();
    });
};
setInterval(nukeAds, 1000);
const adObserver = new MutationObserver(nukeAds);
adObserver.observe(document.documentElement, { childList: true, subtree: true });

// Library / Favorites Setup
let library = { likedMedia: [] };
function loadLibrary() {
    const stored = localStorage.getItem('vora_library');
    if (stored) library = JSON.parse(stored);
}
function saveLibrary() {
    localStorage.setItem('vora_library', JSON.stringify(library));
    renderFavorites();
}

function isLiked(id) {
    return library.likedMedia.some(m => m.id === id);
}

function toggleLike(item) {
    const index = library.likedMedia.findIndex(m => m.id === item.id);
    let favorited = false;
    if (index === -1) {
        library.likedMedia.push(item);
        favorited = true;
    } else {
        library.likedMedia.splice(index, 1);
        favorited = false;
    }
    saveLibrary();
    
    document.querySelectorAll(`.fav-trigger[data-id="${item.id}"] i`).forEach(icon => {
        if (favorited) {
            icon.className = 'far fa-star scale-110 opacity-100';
            icon.style.color = '#a855f7'; 
        } else {
            icon.className = 'far fa-star opacity-40';
            icon.style.color = '';
        }
    });

    const btn = document.getElementById('fav-btn-player');
    if (btn) btn.innerHTML = isLiked(item.id) ? '<i class="far fa-star" style="color: #a855f7;"></i>' : '<i class="far fa-star"></i>';
}

// Rendering Logic
function createMediaCard(item) {
    if (!item.poster_path) return null;
    
    // Language Filter: Only English
    if (item.original_language && item.original_language !== 'en') return null;

    const isActuallyMovie = !!item.title || item.media_type === 'movie';
    const isActuallyTV = !!item.name || item.media_type === 'tv';
    if (isMoviePage() && !isActuallyMovie) return null;
    if (isSeriesPage() && !isActuallyTV) return null;

    const title = item.title || item.name;
    const poster = proxyUrl(`https://image.tmdb.org/t/p/w500${item.poster_path}`);
    const effectiveType = isActuallyMovie ? 'movie' : 'tv';
    
    // Improved SPA Check
    const isSPA = window.location.pathname.toLowerCase().includes('vora') || 
                  window.location.pathname.toLowerCase().includes('vora_plus') || 
                  !!document.getElementById('videoGrid') ||
                  !!document.getElementById('moviesGrid');

    const link = isSPA ? '' : (isActuallyMovie ? 'movies.html' : 'series.html');
    const hashValue = isSPA ? `${effectiveType}/${item.id}` : item.id;

    // Use specific card style based on layout
    const isNewDesign = !!document.querySelector('.horizontal-scroll');
    
    if (isNewDesign && !isSearchActive && isIndexPage()) {
        const card = document.createElement('div');
        card.className = 'media-card';
        card.innerHTML = `
            <img src="${poster}" alt="${title}">
            <div class="media-info-overlay">
                <h3 class="font-bold text-sm truncate">${title}</h3>
                <div class="flex items-center gap-2 text-[10px] opacity-80 mt-1">
                    <span>${(item.release_date || item.first_air_date || '').split('-')[0]}</span>
                    <span class="border border-white/40 px-1 rounded-sm">${item.vote_average?.toFixed(1) || 'N/A'}</span>
                </div>
            </div>
        `;
        card.onclick = () => window.location.hash = hashValue;
        return card;
    }

    const card = document.createElement('div');
    card.className = 'video-item group relative overflow-hidden rounded-[22px] border border-white/5 hover:border-purple-500/50 transition-all bg-white/5';
    const isFav = isLiked(item.id);
    const heartClass = isFav ? 'far text-purple-500 scale-110' : 'far opacity-40 group-hover:opacity-100';

    card.innerHTML = `
        <div class="thumbnail-container overflow-hidden rounded-[22px] w-full h-full">
            <img src="${poster}" loading="lazy" class="w-full h-full object-cover rounded-[22px]" onerror="this.closest('.video-item').style.display='none'">
            <a href="${link}#${hashValue}" class="play-overlay">
                <div class="play-btn-circle">
                    <i class="fas fa-play"></i>
                </div>
            </a>
        </div>
        <button class="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/10 hover:scale-110 transition-all fav-trigger z-10" data-id="${item.id}" title="Like">
            <i class="${heartClass} fa-star" ${isFav ? 'style="color: #a855f7 !important;"' : ''}></i>
        </button>
        <div class="absolute bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-white/10 rounded-b-[22px]">
            <h3 class="text-sm truncate mb-1 font-normal" style="color: white !important;">${title}</h3>
            <p class="text-[10px] text-white/60">${formatFullDate(item.release_date || item.first_air_date) || ''}</p>
        </div>
    `;

    card.querySelector('.fav-trigger').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleLike({...item, id: item.id, media_type: effectiveType});
    });
    return card;
}

function createViewAllCard(link) {
    const isSPA = window.location.pathname.toLowerCase().includes('vora') || 
                  window.location.pathname.toLowerCase().includes('vora_plus') || 
                  !!document.getElementById('videoGrid') ||
                  !!document.getElementById('moviesGrid');
    const view = link.includes('movie') ? 'movies' : 'series';
    
    const card = document.createElement('a');
    if (isSPA) {
        card.href = 'javascript:void(0)';
        card.onclick = () => window.switchView(view);
    } else {
        card.href = link;
    }
    
    card.className = 'video-item group flex flex-col items-center justify-center min-h-[300px] border-dashed border-2 border-brand-border hover:border-solid hover:border-accent-purple bg-white/5 hover:bg-white/10 transition-all rounded-[22px] cursor-pointer';
    card.innerHTML = `
        <i class="fas fa-arrow-right text-3xl mb-4 text-accent-purple group-hover:translate-x-2 transition-transform"></i>
        <span class="text-white font-medium">View All</span>
    `;
    return card;
}

function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    const section = document.getElementById('favorites-section');
    if (!grid) return;
    if (library.likedMedia.length === 0) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');
    grid.innerHTML = '';
    library.likedMedia.forEach(item => {
        const card = createMediaCard(item);
        if (card) grid.appendChild(card);
    });
}

async function renderTmdb(res, endpoint) {
    try {
        const data = await res.json();
        let grid;
        if (isIndexPage() && !isSearchActive) {
            grid = endpoint.includes('movie') ? document.getElementById('moviesGrid') : document.getElementById('seriesGrid');
        } else {
            grid = document.getElementById('videoGrid');
        }
        if (!grid || !data.results || (window.location.hash && !document.getElementById('player-container'))) return;
        
        // Only clear grid for the first page
        if (data.page === 1) {
            grid.innerHTML = '';
        } else {
            const viewAll = grid.querySelector('.view-all-card');
            if (viewAll) viewAll.remove();
        }

        const itemsToShow = (isIndexPage() && !isSearchActive && data.page === 1) ? data.results.slice(0, 20) : data.results;
        itemsToShow.forEach(item => {
            const card = createMediaCard(item);
            if (card) grid.appendChild(card);
        });

        // Add 'View All' card ONLY on page 1 of index if we have enough items AND not new design
        const isNewDesign = !!document.querySelector('.horizontal-scroll');
        if (!isNewDesign && isIndexPage() && !isSearchActive && data.page === 1 && data.results.length > 20) {
            const viewAll = createViewAllCard(endpoint.includes('movie') ? 'movies.html' : 'series.html');
            viewAll.classList.add('view-all-card');
            grid.appendChild(viewAll);
        }

        // Update Hero Banner for new design
        if (isNewDesign && isIndexPage() && endpoint.includes('movie') && data.results.length > 0 && data.page === 1) {
            updateHero(data.results[0]);
        }

        isLoading = false;
        if (data.page >= data.total_pages) paginationState.current.hasMore = false;
    } catch (e) {
        console.error("Error rendering TMDB:", e);
        isLoading = false;
    }
}

function updateHero(item) {
    const banner = document.getElementById('hero-banner');
    const title = document.getElementById('hero-title');
    const desc = document.getElementById('hero-desc');
    const playBtn = document.getElementById('hero-play-btn');
    if (!banner || !title || !desc || !playBtn) return;
    
    banner.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    title.textContent = item.title || item.name;
    desc.textContent = item.overview;
    playBtn.onclick = () => window.location.hash = `movie/${item.id}`;
}

// Pagination Logic
let paginationState = {
    movie: { page: 1, hasMore: true, endpoint: 'trending/movie/week' },
    tv: { page: 1, hasMore: true, endpoint: 'trending/tv/week' },
    current: { page: 1, hasMore: true, endpoint: '' } 
};

let isLoading = false;
let isSearchActive = false;

window.addEventListener('scroll', () => {
    if (isLoading || window.location.hash) return;
    
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const clientHeight = window.innerHeight;
    
    if (scrollTop + clientHeight >= scrollHeight - 1200) {
        if (isIndexPage() && !isSearchActive) {
            if (paginationState.movie.hasMore) {
                isLoading = true;
                paginationState.movie.page++;
                window.themoviedb(paginationState.movie.endpoint, { params: { page: paginationState.movie.page, language: getTmdbLanguage() } });
            }
            if (paginationState.tv.hasMore) {
                isLoading = true;
                paginationState.tv.page++;
                window.themoviedb(paginationState.tv.endpoint, { params: { page: paginationState.tv.page, language: getTmdbLanguage() } });
            }
        } else {
            if (paginationState.current.hasMore) {
                isLoading = true;
                paginationState.current.page++;
                window.themoviedb(paginationState.current.endpoint.split('?')[0], { params: { page: paginationState.current.page, language: getTmdbLanguage() } });
            }
        }
    }
});

const originalThemoviedb = themoviedb;
window.themoviedb = async function(a, e, retries = 5) {
    const isPage1 = e?.params?.page === 1 || !e?.params?.page;
    
    if (isIndexPage() && !isSearchActive) {
        const type = a.includes('movie') ? 'movie' : 'tv';
        if (isPage1) {
            paginationState[type].page = 1;
            paginationState[type].hasMore = true;
            paginationState[type].endpoint = a;
        }
    } else {
        if (isPage1) {
            paginationState.current.page = 1;
            paginationState.current.hasMore = true;
            paginationState.current.endpoint = a;
        }
    }

    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            if (window.checkBare) await window.checkBare();
            const res = await originalThemoviedb(a, e);
            if (res && res.ok) {
                if (res.clone) renderTmdb(res.clone(), a);
                return res;
            }
            lastError = new Error(`Status ${res?.status}`);
        } catch (err) {
            lastError = err;
        }
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
    console.error(`Vora: Failed to fetch TMDB after ${retries} attempts:`, lastError);
    isLoading = false;
    return null;
};

async function fetchSeason(id, seasonNum) {
    const res = await originalThemoviedb(`tv/${id}/season/${seasonNum}`, { params: { language: getTmdbLanguage() } });
    return await res.json();
}

async function loadFromHash() {
    let fullHash = window.location.hash.substring(1);
    const header = document.querySelector('header');
    const favorites = document.getElementById('favorites-section');
    const movies = document.getElementById('movies-section');
    const series = document.getElementById('series-section');
    const dynamic = document.getElementById('dynamic-section');
    const playerContainer = document.getElementById('player-container');

    if (!fullHash) {
        if (playerContainer) {
            playerContainer.style.display = 'none';
            document.getElementById('player-frame').src = 'about:blank';
            document.body.style.overflow = 'auto';
        }
        const playerView = document.getElementById('player-view');
        if (playerView) playerView.remove();
        
        if (header) header.classList.remove('hidden');
        if (isIndexPage()) {
            if (favorites) favorites.classList.remove('hidden');
            if (movies) movies.classList.remove('hidden');
            if (series) series.classList.remove('hidden');
            renderFavorites();
        } else {
            if (dynamic) dynamic.classList.remove('hidden');
        }
        return;
    };

    let type, id;
    if (fullHash.includes('/')) {
        const parts = fullHash.split('/');
        type = parts[0];
        id = parts[1];
    } else {
        type = isSeriesPage() ? 'tv' : 'movie';
        id = fullHash;
    }

    // New Design Player
    if (playerContainer) {
        const frame = document.getElementById('player-frame');
        const embedUrl = proxyUrl(getEmbedUrl(type, id));
        frame.src = embedUrl;
        playerContainer.style.display = 'block';
        document.body.style.overflow = 'hidden';
        return;
    }

    // Old Design Player
    if (header) header.classList.add('hidden');
    if (favorites) favorites.classList.add('hidden');
    if (movies) movies.classList.add('hidden');
    if (series) series.classList.add('hidden');
    if (dynamic) dynamic.classList.add('hidden');

    document.querySelectorAll('.video-grid').forEach(g => g.innerHTML = '');
    
    const main = document.querySelector('main');
    let playerView = document.getElementById('player-view');
    if (!playerView) {
        playerView = document.createElement('div');
        playerView.id = 'player-view';
        playerView.className = 'w-full mb-12';
        main.prepend(playerView);
    }
    playerView.innerHTML = `<div class="text-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-purple-500"></i></div>`;
    async function tryLoad(t, currentId) {
        try {
            if (window.checkBare) await window.checkBare();
            const res = await originalThemoviedb(`${t}/${currentId}`, { params: { language: getTmdbLanguage() } });
            if (!res.ok) throw new Error();
            const item = await res.json();
            renderPlayerUI(t, currentId, item);
        } catch (e) {
            if (!fullHash.includes('/') && t === 'movie' && !isSeriesPage()) tryLoad('tv', currentId);
            else playerView.innerHTML = `<div class="text-center py-20 text-white font-normal">Error loading media.</div>`;
        }
    }
    tryLoad(type, id);
}

// Proxy Helper
function proxyUrl(url) {
    if (!url) return url;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    const prefix = "/VORA_PLUS/VERN_SYSTEM/uv/service/";
    const encoder = (window.__uv$config && window.__uv$config.encodeUrl) ? window.__uv$config.encodeUrl : 
                    (typeof Ultraviolet !== 'undefined' ? Ultraviolet.codec.xor.encode : null);
    if (encoder) {
        try {
            const encoded = encoder(url);
            const cleanEncoded = encoded.startsWith('/') ? encoded.substring(1) : encoded;
            return prefix + cleanEncoded;
        } catch (e) {
            console.error("Vora Proxy Encoding Error:", e);
            return url;
        }
    }
    return url;
}

function renderPlayerUI(type, id, item) {
    currentMedia = { type, id, s: 1, e: 1, item };
    preloadTriggered = false;
    nextMedia = null;

    const playerView = document.getElementById('player-view');
    if (!playerView) return; // Silent return if using new design player

    const title = item.title || item.name;
    const embedUrl = proxyUrl(getEmbedUrl(type, id));
    const isFav = isLiked(item.id);
    const starStyle = isFav ? 'style="color: #a855f7 !important;"' : '';
    const heartClass = 'far';
    const sortedSeasons = [...(item.seasons || [])].sort((a, b) => {
        if (a.season_number === 0) return 1;
        if (b.season_number === 0) return -1;
        return a.season_number - b.season_number;
    });
    playerView.innerHTML = `
        <div class="flex flex-col gap-6">
            <div id="video-container" class="relative w-full aspect-video bg-black rounded-[16px] overflow-hidden shadow-2xl border border-brand-border">
                <iframe id="main-player" src="${embedUrl}" class="w-full h-full border-none" allowfullscreen loading="eager"></iframe>
            </div>

            <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-grow flex flex-col gap-2">
                    <label class="text-xs text-gray-500 font-medium ml-1 uppercase">Server / Provider</label>
                    <select id="provider-select" class="bg-[var(--bg-card)] border border-brand-border text-white p-3 rounded-[12px] outline-none focus:border-purple-500 cursor-pointer">
                        ${PROVIDERS.map((p, i) => `<option value="${i}" ${i === currentProviderIndex ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>
                ${type === 'tv' ? `
                <div class="flex-grow flex flex-col gap-2">
                    <label class="text-xs text-gray-500 font-medium ml-1 uppercase">Season</label>
                    <select id="season-select" class="bg-[var(--bg-card)] border border-brand-border text-white p-3 rounded-[12px] outline-none focus:border-purple-500 cursor-pointer">
                        ${sortedSeasons.map(s => `<option value="${s.season_number}" ${s.season_number === 1 ? 'selected' : ''}>Season ${s.season_number}</option>`).join('')}
                    </select>
                </div>
                ` : ''}
            </div>

            <div id="series-controls" class="${type === 'tv' ? '' : 'hidden'} bg-[var(--bg-card)] p-6 rounded-[16px] border border-brand-border flex flex-col gap-4">
                <div id="episode-list" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto pr-2"></div>
            </div>

            <div class="bg-[var(--bg-card)] p-8 rounded-[16px] border border-brand-border shadow-xl">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h2 class="text-3xl text-white mb-2 font-normal">${title}</h2>
                        <p class="text-gray-500 text-sm">${formatFullDate(item.release_date || item.first_air_date) || ''}</p>
                    </div>
                    <button id="fav-btn-player" class="w-12 h-12 flex items-center justify-center rounded-full bg-deep-black border border-brand-border hover:border-purple-500 transition-all text-xl">
                        <i class="${heartClass} fa-star" ${starStyle}></i>
                    </button>
                </div>
                <p class="text-gray-400 leading-relaxed mb-8">${item.overview || 'No description available.'}</p>
                <button onclick="window.location.hash=''; window.location.reload();" class="px-6 py-3 rounded-[12px] bg-deep-black border border-brand-border hover:border-purple-500 text-white text-sm font-medium transition-all">
                    <i class="fas fa-arrow-left"></i> Back to Catalog
                </button>
            </div>
        </div>
    `;
    document.getElementById('fav-btn-player').onclick = () => toggleLike({...item, id: item.id, media_type: type});

    const providerSelect = document.getElementById('provider-select');
    providerSelect.onchange = () => {
        currentProviderIndex = parseInt(providerSelect.value);
        if (type === 'tv') {
            playEpisode(id, currentMedia.s, currentMedia.e);
        } else {
            const player = document.getElementById('main-player');
            player.src = proxyUrl(getEmbedUrl('movie', id));
        }
    };

    if (type === 'tv') {
        const seasonSelect = document.getElementById('season-select');
        seasonSelect.onchange = async () => {
            const seasonData = await fetchSeason(id, seasonSelect.value);
            const epList = document.getElementById('episode-list');
            epList.innerHTML = seasonData.episodes.map(ep => `
                <button onclick="playEpisode('${id}', ${seasonSelect.value}, ${ep.episode_number})" class="p-2 bg-deep-black border border-brand-border rounded-lg text-xs hover:border-accent-red transition-all truncate text-left text-white text-normal ep-btn" data-ep="${ep.episode_number}">
                    Ep ${ep.episode_number}: ${ep.name}
                </button>
            `).join('');
            findNextEpisode();
            if (parseInt(seasonSelect.value) === currentMedia.s) {
                document.querySelectorAll('.ep-btn').forEach(btn => {
                    if (parseInt(btn.getAttribute('data-ep')) === currentMedia.e) {
                        btn.classList.add('border-purple-500', 'bg-purple-500/10');
                    }
                });
            }
        };
        seasonSelect.dispatchEvent(new Event('change'));
    }
}

window.playEpisode = function(id, s, e) {
    currentMedia.s = parseInt(s);
    currentMedia.e = parseInt(e);
    preloadTriggered = false;
    const player = document.getElementById('main-player');
    if (player) player.src = proxyUrl(getEmbedUrl('tv', id, s, e));
    const oldNext = document.getElementById('next-player');
    if (oldNext) oldNext.remove();
    document.querySelectorAll('.ep-btn').forEach(btn => {
        if (parseInt(btn.getAttribute('data-ep')) === currentMedia.e) {
            btn.classList.add('border-purple-500', 'bg-purple-500/10');
        } else {
            btn.classList.remove('border-purple-500', 'bg-purple-500/10');
        }
    });
    findNextEpisode();
};

async function findNextEpisode() {
    if (currentMedia.type !== 'tv') return;
    const { id, s, e, item } = currentMedia;
    try {
        const seasonData = await fetchSeason(id, s);
        const nextEp = seasonData.episodes.find(ep => ep.episode_number === e + 1);
        if (nextEp) {
            nextMedia = { id, s, e: e + 1 };
        } else {
            const sortedSeasons = [...(item.seasons || [])]
                .filter(sea => sea.season_number > 0)
                .sort((a, b) => a.season_number - b.season_number);
            const nextSeason = sortedSeasons.find(sea => sea.season_number > s);
            if (nextSeason) {
                nextMedia = { id, s: nextSeason.season_number, e: 1 };
            } else {
                nextMedia = null;
            }
        }
    } catch (err) {
        console.error("Error finding next episode:", err);
    }
}

function preloadNext() {
    if (!nextMedia) return;
    const container = document.getElementById('video-container');
    if (!container) return;
    let nextPlayer = document.getElementById('next-player');
    if (nextPlayer) nextPlayer.remove();
    nextPlayer = document.createElement('iframe');
    nextPlayer.id = 'next-player';
    nextPlayer.className = 'w-full h-full border-none absolute top-0 left-0 hidden';
    nextPlayer.allowFullscreen = true;
    container.appendChild(nextPlayer);
    nextPlayer.src = proxyUrl(getEmbedUrl('tv', nextMedia.id, nextMedia.s, nextMedia.e));
    nextPlayer.onload = () => {
        try {
            const doc = nextPlayer.contentDocument || nextPlayer.contentWindow.document;
            const video = doc.querySelector('video');
            if (video) {
                video.muted = true;
                video.play().catch(() => {});
                if (window.Hls) {
                    Hls.DefaultConfig.maxBufferLength = 60;
                    Hls.DefaultConfig.maxMaxBufferLength = 600;
                }
            }
        } catch (e) {}
    };
}

function swapPlayers() {
    const main = document.getElementById('main-player');
    const next = document.getElementById('next-player');
    if (!main || !next || !next.src || next.src === 'about:blank') return;
    main.id = 'old-player';
    next.id = 'main-player';
    main.classList.add('hidden');
    next.classList.remove('hidden');
    try {
        const doc = next.contentDocument || next.contentWindow.document;
        const video = doc.querySelector('video');
        if (video) {
            video.muted = false;
            video.play().catch(() => {});
        }
    } catch (e) {}
    currentMedia.s = nextMedia.s;
    currentMedia.e = nextMedia.e;
    preloadTriggered = false;
    setTimeout(() => main.remove(), 1000); 
    findNextEpisode();
}

setInterval(() => {
    const main = document.getElementById('main-player');
    if (!main) return;
    try {
        const doc = main.contentDocument || main.contentWindow.document;
        const video = doc.querySelector('video');
        if (video) {
            if (!video.hlsFixed && (window.Hls || doc.defaultView.Hls)) {
                const HlsRef = window.Hls || doc.defaultView.Hls;
                HlsRef.DefaultConfig.maxBufferLength = 60;
                HlsRef.DefaultConfig.maxMaxBufferLength = 600;
                video.hlsFixed = true;
            }
            const remaining = video.duration - video.currentTime;
            if (remaining <= 10 && remaining > 0 && !preloadTriggered && nextMedia) {
                preloadTriggered = true;
                preloadNext();
            }
            if (video.ended || (remaining < 0.5 && remaining > 0 && preloadTriggered)) {
                swapPlayers();
            }
        }
    } catch (e) {}
}, 500);

function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    isSearchActive = true;
    
    // Hide all normal sections
    document.getElementById('movies-section')?.classList.add('hidden');
    document.getElementById('series-section')?.classList.add('hidden');
    document.getElementById('favorites-section')?.classList.add('hidden');
    document.getElementById('hero-banner') && (document.getElementById('hero-banner').style.display = 'none');
    
    // New design search section
    const searchSection = document.getElementById('search-results-section');
    if (searchSection) searchSection.classList.remove('hidden');

    const dynamic = document.getElementById('dynamic-section');
    if (dynamic) dynamic.classList.remove('hidden');

    const grid = document.getElementById('videoGrid');
    if (grid) grid.innerHTML = '<div class="text-center py-20 col-span-full text-white"><i class="fas fa-spinner fa-spin text-3xl text-purple-500"></i></div>';
    
    const isSPA = window.location.pathname.toLowerCase().includes('vora');
    if (!isSPA) window.location.hash = ''; 

    let endpoint = isMoviePage() ? 'search/movie' : (isSeriesPage() ? 'search/tv' : 'search/multi');
    window.themoviedb(endpoint, { params: { query: query, language: 'en-US' } });
}

window.loadVoraContent = function() {
    if (window.location.hash) {
        loadFromHash();
    } else {
        const isSPA = window.location.pathname.toLowerCase().includes('vora');
        if (isSPA && isIndexPage() && !!document.querySelector('.horizontal-scroll')) {
            // New design index - fetch trending
            window.themoviedb(`trending/movie/week?language=${getTmdbLanguage()}&page=1`);
            window.themoviedb(`trending/tv/week?language=${getTmdbLanguage()}&page=1`);
            return;
        }
        if (isSPA && !isIndexPage()) {
             // Let switchView or page logic handle it
        } else if (isIndexPage()) {
            window.themoviedb(`trending/movie/week?language=${getTmdbLanguage()}&page=1`);
            window.themoviedb(`trending/tv/week?language=${getTmdbLanguage()}&page=1`);
        } else if (isMoviePage()) {
            window.themoviedb(`discover/movie`, { params: { sort_by: 'primary_release_date.desc', 'primary_release_date.lte': new Date().toISOString().split('T')[0], with_original_language: 'en', language: getTmdbLanguage(), page: 1 } });
        } else if (isSeriesPage()) {
            window.themoviedb(`discover/tv`, { params: { sort_by: 'first_air_date.desc', 'first_air_date.lte': new Date().toISOString().split('T')[0], with_original_language: 'en', language: getTmdbLanguage(), page: 1 } });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    renderFavorites();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
        const searchIcon = searchInput.previousElementSibling;
        if (searchIcon && searchIcon.classList.contains('fa-search')) {
            searchIcon.style.cursor = 'pointer';
            searchIcon.onclick = performSearch;
        }
    }
    window.loadVoraContent();
});

window.addEventListener('hashchange', loadFromHash);