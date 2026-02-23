const API_BASE_URL = '/music-api';

function getDownloadUrl(item) {
    if (item.source === 'MusicAPI' && item.downloadUrl?.[0]?.link) {
        return getProxyUrl(item.downloadUrl[0].link);
    }
    
    let url = '';
    // 1. Check direct downloadUrl array
    if (item.downloadUrl) { 
        if (Array.isArray(item.downloadUrl) && item.downloadUrl.length > 0) { 
            const b = item.downloadUrl.find(d => d.quality === '320kbps') || item.downloadUrl.find(d => d.quality === '160kbps') || item.downloadUrl[item.downloadUrl.length - 1]; 
            url = b.link || b.url;
        } else if (typeof item.downloadUrl === 'string') {
            url = item.downloadUrl;
        }
    }
    
    // 2. Fallback to extracting from object or using Argon proxy
    if (!url) { 
        const p = item.url || (item.song && item.song.url); 
        if (p) { 
            if (typeof p === 'string' && (p.includes('saavncdn.com') || p.match(/\.(mp3|mp4|m4a)$/i))) {
                url = p; 
            } else if (Array.isArray(p)) { 
                const b = p.find(d => d.quality === '320kbps') || p[p.length - 1]; 
                url = b.link || b.url;
            } else {
                url = `https://argon.global.ssl.fastly.net/api/download?track_url=${encodeURIComponent(p)}`; 
            }
        } 
    }
    
    if (!url && item.media_url) url = item.media_url;

    if (!url) return '';

    return getProxyUrl(url);
}

// --- Proxy Helper ---
function getProxyUrl(url) {
    if (!url) return url;
    if (typeof url !== 'string') return url;
    if (url.startsWith('data:')) return url;
    if (url.startsWith('//')) url = 'https:' + url;
    
    // Check if it's already proxied
    const prefix = "/VELIUM/uv/service/";
    if (url.includes(prefix)) return url;

    let encoded = null;

    // 1. Try direct encoding if Ultraviolet is fully ready
    if (window.Ultraviolet && window.Ultraviolet.codec && window.Ultraviolet.codec.xor) {
        try {
            encoded = window.Ultraviolet.codec.xor.encode(url);
        } catch (e) {
            console.error("Direct UV encoding failed", e);
        }
    }
    
    // 2. Fallback to config wrapper
    if (!encoded && window.__uv$config && window.__uv$config.encodeUrl) {
        try {
            const result = window.__uv$config.encodeUrl(url);
            if (result !== url) {
                encoded = result;
            }
        } catch (e) {
            console.error("Config encoding failed", e);
        }
    }

    // 3. Final assembly
    if (encoded) {
        if (encoded.startsWith('http')) return encoded; // Already a full URL
        const cleanEncoded = encoded.startsWith(prefix) ? encoded.slice(prefix.length) : encoded;
        return window.location.origin + prefix + cleanEncoded;
    }
    
    // If we failed to encode, return the original URL
    return url;
}

// --- State ---
let currentTrack = null;
let playlist = [];
let originalPlaylist = [];
let shuffledIndices = [];
let shuffledCurrentIndex = 0;
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 'off';
let favorites = []; // Loaded in initApp
let playlists = []; // Loaded in initApp
let player = null;
let progressInterval = null;
let volume = parseInt(localStorage.getItem('velium_v2_volume')) || 70;

const popularArtists = [
    'The Weeknd', 'Drake', 'Post Malone', 'Dua Lipa', 'Ed Sheeran', 
    'Ariana Grande', 'Travis Scott', 'Olivia Rodrigo', 'Bad Bunny', 'SZA'
];

// --- Helpers ---
function getTrackUid(track) {
    if (!track) return null;
    // Prefer unique ID if available and looks valid (not a generic one)
    if (track.id && !track.id.includes('gen-') && !track.id.includes('generated-')) {
        return track.id;
    }
    // Fallback to a normalized combination of title and artist
    return `${track.title?.trim()}-${track.artist_name?.trim()}`.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// --- Shuffle Algorithm ---
function generateShuffledSequence() {
    if (playlist.length === 0) return;
    let indices = playlist.map((_, i) => i);
    const currentPos = indices.indexOf(currentIndex);
    if (currentPos > -1) indices.splice(currentPos, 1);
    
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    // Cluster prevention
    for (let i = 0; i < indices.length - 1; i++) {
        if (playlist[indices[i]].artist_name === playlist[indices[i+1]].artist_name) {
            for (let j = i + 2; j < indices.length; j++) {
                if (playlist[indices[j]].artist_name !== playlist[indices[i]].artist_name) {
                    [indices[i+1], indices[j]] = [indices[j], indices[i+1]];
                    break;
                }
            }
        }
    }
    shuffledIndices = [currentIndex, ...indices];
    shuffledCurrentIndex = 0;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => initApp());
        setTimeout(() => { if (!currentTrack && playlist.length === 0) initApp(); }, 2000);
    } else {
        initApp();
    }
});

async function initApp() {
    await loadLibraryData();
    setGreeting();
    setupEventListeners();
    loadPopularTracks();
    renderSidebarPlaylists();
    renderLibrary();
    updateVolumeUI();

    // Admin Logic
    if (window.isAdmin) {
        const adminTab = document.getElementById('admin-test-tab');
        if (adminTab) adminTab.classList.remove('hidden');
    }
}

function setupEventListeners() {
    // Nav View Switching
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            if (view) switchView(view);
        });
    });

    // Search Input
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            if (query) {
                searchTimeout = setTimeout(() => handleSearch(query, false), 500);
            } else {
                document.getElementById('searchResults').classList.add('hidden');
                document.getElementById('browseCategories').classList.remove('hidden');
            }
        });
    }

    // Load More
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => handleSearch(searchState.query, true));
    }

    // Player Controls
    document.getElementById('playPauseButton').addEventListener('click', togglePlayPause);
    document.getElementById('nextButton').addEventListener('click', playNext);
    document.getElementById('prevButton').addEventListener('click', playPrev);
    document.getElementById('shuffleButton').addEventListener('click', toggleShuffle);
    document.getElementById('repeatButton').addEventListener('click', cycleRepeat);
    document.getElementById('likeButton').addEventListener('click', toggleLike);

    // Progress Bar
    const progressTrack = document.getElementById('progressTrack');
    if (progressTrack) {
        progressTrack.addEventListener('click', (e) => {
            const rect = progressTrack.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            if (activeSource === 'audio') {
                const audio = document.getElementById('nativeAudio');
                if (audio && audio.duration) audio.currentTime = audio.duration * percent;
            } else if (player && typeof player.getDuration === 'function') {
                player.seekTo(player.getDuration() * percent);
            }
        });
    }

    // Volume
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            volume = parseInt(e.target.value);
            if (activeSource === 'audio') {
                const audio = document.getElementById('nativeAudio');
                if (audio) audio.volume = volume / 100;
            } else if (player && typeof player.setVolume === 'function') {
                player.setVolume(volume);
            }
            document.getElementById('volumeBarFill').style.width = volume + '%';
            saveToStorage('volume', volume);
        });
    }

    // Modals
    document.querySelector('.create-playlist-btn').addEventListener('click', showCreatePlaylistModal);
    document.getElementById('savePlaylistBtn').addEventListener('click', () => {
        createPlaylist(document.getElementById('playlistNameInput').value.trim(), document.getElementById('playlistDescInput').value.trim());
    });
    document.getElementById('confirmImportPlaylistBtn').addEventListener('click', importYoutubePlaylist);
    document.getElementById('confirmEditPlaylistBtn').addEventListener('click', confirmEditPlaylist);
    document.getElementById('savePlaylistCoverBtn').addEventListener('click', savePlaylistCover);

    // Fullscreen
    document.getElementById('fsPlayPause').addEventListener('click', togglePlayPause);
    document.getElementById('fsNext').addEventListener('click', playNext);
    document.getElementById('fsPrev').addEventListener('click', playPrev);
    document.getElementById('fsShuffle').addEventListener('click', toggleShuffle);
    document.getElementById('fsRepeat').addEventListener('click', cycleRepeat);

    const fsProgressTrack = document.getElementById('fsProgressTrack');
    if (fsProgressTrack) {
        fsProgressTrack.addEventListener('click', (e) => {
            const rect = fsProgressTrack.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            if (activeSource === 'audio') {
                const audio = document.getElementById('nativeAudio');
                if (audio && audio.duration) audio.currentTime = audio.duration * percent;
            } else if (player && typeof player.getDuration === 'function') {
                player.seekTo(player.getDuration() * percent);
            }
        });
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            const fs = document.getElementById('fullscreenPlayer');
            if (fs && !fs.classList.contains('hidden')) {
                fs.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }
    });

    // Sidebar Toggle
    const sidebarToggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const appContainer = document.querySelector('.app-container');
    if (sidebarToggleBtn && sidebar && appContainer) {
        sidebarToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });
        appContainer.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !sidebarToggleBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }
}

// --- View Logic ---
window.toggleFullscreenPlayer = function() {
    const fs = document.getElementById('fullscreenPlayer');
    if (!fs) return;
    if (fs.classList.contains('hidden')) {
        fs.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
        updateFullscreenUI();
    } else {
        fs.classList.add('hidden');
        document.body.style.overflow = '';
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
};

function updateFullscreenUI() {
    if (!currentTrack) return;
    document.getElementById('fsTrackName').textContent = currentTrack.title;
    document.getElementById('fsArtistName').textContent = currentTrack.artist_name;
    const artworkUrl = getProxyUrl(currentTrack.artwork_url);
    document.getElementById('fsArtwork').src = artworkUrl;
    
    const bg = document.getElementById('fsBackground');
    if (bg) { bg.style.backgroundImage = `url('${artworkUrl}')`; bg.style.backgroundSize = 'cover'; bg.style.backgroundPosition = 'center'; }
    updateFullscreenTint(artworkUrl);
    
    document.getElementById('fsShuffle').classList.toggle('active', isShuffle);
    const fsRepeat = document.getElementById('fsRepeat');
    fsRepeat.classList.toggle('active', repeatMode !== 'off');
    fsRepeat.innerHTML = repeatMode === 'one' ? '<i class="fas fa-repeat"></i><span class="absolute text-[8px] font-bold mt-1 ml-1">1</span>' : '<i class="fas fa-repeat"></i>';
    const fsPlayBtn = document.getElementById('fsPlayPause');
    if (fsPlayBtn) fsPlayBtn.innerHTML = isPlaying ? '<i class="fas fa-pause text-xl"></i>' : '<i class="fas fa-play text-xl"></i>';
}

function updateFullscreenTint(imageUrl) {
    const fs = document.getElementById('fullscreenPlayer');
    if (!fs || !imageUrl) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1; canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        let tintColor, progressBg;
        if (brightness < 160) {
            tintColor = 'rgba(255, 255, 255, 1)';
            progressBg = 'rgba(255, 255, 255, 0.2)';
        } else {
            const factor = 0.1;
            tintColor = `rgba(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)}, 1)`;
            progressBg = `rgba(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)}, 0.2)`;
        }
        fs.style.setProperty('--tint-color', tintColor);
        fs.style.setProperty('--progress-bg', progressBg);
    };
}

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const targetView = document.getElementById(viewName + 'View');
    if (targetView) targetView.classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (navItem) navItem.classList.add('active');
    if (viewName === 'favorites') renderFavorites();
    if (viewName === 'library') renderLibrary();
}

function setGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    const el = document.getElementById('greetingText');
    if (el) el.textContent = greeting;
}

// --- Data Fetching ---
async function loadPopularTracks() {
    const grid = document.getElementById('popularTracks');
    if (!grid) return;
    try {
        const randomArtist = popularArtists[Math.floor(Math.random() * popularArtists.length)];
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(randomArtist)}`);
        const data = await response.json();
        if (data.tracks) renderTrackGrid(data.tracks.slice(0, 6), grid);
    } catch (e) { console.error('Failed to load popular tracks', e); }
}

let searchState = { query: '', tracksOffset: 0, loading: false, hasMoreTracks: true, limit: 24 };

async function handleSearch(query, append = false) {
    const resultsDiv = document.getElementById('searchResults');
    const categoriesDiv = document.getElementById('browseCategories');
    const tracksGrid = document.getElementById('searchGrid');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (!query || query.trim() === '') {
        if (resultsDiv) resultsDiv.classList.add('hidden');
        if (categoriesDiv) categoriesDiv.classList.remove('hidden');
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        searchState.query = '';
        return;
    }

    if (!append || query !== searchState.query) {
        searchState = { query: query, tracksOffset: 0, loading: false, hasMoreTracks: true, limit: 24 };
        if (tracksGrid) tracksGrid.innerHTML = '';
    }
    
    if (searchState.loading) return;
    searchState.loading = true;
    if (loadMoreBtn) loadMoreBtn.classList.add('hidden');

    resultsDiv.classList.remove('hidden');
    categoriesDiv.classList.add('hidden');

    if (!append && tracksGrid) {
        tracksGrid.innerHTML = '<div class="col-span-full py-20 flex justify-center"><i class="fas fa-circle-notch fa-spin text-3xl text-accent-indigo"></i></div>';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}&offset=${searchState.tracksOffset}&limit=${searchState.limit}`);
        const data = await response.json();

        const newTracks = data.tracks || [];
        if (!append && tracksGrid) tracksGrid.innerHTML = '';
        if (tracksGrid) newTracks.forEach(track => renderTrackGrid([track], tracksGrid));
        
        searchState.tracksOffset += newTracks.length;
        searchState.hasMoreTracks = newTracks.length === searchState.limit;

        if (loadMoreBtn && searchState.hasMoreTracks && newTracks.length > 0) loadMoreBtn.classList.remove('hidden');
        else if (loadMoreBtn) loadMoreBtn.classList.add('hidden');

    } catch (e) {
        console.error('Search failed', e);
        if (!append && tracksGrid) tracksGrid.innerHTML = '<div class="col-span-full py-20 text-center text-red-500">Failed to load search results.</div>';
    } finally {
        searchState.loading = false;
    }
}

// --- Rendering ---
function renderTrackGrid(tracks, container) {
    if (!container) return;
    tracks.forEach((track, index) => {
        const trackUid = getTrackUid(track);
        const isLiked = favorites.some(f => getTrackUid(f) === trackUid);
        const card = document.createElement('div');
        card.className = 'track-card';
        card.innerHTML = `
            <img src="${getProxyUrl(track.artwork_url)}" class="track-artwork" loading="lazy">
            <div class="heart-btn ${isLiked ? 'active' : ''}" style="position: absolute; bottom: 80px; left: 24px; width: 48px; height: 48px; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transform: translateY(10px); transition: all 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); z-index: 10;" onclick="event.stopPropagation(); toggleLikeTrack(${JSON.stringify(track).replace(/"/g, '&quot;')}, this)">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
            </div>
            <div class="play-btn-overlay">
                <i class="fas fa-play"></i>
            </div>
            <div class="font-bold text-sm truncate text-white mb-1">${escapeHtml(track.title)}</div>
            <div class="text-xs text-gray-500 truncate">${escapeHtml(track.artist_name)}</div>
        `;
        card.addEventListener('click', () => {
            playlist = tracks; 
            originalPlaylist = [...tracks];
            playTrack(index);
        });
        container.appendChild(card);
    });
}

function renderPlaylistGrid(playlistsData, container) {
    if (!container) return;
    container.innerHTML = '';
    playlistsData.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.innerHTML = `
            <img src="${getProxyUrl(pl.artwork_url)}" class="track-artwork" loading="lazy">
            <div class="font-bold text-sm truncate text-white mb-1">${escapeHtml(pl.name)}</div>
            <div class="text-xs text-gray-500 truncate">${pl.song_count} songs</div>
        `;
        card.addEventListener('click', () => loadOfficialPlaylistDetails(pl.id));
        container.appendChild(card);
    });
}

async function loadOfficialPlaylistDetails(playlistId) {
    switchView('dynamic');
    const container = document.getElementById('dynamicView');
    container.innerHTML = '<div class="py-20 flex justify-center"><i class="fas fa-circle-notch fa-spin text-3xl text-accent-indigo"></i></div>';
    try {
        const response = await fetch(`${API_BASE_URL}/playlist/${playlistId}`);
        const data = await response.json();
        container.innerHTML = `
            <div class="flex flex-col md:flex-row items-end gap-8 mb-10">
                <img src="${getProxyUrl(data.artwork_url)}" class="w-56 h-56 rounded-3xl shadow-2xl border border-brand-border">
                <div class="flex-1">
                    <span class="text-xs font-bold uppercase tracking-widest text-gray-400">Playlist</span>
                    <h1 class="text-6xl font-black tracking-tighter mb-4">${escapeHtml(data.name)}</h1>
                    <p class="text-gray-500 mb-4">${data.description || 'Official Playlist'}</p>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-white">${data.song_count} songs</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-6 mb-8 border-b border-brand-border pb-8">
                <button class="w-16 h-16 bg-accent-indigo rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform" onclick="playAllFromDynamic()">
                    <i class="fas fa-play text-white text-xl"></i>
                </button>
            </div>
            <div id="dynamicList" class="space-y-2"></div>
        `;
        const list = document.getElementById('dynamicList');
        data.tracks.forEach((track, index) => list.appendChild(createTrackRow(track, index, data.tracks)));
        currentDynamicPlaylist = data.tracks;
    } catch (e) { console.error('Failed to load playlist details', e); }
}

function renderFavorites() {
    const list = document.getElementById('favoritesList');
    const count = document.getElementById('likedSongsCount');
    if (count) count.textContent = `${favorites.length} songs`;
    if (favorites.length === 0) {
        list.innerHTML = '<div class="py-20 text-center text-gray-500">Your liked songs will appear here.</div>';
        return;
    }
    list.innerHTML = '';
    favorites.forEach((track, index) => list.appendChild(createTrackRow(track, index, favorites)));
}

function createTrackRow(track, index, trackList) {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 group cursor-pointer border border-transparent hover:border-brand-border transition-all';
    div.innerHTML = `
        <div class="w-10 text-center text-gray-500 font-bold group-hover:hidden">${index + 1}</div>
        <div class="w-10 text-center text-accent-indigo hidden group-hover:block"><i class="fas fa-play"></i></div>
        <img src="${getProxyUrl(track.artwork_url)}" class="w-12 h-12 rounded-lg object-cover">
        <div class="flex-1 min-w-0">
            <div class="text-sm font-bold text-white truncate">${escapeHtml(track.title)}</div>
            <div class="text-xs text-gray-500 truncate">${escapeHtml(track.artist_name)}</div>
        </div>
        <div class="text-xs text-gray-500 font-mono hidden sm:block">${formatTime(track.duration / 1000)}</div>
        <button class="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><i class="fas fa-ellipsis-h"></i></button>
    `;
    div.addEventListener('click', () => { playlist = trackList; originalPlaylist = [...trackList]; playTrack(index); });
    return div;
}

// --- Playback Logic ---
let activeSource = 'youtube'; 

async function playTrack(index) {
    currentIndex = index;
    currentTrack = playlist[currentIndex];
    if (isShuffle) {
        const sIndex = shuffledIndices.indexOf(index);
        if (sIndex > -1) shuffledCurrentIndex = sIndex;
        else generateShuffledSequence();
    }

    document.getElementById('currentTrackName').textContent = currentTrack.title;
    const artistNameEl = document.getElementById('currentArtistName');
    artistNameEl.textContent = currentTrack.artist_name;
    artistNameEl.className = 'text-xs text-gray-500 truncate';
    artistNameEl.onclick = null;

    const artwork = document.getElementById('currentArtwork');
    artwork.src = getProxyUrl(currentTrack.artwork_url);
    artwork.classList.remove('hidden');
    document.getElementById('artworkPlaceholder').classList.add('hidden');

    updateLikeButtonStatus();
    if (!document.getElementById('fullscreenPlayer').classList.contains('hidden')) updateFullscreenUI();

    document.getElementById('progressBarFill').style.width = '0%';
    document.getElementById('currentTimeLabel').textContent = '0:00';
    document.getElementById('durationLabel').textContent = '0:00';

    const directUrl = getDownloadUrl(currentTrack);
    if (directUrl) { loadAudioPlayer(directUrl); return; }

    try {
        const query = `${currentTrack.title} ${currentTrack.artist_name} official audio`;
        const response = await fetch(`${API_BASE_URL}/youtube-search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.videoId) loadYouTubePlayer(data.videoId);
    } catch (e) { console.error('Failed to get video ID', e); }
}

function loadAudioPlayer(url) {
    activeSource = 'audio';
    if (player && typeof player.pauseVideo === 'function') player.pauseVideo();
    let audio = document.getElementById('nativeAudio');
    if (!audio) {
        audio = document.createElement('audio'); audio.id = 'nativeAudio';
        document.getElementById('audioElement').appendChild(audio);
        audio.addEventListener('play', () => { isPlaying = true; updatePlayPauseUI(); startProgressUpdate(); });
        audio.addEventListener('pause', () => { isPlaying = false; updatePlayPauseUI(); stopProgressUpdate(); });
        audio.addEventListener('ended', () => playNext());
        audio.addEventListener('timeupdate', () => {
            if (activeSource === 'audio' && audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                document.getElementById('progressBarFill').style.width = percent + '%';
                document.getElementById('currentTimeLabel').textContent = formatTime(audio.currentTime);
                document.getElementById('durationLabel').textContent = formatTime(audio.duration);
                const fsBar = document.getElementById('fsProgressBarFill'); if (fsBar) fsBar.style.width = percent + '%';
                const fsCurrent = document.getElementById('fsCurrentTime'); if (fsCurrent) fsCurrent.textContent = formatTime(audio.currentTime);
                const fsDuration = document.getElementById('fsDuration'); if (fsDuration) fsDuration.textContent = formatTime(audio.duration);
            }
        });
    }
    audio.src = url; audio.volume = volume / 100; audio.play();
}

function loadYouTubePlayer(videoId) {
    activeSource = 'youtube';
    let audio = document.getElementById('nativeAudio'); if (audio) audio.pause();
    if (window.YT && window.YT.Player) {
        if (player && typeof player.loadVideoById === 'function') { player.loadVideoById(videoId); player.playVideo(); }
        else {
            player = new YT.Player('audioElement', {
                height: '0', width: '0', videoId: videoId,
                playerVars: { autoplay: 1, controls: 0, disablekb: 1, origin: window.location.origin },
                events: { onReady: (e) => { e.target.setVolume(volume); e.target.playVideo(); }, onStateChange: onPlayerStateChange }
            });
        }
    } else {
        const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        window.onYouTubeIframeAPIReady = () => loadYouTubePlayer(videoId);
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayPauseUI(); startProgressUpdate(); }
    else if (event.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayPauseUI(); stopProgressUpdate(); }
    else if (event.data === YT.PlayerState.ENDED) playNext();
}

function togglePlayPause() {
    if (activeSource === 'audio') {
        const audio = document.getElementById('nativeAudio');
        if (audio) { if (isPlaying) audio.pause(); else audio.play(); }
    } else if (player && typeof player.pauseVideo === 'function') {
        if (isPlaying) player.pauseVideo(); else player.playVideo();
    }
}

function updatePlayPauseUI() {
    const btns = ['playPauseButton', 'fsPlayPause', 'miniPlayPause'];
    btns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    });
}

function playNext() {
    if (playlist.length === 0) return;
    if (repeatMode === 'one') { playTrack(currentIndex); return; }
    if (isShuffle) {
        shuffledCurrentIndex++;
        if (shuffledCurrentIndex >= shuffledIndices.length) {
            if (repeatMode === 'all') { generateShuffledSequence(); shuffledCurrentIndex = 0; }
            else return;
        }
        playTrack(shuffledIndices[shuffledCurrentIndex]);
    } else {
        let nextIndex = (currentIndex + 1) % playlist.length;
        if (nextIndex === 0 && repeatMode !== 'all') return;
        playTrack(nextIndex);
    }
}

function playPrev() {
    if (playlist.length === 0) return;
    if (isShuffle) {
        if (shuffledCurrentIndex > 0) { shuffledCurrentIndex--; playTrack(shuffledIndices[shuffledCurrentIndex]); }
        else playTrack(currentIndex);
    } else {
        let prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
        playTrack(prevIndex);
    }
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    document.getElementById('shuffleButton').classList.toggle('active', isShuffle);
    document.getElementById('fsShuffle').classList.toggle('active', isShuffle);
    if (isShuffle) generateShuffledSequence();
}

function cycleRepeat() {
    const modes = ['off', 'all', 'one'];
    repeatMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    const updateUI = (id, fontSize) => {
        const btn = document.getElementById(id); if (!btn) return;
        btn.classList.toggle('active', repeatMode !== 'off');
        btn.innerHTML = repeatMode === 'one' ? `<i class="fas fa-repeat"></i><span class="absolute text-[${fontSize}px] font-bold mt-1">1</span>` : '<i class="fas fa-repeat"></i>';
    };
    updateUI('repeatButton', 8); updateUI('fsRepeat', 10);
}

// --- Storage ---
async function loadLibraryData() {
    try {
        if (window.VeliumDB) {
            const lib = await window.VeliumDB.getLibrary();
            favorites = lib.likedSongs || []; playlists = lib.playlists || [];
        } else {
            favorites = JSON.parse(localStorage.getItem('velium_v2_favorites')) || [];
            playlists = JSON.parse(localStorage.getItem('velium_v2_playlists')) || [];
        }
    } catch (e) { console.error("Error loading library", e); }
}

async function saveLibraryData() {
    try {
        if (window.VeliumDB) await window.VeliumDB.saveLibrary({ likedSongs: favorites, playlists: playlists });
        else {
            localStorage.setItem('velium_v2_favorites', JSON.stringify(favorites));
            localStorage.setItem('velium_v2_playlists', JSON.stringify(playlists));
        }
    } catch (e) { console.error("Error saving library", e); }
}

function saveToStorage(key, value) { localStorage.setItem(`velium_v2_${key}`, JSON.stringify(value)); }

window.toggleLikeTrack = async function(track, btnEl) {
    const trackUid = getTrackUid(track);
    const index = favorites.findIndex(t => getTrackUid(t) === trackUid);
    if (index > -1) {
        favorites.splice(index, 1);
        if (btnEl) { btnEl.classList.remove('active'); btnEl.querySelector('i').className = 'far fa-heart'; }
    } else {
        favorites.push(track);
        if (btnEl) { btnEl.classList.add('active'); btnEl.querySelector('i').className = 'fas fa-heart'; }
    }
    await saveLibraryData();
    updateLikeButtonStatus();
    if (document.getElementById('favoritesView').classList.contains('active')) renderFavorites();
};

async function toggleLike() {
    if (!currentTrack) return;
    const trackUid = getTrackUid(currentTrack);
    const index = favorites.findIndex(t => getTrackUid(t) === trackUid);
    if (index > -1) favorites.splice(index, 1);
    else favorites.push(currentTrack);
    await saveLibraryData();
    updateLikeButtonStatus();
    if (document.getElementById('favoritesView').classList.contains('active')) renderFavorites();
}

function updateLikeButtonStatus() {
    if (!currentTrack) return;
    const trackUid = getTrackUid(currentTrack);
    const isLiked = favorites.some(t => getTrackUid(t) === trackUid);
    const btn = document.getElementById('likeButton');
    if (btn) btn.innerHTML = isLiked ? '<i class="fas fa-heart text-red-500"></i>' : '<i class="far fa-heart"></i>';
}

// --- Playlists ---
function renderSidebarPlaylists() {
    const container = document.getElementById('sidebar-playlists'); if (!container) return;
    container.innerHTML = '';
    const liked = document.createElement('div'); liked.className = 'nav-item';
    liked.innerHTML = `<i class="fas fa-heart"></i> <span class="truncate">Liked Songs</span>`;
    liked.onclick = () => switchView('favorites'); container.appendChild(liked);
    playlists.forEach(pl => {
        const item = document.createElement('div'); item.className = 'nav-item';
        item.innerHTML = `<i class="fas fa-list"></i> <span class="truncate">${escapeHtml(pl.name)}</span>`;
        item.onclick = () => loadPlaylistView(pl.id); container.appendChild(item);
    });
}

function renderLibrary() {
    const container = document.getElementById('libraryContent'); if (!container) return;
    container.innerHTML = '';
    const likedCard = document.createElement('div'); likedCard.className = 'track-card';
    likedCard.innerHTML = `<div class="w-full aspect-square bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center mb-4"><i class="fas fa-heart text-white text-5xl"></i></div><div class="font-bold text-white">Liked Songs</div><div class="text-xs text-gray-500">${favorites.length} songs</div>`;
    likedCard.onclick = () => switchView('favorites'); container.appendChild(likedCard);
    playlists.forEach(pl => {
        const card = document.createElement('div'); card.className = 'track-card';
        card.innerHTML = `<div class="w-full aspect-square bg-card-dark border border-brand-border rounded-2xl flex items-center justify-center mb-4"><i class="fas fa-music text-gray-700 text-5xl"></i></div><div class="font-bold text-white truncate">${escapeHtml(pl.name)}</div><div class="text-xs text-gray-500">${pl.tracks.length} songs</div>`;
        card.onclick = () => loadPlaylistView(pl.id); container.appendChild(card);
    });
}

async function loadPlaylistView(playlistId) {
    const pl = playlists.find(p => p.id === playlistId); if (!pl) return;
    switchView('dynamic'); const container = document.getElementById('dynamicView');
    container.innerHTML = `
        <div class="flex flex-col md:flex-row items-end gap-8 mb-10">
            <div class="w-56 h-56 bg-card-dark border border-brand-border rounded-3xl flex items-center justify-center shadow-2xl relative">
                ${pl.cover_url ? `<img src="${getProxyUrl(pl.cover_url)}" class="w-full h-full object-cover rounded-3xl">` : `<i class="fas fa-music text-gray-700 text-7xl"></i>`}
                <button class="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-2 text-white text-sm" onclick="showPlaylistCoverUploadModal('${pl.id}')"><i class="fas fa-camera"></i></button>
            </div>
            <div class="flex-1"><span class="text-xs font-bold uppercase tracking-widest text-gray-400">Playlist</span><h1 class="text-7xl font-black tracking-tighter mb-4">${escapeHtml(pl.name)}</h1><p class="text-gray-500 mb-4">${escapeHtml(pl.description || 'No description')}</p><div class="flex items-center gap-2"><span class="font-bold text-white">${pl.tracks.length} songs</span></div></div>
        </div>
        <div class="flex items-center gap-6 mb-8 border-b border-brand-border pb-8">
            <button class="w-16 h-16 bg-accent-indigo rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform" onclick="playAllFromDynamic()"><i class="fas fa-play text-white text-xl"></i></button>
            <button class="player-btn text-lg" onclick="showEditPlaylistModal('${pl.id}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="player-btn text-lg text-red-500 hover:text-red-400" onclick="deletePlaylist('${pl.id}')"><i class="fas fa-trash"></i> Delete</button>
        </div>
        <div id="dynamicList" class="space-y-2"></div>
    `;
    const list = document.getElementById('dynamicList');
    if (pl.tracks.length === 0) list.innerHTML = '<div class="py-20 text-center text-gray-500">This playlist is empty. Add some songs!</div>';
    else pl.tracks.forEach((track, index) => list.appendChild(createTrackRow(track, index, pl.tracks)));
    currentDynamicPlaylist = pl.tracks;
}

let currentDynamicPlaylist = [];
function playAllFromDynamic() { if (currentDynamicPlaylist.length > 0) { playlist = currentDynamicPlaylist; originalPlaylist = [...currentDynamicPlaylist]; playTrack(0); } }
function playAllFavorites() { if (favorites.length > 0) { playlist = favorites; originalPlaylist = [...favorites]; playTrack(0); } }

function createPlaylist(name, description = '', cover_url = '') {
    const newPlaylist = { id: Date.now().toString(), name: name || 'My Playlist', description: description, tracks: [], cover_url: cover_url, createdAt: new Date().toISOString() };
    playlists.push(newPlaylist); saveLibraryData(); renderSidebarPlaylists(); renderLibrary(); return newPlaylist.id;
}

function updatePlaylist(playlistId, name, description, cover_url) {
    const plIndex = playlists.findIndex(p => p.id === playlistId);
    if (plIndex > -1) {
        playlists[plIndex].name = name; playlists[plIndex].description = description; playlists[plIndex].cover_url = cover_url;
        saveLibraryData(); renderSidebarPlaylists(); renderLibrary();
        if (currentDynamicPlaylist === playlists[plIndex].tracks) loadPlaylistView(playlistId);
        return true;
    }
    return false;
}

function deletePlaylist(playlistId) {
    if (confirm('Are you sure you want to delete this playlist?')) {
        playlists = playlists.filter(pl => pl.id !== playlistId);
        saveLibraryData(); renderSidebarPlaylists(); renderLibrary();
        switchView('home');
    }
}

function showCreatePlaylistModal() { document.getElementById('createPlaylistModal').style.display = 'flex'; document.getElementById('playlistNameInput').value = ''; document.getElementById('playlistDescInput').value = ''; }
function hideCreatePlaylistModal() { document.getElementById('createPlaylistModal').style.display = 'none'; }
function showEditPlaylistModal(playlistId) { const pl = playlists.find(p => p.id === playlistId); if (!pl) return; document.getElementById('editPlaylistModal').style.display = 'flex'; document.getElementById('editPlaylistId').value = pl.id; document.getElementById('editPlaylistNameInput').value = pl.name; document.getElementById('editPlaylistDescInput').value = pl.description; }
function hideEditPlaylistModal() { document.getElementById('editPlaylistModal').style.display = 'none'; }
async function confirmEditPlaylist() { const id = document.getElementById('editPlaylistId').value, name = document.getElementById('editPlaylistNameInput').value.trim(), desc = document.getElementById('editPlaylistDescInput').value.trim(); const pl = playlists.find(p => p.id === id); if (pl && name) { updatePlaylist(id, name, desc, pl.cover_url); hideEditPlaylistModal(); } }
function showPlaylistCoverUploadModal(id) { document.getElementById('playlistCoverUploadModal').style.display = 'flex'; document.getElementById('uploadPlaylistId').value = id; document.getElementById('playlistCoverInput').value = ''; }
function hidePlaylistCoverUploadModal() { document.getElementById('playlistCoverUploadModal').style.display = 'none'; }
async function savePlaylistCover() { const id = document.getElementById('uploadPlaylistId').value, file = document.getElementById('playlistCoverInput').files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { const pl = playlists.find(p => p.id === id); if (pl) { updatePlaylist(id, pl.name, pl.description, e.target.result); hidePlaylistCoverUploadModal(); } }; reader.readAsDataURL(file); }

async function importYoutubePlaylist() {
    const url = document.getElementById('importPlaylistUrlInput').value.trim(), btn = document.getElementById('confirmImportPlaylistBtn');
    if (!url) return; btn.disabled = true; btn.innerHTML = 'Importing...';
    try {
        const response = await fetch(`${API_BASE_URL}/import-playlist?q=${encodeURIComponent(url)}`);
        const data = await response.json();
        const newPlaylist = { id: Date.now().toString(), name: data.name || 'Imported', description: data.description || 'From YouTube', tracks: data.tracks || [], cover_url: data.artwork_url || '', createdAt: new Date().toISOString() };
        playlists.push(newPlaylist); await saveLibraryData(); renderSidebarPlaylists(); renderLibrary(); hideImportPlaylistModal(); loadPlaylistView(newPlaylist.id);
    } catch (e) { console.error('Import failed', e); } finally { btn.disabled = false; btn.innerHTML = 'Import'; }
}

function startProgressUpdate() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (activeSource === 'youtube' && player && typeof player.getCurrentTime === 'function') {
            const current = player.getCurrentTime(), total = player.getDuration();
            if (total > 0) {
                const percent = (current / total) * 100;
                document.getElementById('progressBarFill').style.width = percent + '%';
                document.getElementById('currentTimeLabel').textContent = formatTime(current);
                document.getElementById('durationLabel').textContent = formatTime(total);
                const fsBar = document.getElementById('fsProgressBarFill'); if (fsBar) fsBar.style.width = percent + '%';
                const fsCurrent = document.getElementById('fsCurrentTime'); if (fsCurrent) fsCurrent.textContent = formatTime(current);
                const fsDuration = document.getElementById('fsDuration'); if (fsDuration) fsDuration.textContent = formatTime(total);
            }
        }
    }, 1000);
}
function stopProgressUpdate() { clearInterval(progressInterval); }
function updateVolumeUI() { const bar = document.getElementById('volumeBarFill'); if (bar) bar.style.width = volume + '%'; const slider = document.getElementById('volumeSlider'); if (slider) slider.value = volume; }

// Made with ❤️ from 4SP
