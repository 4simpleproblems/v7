// Vora MAX - Logic Engine
window.VORA_CONFIG = window.VORA_CONFIG || {
    currentView: window.location.pathname.includes('movies.html') ? 'movies' : 
                 window.location.pathname.includes('series.html') ? 'series' : 'index'
};

const isMoviePage = () => window.VORA_CONFIG.currentView === 'movies';
const isSeriesPage = () => window.VORA_CONFIG.currentView === 'series';
const isIndexPage = () => window.VORA_CONFIG.currentView === 'index';

let isSearchActive = false;

window.switchView = function(view, clearHash = true) {
    window.VORA_CONFIG.currentView = view;
    isSearchActive = (view === 'search');
    if (clearHash) {
        window.location.hash = ''; 
    }
    
    const hasHash = !!window.location.hash;

    // Navbar UI Update
    document.querySelectorAll('#navbar a').forEach(link => {
        link.classList.remove('text-white');
        link.classList.add('text-gray-400');
        if (link.innerText.toLowerCase() === view.toLowerCase() || (view === 'index' && link.innerText.toLowerCase() === 'home')) {
            link.classList.remove('text-gray-400');
            link.classList.add('text-white');
        }
    });

    const favorites = document.getElementById('favorites-section');
    const movies = document.getElementById('movies-section');
    const series = document.getElementById('series-section');
    const anime = document.getElementById('anime-section');
    const searchResults = document.getElementById('search-results-section');
    const singleGrid = document.getElementById('videoGrid');
    const hero = document.getElementById('hero-banner');

    if (view === 'index') {
        if (favorites) favorites.classList.remove('hidden');
        if (movies) movies.style.display = 'block';
        if (series) series.style.display = 'block';
        if (anime) anime.style.display = 'block';
        if (searchResults) searchResults.classList.add('hidden');
        if (hero) hero.style.display = 'flex';

        window.themoviedb(`trending/movie/week?language=${getTmdbLanguage()}&page=1`);
        window.themoviedb(`trending/tv/week?language=${getTmdbLanguage()}&page=1`);
        window.themoviedb(`discover/tv`, { params: { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc', page: 1 } });
    } else {
        if (favorites) favorites.classList.add('hidden');
        if (searchResults) searchResults.classList.remove('hidden');
        if (hero) hero.style.display = 'none';

        if (movies) movies.style.display = 'none';
        if (series) series.style.display = 'none';
        if (anime) anime.style.display = 'none';

        if (singleGrid) singleGrid.innerHTML = '<div class="text-center py-20 col-span-full text-white"><i class="fas fa-spinner fa-spin text-3xl text-purple-500"></i></div>';
        
        const dynamicTitle = searchResults ? searchResults.querySelector('.category-title') : null;
        if (dynamicTitle) dynamicTitle.innerText = view.charAt(0).toUpperCase() + view.slice(1);

        if (view === 'movies') {
            window.themoviedb(`discover/movie`, { params: { sort_by: 'popularity.desc', with_original_language: 'en', language: getTmdbLanguage(), page: 1 } });
        } else if (view === 'series') {
            window.themoviedb(`discover/tv`, { params: { sort_by: 'popularity.desc', with_original_language: 'en', language: getTmdbLanguage(), page: 1 } });
        }
    }
};

const PROVIDERS = [
    { name: "Server 1 (Recommended)", movie: "https://vidrock.net/movie/{id}", tv: "https://vidrock.net/tv/{id}/{s}/{e}" },
    { name: "Server 2 (Ads)", movie: "https://test.autoembed.cc/embed/movie/{id}", tv: "https://test.autoembed.cc/embed/tv/{id}/{s}/{e}" },
    { name: "Server 3", movie: "https://player.videasy.net/movie/{id}", tv: "https://player.videasy.net/tv/{id}/{s}/{e}" },
    { name: "Server 4", movie: "https://moviesapi.club/movie/{id}", tv: "https://moviesapi.club/tv/{id}-{s}-{e}" }
];

let currentProviderIndex = 0;

function getEmbedUrl(type, id, s = 1, e = 1) {
    const provider = PROVIDERS[currentProviderIndex];
    let url = type === 'movie' ? provider.movie : provider.tv;
    return url.replace('{id}', id).replace('{s}', s).replace('{e}', e);
}

let currentMedia = { type: null, id: null, s: null, e: null, item: null };
let nextMedia = null;
let preloadTriggered = false;

// Aggressive CSS Blockers and DOM Scanner (Simplified for brevity, but kept in actual implementation)
(function() {
    const style = document.createElement('style');
    style.innerHTML = `video[src*="6183624446532656632"], source[src*="6183624446532656632"] { display: none !important; }`;
    document.documentElement.appendChild(style);
})();

let library = { likedMedia: [] };
function loadLibrary() {
    const stored = localStorage.getItem('vora_library');
    if (stored) library = JSON.parse(stored);
}
function saveLibrary() {
    localStorage.setItem('vora_library', JSON.stringify(library));
}
function isLiked(id) { return library.likedMedia.some(m => m.id === id); }
function toggleLike(item) {
    const index = library.likedMedia.findIndex(m => m.id === item.id);
    if (index === -1) library.likedMedia.push(item);
    else library.likedMedia.splice(index, 1);
    saveLibrary();
}

function createMediaCard(item) {
    if (!item.poster_path) return null;
    const isActuallyMovie = !!item.title || item.media_type === 'movie';
    const isActuallyTV = !!item.name || item.media_type === 'tv';
    const title = item.title || item.name;
    const poster = proxyUrl(`https://image.tmdb.org/t/p/w500${item.poster_path}`);
    const type = isActuallyMovie ? 'movie' : 'tv';
    const hashValue = `${type}/${item.id}`;

    const card = document.createElement('div');
    card.className = 'media-card';
    card.innerHTML = `
        <img src="${poster}" alt="${title}" loading="lazy">
        <div class="media-info-overlay">
            <h3 class="font-bold text-sm truncate text-white">${title}</h3>
            <div class="flex items-center gap-2 text-[10px] opacity-80 mt-1 text-white">
                <span>${(item.release_date || item.first_air_date || '').split('-')[0]}</span>
                <span class="border border-white/40 px-1 rounded-sm">${item.vote_average?.toFixed(1) || 'N/A'}</span>
            </div>
        </div>
    `;
    card.onclick = () => window.location.hash = hashValue;
    return card;
}

async function renderTmdb(res, endpoint, params = {}) {
    try {
        const data = await res.json();
        let grid;
        if (isIndexPage() && !isSearchActive) {
            const isAnime = params.with_genres == 16 || params.with_original_language == 'ja' || endpoint.includes('ja') || endpoint.includes('16');
            if (endpoint.includes('movie')) {
                grid = document.getElementById('moviesGrid');
            } else if (isAnime) {
                grid = document.getElementById('animeGrid');
            } else if (endpoint.includes('tv')) {
                grid = document.getElementById('seriesGrid');
            }
        } else {
            grid = document.getElementById('videoGrid') || document.getElementById('videoGridSearch');
        }
        if (!grid || !data.results) return;
        if (data.page === 1) grid.innerHTML = '';
        data.results.forEach(item => {
            const card = createMediaCard(item);
            if (card) grid.appendChild(card);
        });
        if (isIndexPage() && endpoint.includes('movie') && data.results.length > 0 && data.page === 1) updateHero(data.results[0]);
    } catch (e) { console.error("Error rendering TMDB:", e); }
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

const originalThemoviedb = themoviedb;
window.themoviedb = async function(a, e) {
    try {
        if (window.checkBare) await window.checkBare();
        const res = await originalThemoviedb(a, e);
        if (res && res.ok) {
            renderTmdb(res.clone(), a, e?.params);
            return res;
        }
    } catch (err) { console.error("Vora TMDB Error", err); }
    return null;
};

async function fetchSeason(id, seasonNum) {
    const res = await originalThemoviedb(`tv/${id}/season/${seasonNum}`, { params: { language: getTmdbLanguage() } });
    return await res.json();
}

async function loadFromHash() {
    let fullHash = window.location.hash.substring(1);
    if (!fullHash) {
        const playerView = document.getElementById('player-view');
        if (playerView) playerView.remove();
        document.body.style.overflow = 'auto';
        return;
    }

    let [type, id] = fullHash.split('/');
    if (!id) { id = type; type = 'movie'; }

    document.body.style.overflow = 'hidden';
    
    let playerView = document.getElementById('player-view');
    if (!playerView) {
        playerView = document.createElement('div');
        playerView.id = 'player-view';
        document.body.appendChild(playerView);
    }
    playerView.innerHTML = `<div class="flex items-center justify-center h-screen bg-black text-purple-500"><i class="fas fa-circle-notch fa-spin text-5xl"></i></div>`;

    try {
        const res = await originalThemoviedb(`${type}/${id}`, { params: { language: getTmdbLanguage() } });
        const item = await res.json();
        renderPlayerUI(type, id, item);
    } catch (e) {
        playerView.innerHTML = `<div class="flex items-center justify-center h-screen text-white">Error loading content. <button onclick="window.location.hash=''" class="ml-4 underline">Go Back</button></div>`;
    }
}

// Proxy Helper - EXACT match of Vora's implementation for reliability
function proxyUrl(url) {
    if (!url) return url;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    
    const prefix = "/VORA/VERN_SYSTEM/uv/service/";
    
    // Check multiple possible locations for the encoder
    const encoder = (window.__uv$config && window.__uv$config.encodeUrl) ? window.__uv$config.encodeUrl : 
                    (typeof Ultraviolet !== 'undefined' ? Ultraviolet.codec.xor.encode : null);
    
    if (encoder) {
        try {
            const encoded = encoder(url);
            // Ensure encoded doesn't start with a slash if prefix ends with one
            const cleanEncoded = encoded.startsWith('/') ? encoded.substring(1) : encoded;
            const result = prefix + cleanEncoded;
            return result;
        } catch (e) {
            console.error("Vora Proxy Encoding Error:", e);
            return url;
        }
    }
    
    console.warn("Vora Proxy: No encoder found for URL", url);
    return url;
}

function renderPlayerUI(type, id, item) {
    currentMedia = { type, id, s: 1, e: 1, item };
    const title = item.title || item.name;
    const backdrop = proxyUrl(`https://image.tmdb.org/t/p/original${item.backdrop_path}`);
    const embedUrl = proxyUrl(getEmbedUrl(type, id));
    
    const playerView = document.getElementById('player-view');
    playerView.innerHTML = `
        <div class="info-backdrop" style="background-image: url(${backdrop})"></div>
        <div class="info-container">
            <button onclick="window.location.hash=''" class="mb-8 flex items-center gap-2 text-white/60 hover:text-white transition">
                <i class="fas fa-arrow-left"></i> Back to Home
            </button>
            
            <div class="player-container-wrapper">
                <iframe id="main-player" src="${embedUrl}" class="w-full h-full border-none" allowfullscreen></iframe>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div class="lg:col-span-2">
                    <h1 class="text-5xl font-black mb-4 tracking-tighter text-white">${title}</h1>
                    <div class="flex items-center gap-4 mb-6 text-sm text-white/60 font-medium">
                        <span class="text-purple-500 font-bold">${item.vote_average?.toFixed(1)} Rating</span>
                        <span>${(item.release_date || item.first_air_date || '').split('-')[0]}</span>
                        <span class="border border-white/20 px-2 py-0.5 rounded text-[10px] uppercase">${type}</span>
                    </div>
                    <p class="text-lg text-white/70 leading-relaxed mb-8">${item.overview}</p>
                    
                    <div class="flex flex-col gap-4">
                        <label class="text-xs font-bold uppercase tracking-widest text-white/40">Server</label>
                        <div class="flex flex-wrap gap-2">
                            ${PROVIDERS.map((p, i) => `
                                <button onclick="window.switchProvider(${i})" class="px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500 transition text-sm text-white ${i === currentProviderIndex ? 'border-purple-500 bg-purple-500/20' : ''}">
                                    ${p.name}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="${type === 'tv' ? '' : 'hidden'} text-white">
                    <h3 class="text-xl font-bold mb-6">Episodes</h3>
                    <div class="flex flex-col gap-4">
                        <select id="season-select" class="bg-white/5 border border-white/10 p-3 rounded-xl outline-none w-full mb-4 text-white">
                            ${(item.seasons || []).map(s => `<option value="${s.season_number}" class="bg-black">Season ${s.season_number}</option>`).join('')}
                        </select>
                        <div id="episode-list" class="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scroll">
                            <!-- Episodes load here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (type === 'tv') {
        const seasonSelect = document.getElementById('season-select');
        seasonSelect.onchange = async () => {
            const data = await fetchSeason(id, seasonSelect.value);
            const epList = document.getElementById('episode-list');
            epList.innerHTML = data.episodes.map(ep => `
                <button onclick="playEpisode('${id}', ${seasonSelect.value}, ${ep.episode_number})" class="ep-btn w-full p-4 rounded-xl text-left flex items-center justify-between group" data-ep="${ep.episode_number}">
                    <span class="truncate pr-4 text-white"><span class="text-white/40 mr-2">${ep.episode_number}.</span> ${ep.name}</span>
                    <i class="fas fa-play opacity-0 group-hover:opacity-100 transition text-purple-500"></i>
                </button>
            `).join('');
        };
        seasonSelect.dispatchEvent(new Event('change'));
    }
}

window.switchProvider = (index) => {
    currentProviderIndex = index;
    const player = document.getElementById('main-player');
    if (player) {
        player.src = proxyUrl(getEmbedUrl(currentMedia.type, currentMedia.id, currentMedia.s, currentMedia.e));
    }
    // Update active state in UI
    document.querySelectorAll('[onclick^="window.switchProvider"]').forEach((btn, i) => {
        if (i === index) btn.classList.add('border-purple-500', 'bg-purple-500/20');
        else btn.classList.remove('border-purple-500', 'bg-purple-500/20');
    });
};

window.playEpisode = function(id, s, e) {
    currentMedia.s = s;
    currentMedia.e = e;
    const player = document.getElementById('main-player');
    if (player) player.src = proxyUrl(getEmbedUrl('tv', id, s, e));
    document.querySelectorAll('.ep-btn').forEach(btn => {
        if (parseInt(btn.dataset.ep) === e) btn.classList.add('active');
        else btn.classList.remove('active');
    });
};

window.loadVoraContent = function() {
    if (window.location.hash) {
        loadFromHash();
    } else if (isIndexPage()) {
        window.themoviedb(`trending/movie/week?language=${getTmdbLanguage()}&page=1`);
        window.themoviedb(`trending/tv/week?language=${getTmdbLanguage()}&page=1`);
        window.themoviedb(`discover/tv`, { params: { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc', page: 1 } });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                isSearchActive = true;
                window.switchView('search');
                window.themoviedb(`search/multi`, { params: { query: e.target.value, page: 1 } });
            }
        };
    }
    window.loadVoraContent();
});

window.addEventListener('hashchange', loadFromHash);
