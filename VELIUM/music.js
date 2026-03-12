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
function getProxyUrl(url, size = null) {
    if (!url) return url;
    if (typeof url !== 'string') return url;
    if (url.startsWith('data:')) return url;

    // Optimization for Saavn images
    if (url.includes('saavncdn.com')) {
        if (size) {
            url = url.replace(/_([0-9]+x[0-9]+|150|500)\.jpg/i, `_${size}.jpg`);
        } else {
            // Default to a reasonable size for grid if none specified
            url = url.replace(/_150x150\.jpg/i, `_250x250.jpg`);
        }
    }

    if (url.startsWith('//')) url = 'https:' + url;

    if (window.__uv$config && window.__uv$config.prefix && window.__uv$config.encodeUrl) {
        return window.__uv$config.prefix + window.__uv$config.encodeUrl(url);
    }
    if (window.Ultraviolet && window.Ultraviolet.codec && window.Ultraviolet.codec.xor) {
         return "/VELIUM/uv/service/" + window.Ultraviolet.codec.xor.encode(url);
    }
    
    return url;
}

// --- State ---
let isInitialized = false;
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
let preloadedNextTrack = null;

const popularArtists = [
    'The Weeknd', 'Drake', 'Post Malone', 'Dua Lipa', 'Ed Sheeran', 
    'Ariana Grande', 'Travis Scott', 'Olivia Rodrigo', 'Bad Bunny', 'SZA'
];

// --- Helpers ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Prevent duplicate active toasts with the same message
    const existingToasts = Array.from(container.querySelectorAll('div'));
    if (existingToasts.some(t => t.textContent === message)) return;

    const toast = document.createElement('div');
    toast.className = `px-6 py-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 text-white text-sm font-medium shadow-2xl animate-in slide-in-from-bottom-4 duration-300`;
    if (type === 'success') toast.classList.add('border-green-500/50');
    else if (type === 'error') toast.classList.add('border-red-500/50');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getTrackUid(track) {
    if (!track) return null;
    if (track.youtube_id) return `ytm-${track.youtube_id}`;
    if (track.id && (track.id.startsWith('ytm-') || track.id.startsWith('saavn-')) && !track.id.includes('gen-')) {
        return track.id;
    }
    const title = (track.title || track.name || '').trim().toLowerCase();
    const artist = (track.artist_name || '').trim().toLowerCase();
    return `f-${title}-${artist}`.replace(/[^a-z0-9]/g, '');
}

async function preloadNextTrack() {
    if (playlist.length === 0) return;
    
    let nextIndex = -1;
    if (isShuffle) {
        if (shuffledCurrentIndex < shuffledIndices.length - 1) nextIndex = shuffledIndices[shuffledCurrentIndex + 1];
        else if (repeatMode === 'all') nextIndex = shuffledIndices[0];
    } else {
        if (currentIndex < playlist.length - 1) nextIndex = currentIndex + 1;
        else if (repeatMode === 'all') nextIndex = 0;
    }

    if (nextIndex === -1 || nextIndex === currentIndex) return;
    
    const nextTrack = playlist[nextIndex];
    if (!nextTrack) return;

    // Don't preload if already cached for this index
    if (preloadedNextTrack && preloadedNextTrack.index === nextIndex) return;

    try {
        if (nextTrack.youtube_id || nextTrack.videoId) {
            preloadedNextTrack = { index: nextIndex, source: 'youtube', videoId: nextTrack.youtube_id || nextTrack.videoId };
            return;
        }

        const directUrl = getDownloadUrl(nextTrack);
        if (directUrl) {
            preloadedNextTrack = { index: nextIndex, source: 'audio', url: directUrl };
            let preloadAudio = document.getElementById('preloadAudio');
            if (!preloadAudio) {
                preloadAudio = document.createElement('audio');
                preloadAudio.id = 'preloadAudio';
                preloadAudio.style.display = 'none';
                document.body.appendChild(preloadAudio);
            }
            preloadAudio.src = directUrl;
            preloadAudio.load();
        } else {
            const query = `${nextTrack.title} ${nextTrack.artist_name} official audio`;
            const response = await fetch(`${API_BASE_URL}/youtube-search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data.videoId) {
                nextTrack.youtube_id = data.videoId;
                saveLibraryData();
                preloadedNextTrack = { index: nextIndex, source: 'youtube', videoId: data.videoId };
            }
        }
    } catch (e) { console.warn('Preload failed', e); }
}

window.toggleLikeTrack = async function(track, btnEl) {
    const trackUid = getTrackUid(track);
    const index = favorites.findIndex(t => getTrackUid(t) === trackUid);
    
    if (index > -1) {
        favorites.splice(index, 1);
        if (btnEl) {
            btnEl.classList.remove('active');
            const icon = btnEl.querySelector('i');
            if (icon) icon.className = 'far fa-heart';
        }
    }
    else {
        // Fetch artwork as base64 before saving
        if (track.artwork_url && !track.local_artwork) {
            const b64 = await urlToBase64(track.artwork_url);
            if (b64) track.local_artwork = b64;
        }
        
        favorites.push(track);
        if (btnEl) {
            btnEl.classList.add('active');
            const icon = btnEl.querySelector('i');
            if (icon) icon.className = 'fas text-red-500 fa-heart';
        }
    }
    await saveLibraryData();
    updateLikeButtonStatus(); 
    if (document.getElementById('favoritesView').classList.contains('active')) renderFavorites();
};

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

async function saveTrackDuration(track, duration) {
    if (!track || !duration || duration <= 0) return;
    const durationSec = duration > 10000 ? duration / 1000 : duration;
    
    // Check if we already have a reasonably accurate duration
    if (track.duration && Math.abs(track.duration - durationSec) < 2) return;

    track.duration = durationSec;
    const trackUid = getTrackUid(track);

    // Update in favorites
    const favIndex = favorites.findIndex(f => getTrackUid(f) === trackUid);
    if (favIndex > -1) favorites[favIndex].duration = durationSec;

    // Update in all playlists
    playlists.forEach(pl => {
        pl.tracks.forEach(t => {
            if (getTrackUid(t) === trackUid) t.duration = durationSec;
        });
    });

    await saveLibraryData();
}

async function urlToBase64(url) {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    try {
        const response = await fetch(getProxyUrl(url));
        const blob = await response.json().then(() => null).catch(() => response.blob()); // Try blob first
        if (!blob) return null;
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Failed to convert image to base64', e);
        return null;
    }
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
    if (isInitialized) return;
    isInitialized = true;
    
    await loadLibraryData();
    setGreeting();
    setupEventListeners();
    loadPopularTracks();
    renderSidebarPlaylists();
    renderLibrary();
    updateVolumeUI();
    initCropper();

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

    // Infinite Scroll for Search using IntersectionObserver
    const loader = document.getElementById('searchLoader');
    if (loader) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !searchState.loading && searchState.hasMoreTracks && searchState.query) {
                console.log("Infinite Scroll: Loading more results for " + searchState.query);
                handleSearch(searchState.query, true);
            }
        }, { threshold: 0.1 });
        observer.observe(loader);
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
        hideCreatePlaylistModal();
    });
    document.getElementById('confirmEditPlaylistBtn').addEventListener('click', confirmEditPlaylist);

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

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            const active = document.activeElement;
            const isInput = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable;
            if (!isInput) {
                e.preventDefault();
                togglePlayPause();
            }
        }
    });
}

// --- View Logic ---
window.toggleFullscreenPlayer = function() {
    const fs = document.getElementById('fullscreenPlayer');
    if (!fs) return;
    if (fs.classList.contains('hidden')) {
        if (!currentTrack) {
            showToast('No track playing', 'info');
            return;
        }
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

function closeFullscreenIfNoTrack() {
    const fs = document.getElementById('fullscreenPlayer');
    if (fs && !fs.classList.contains('hidden')) {
        window.toggleFullscreenPlayer();
    }
}

function updateFullscreenUI() {
    if (!currentTrack) return;
    document.getElementById('fsTrackName').textContent = currentTrack.title;
    document.getElementById('fsArtistName').textContent = currentTrack.artist_name;
    const artworkUrl = currentTrack.local_artwork || getProxyUrl(currentTrack.artwork_url);
    document.getElementById('fsArtwork').src = artworkUrl;
    
    // Background optimized for blur
    const bgUrl = currentTrack.local_artwork || getProxyUrl(currentTrack.artwork_url, '50x50');
    const bg = document.getElementById('fsBackground');
    if (bg) { bg.style.backgroundImage = `url('${bgUrl}')`; bg.style.backgroundSize = 'cover'; bg.style.backgroundPosition = 'center'; }
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
        canvas.width = 50; canvas.height = 50; 
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;
        
        let r=0, g=0, b=0, count=0;
        for(let i=0; i<data.length; i+=4) {
            r += data[i]; g += data[i+1]; b += data[i+2]; count++;
        }
        r = Math.round(r/count); g = Math.round(g/count); b = Math.round(b/count);
        
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        let tintColor, progressBg, accentColor;

        if (brightness < 160) {
            tintColor = 'rgba(255, 255, 255, 1)';
            progressBg = 'rgba(255, 255, 255, 0.2)';
            accentColor = `rgba(${Math.min(255, r+40)}, ${Math.min(255, g+40)}, ${Math.min(255, b+40)}, 1)`;
        } else {
            const factor = 0.15;
            tintColor = `rgba(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)}, 1)`;
            progressBg = `rgba(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)}, 0.2)`;
            accentColor = `rgba(${Math.round(r * 0.5)}, ${Math.round(g * 0.5)}, ${Math.round(b * 0.5)}, 1)`;
        }

        fs.style.setProperty('--tint-color', tintColor);
        fs.style.setProperty('--progress-bg', progressBg);
        fs.style.setProperty('--accent-color', accentColor);
        fs.style.setProperty('--bg-base', `rgb(${r}, ${g}, ${b})`);
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
        const query = "Travis Scott 2025";
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=12`);
        const data = await response.json();
        if (data.tracks) renderTrackGrid(data.tracks.slice(0, 12), grid);
    } catch (e) { console.error('Failed to load popular tracks', e); }
}

let searchState = { query: '', tracksOffset: 0, loading: false, hasMoreTracks: true, limit: 24 };

async function handleSearch(query, append = false) {
    const resultsDiv = document.getElementById('searchResults');
    const categoriesDiv = document.getElementById('browseCategories');
    const tracksGrid = document.getElementById('searchGrid');
    const loader = document.getElementById('searchLoader');

    if (!query || query.trim() === '') {
        if (resultsDiv) resultsDiv.classList.add('hidden');
        if (categoriesDiv) categoriesDiv.classList.remove('hidden');
        if (loader) loader.classList.add('hidden');
        searchState.query = '';
        return;
    }

    if (!append || query !== searchState.query) {
        searchState = { query: query, tracksOffset: 0, loading: false, hasMoreTracks: true, limit: 24 };
        if (tracksGrid) tracksGrid.innerHTML = '';
        if (loader) loader.classList.add('hidden');
    }
    
    if (searchState.loading || !searchState.hasMoreTracks) return;
    searchState.loading = true;
    
    // Show loader for infinite scroll
    if (append && loader) loader.classList.remove('hidden');

    if (resultsDiv) resultsDiv.classList.remove('hidden');
    if (categoriesDiv) categoriesDiv.classList.add('hidden');

    if (!append && tracksGrid) {
        tracksGrid.innerHTML = '<div class="col-span-full py-20 flex justify-center"><i class="fas fa-circle-notch fa-spin text-3xl text-accent-indigo"></i></div>';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}&offset=${searchState.tracksOffset}&limit=${searchState.limit}`);
        const data = await response.json();

        const newTracks = data.tracks || [];
        if (!append && tracksGrid) tracksGrid.innerHTML = '';
        if (tracksGrid) {
            newTracks.forEach(track => {
                const trackUid = getTrackUid(track);
                const existing = Array.from(tracksGrid.querySelectorAll('.track-card')).some(card => card.dataset.uid === trackUid);
                if (!existing) {
                    renderTrackGrid([track], tracksGrid);
                    tracksGrid.lastElementChild.dataset.uid = trackUid;
                }
            });
        }
        
        searchState.tracksOffset += newTracks.length;
        searchState.hasMoreTracks = newTracks.length === searchState.limit && newTracks.length > 0;

    } catch (e) {
        console.error('Search failed', e);
        if (!append && tracksGrid) tracksGrid.innerHTML = '<div class="col-span-full py-20 text-center text-red-500">Failed to load search results.</div>';
    } finally {
        searchState.loading = false;
        if (loader) loader.classList.add('hidden');
    }
}

// --- Rendering ---
function renderTrackGrid(tracks, container) {
    if (!container) return;
    tracks.forEach((track, index) => {
        const trackUid = getTrackUid(track);
        const isLiked = favorites.some(f => getTrackUid(f) === trackUid);
        const card = document.createElement('div');
        card.className = 'track-card relative aspect-square p-0 overflow-hidden group';
        
        const artworkUrl = track.local_artwork || getProxyUrl(track.artwork_url);
        
        card.innerHTML = `
            <img src="${artworkUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy">
            
            <!-- Bottom Blur Overlay -->
            <div class="absolute inset-x-0 bottom-0 h-1/3 bg-black/20 backdrop-blur-md border-t border-white/10 flex flex-col justify-center px-4 transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
                <div class="font-bold text-sm truncate text-white mb-0.5">${escapeHtml(track.title)}</div>
                <div class="text-[10px] text-gray-300 truncate uppercase tracking-wider font-medium">${escapeHtml(track.artist_name)}</div>
            </div>

            <!-- Heart Button (Top Right) -->
            <div class="heart-btn ${isLiked ? 'active' : ''} absolute top-3 right-3 w-10 h-10 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 border border-white/10 z-20" onclick="event.stopPropagation(); toggleLikeTrack(${JSON.stringify(track).replace(/"/g, '&quot;')}, this)">
                <i class="${isLiked ? 'fas text-red-500' : 'far'} fa-heart"></i>
            </div>

            <!-- Play Button Overlay (Center) -->
            <div class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <div class="w-14 h-14 bg-accent-indigo text-white rounded-full flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <i class="fas fa-play text-xl ml-1"></i>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            playlist = tracks; 
            originalPlaylist = [...tracks];
            preloadedNextTrack = null; // Clear old preload
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
        card.className = 'track-card relative aspect-square p-0 overflow-hidden group';
        card.innerHTML = `
            <img src="${getProxyUrl(pl.artwork_url)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy">
            <div class="absolute inset-x-0 bottom-0 h-1/3 bg-black/20 backdrop-blur-md border-t border-white/10 flex flex-col justify-center px-4 transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
                <div class="font-bold text-sm truncate text-white mb-0.5">${escapeHtml(pl.name)}</div>
                <div class="text-[10px] text-gray-300 truncate uppercase tracking-wider font-medium">${pl.song_count} songs</div>
            </div>
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
        data.tracks.forEach((track, index) => list.appendChild(createTrackRow(track, index, data.tracks, true)));
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
    favorites.forEach((track, index) => list.appendChild(createTrackRow(track, index, favorites, true)));
}

function createTrackRow(track, index, trackList, hideEllipsis = false) {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 group cursor-pointer border border-transparent hover:border-brand-border transition-all';
    
    // Duration handling: API might return duration in ms, playlist might have it in seconds or ms
    let durationSec = 0;
    if (track.duration) durationSec = track.duration > 10000 ? track.duration / 1000 : track.duration;
    else if (track.duration_seconds) durationSec = track.duration_seconds;

    div.innerHTML = `
        <div class="w-10 text-center text-gray-500 font-bold group-hover:hidden">${index + 1}</div>
        <div class="w-10 text-center text-accent-indigo hidden group-hover:block"><i class="fas fa-play"></i></div>
        <img src="${track.local_artwork || getProxyUrl(track.artwork_url)}" class="w-12 h-12 rounded-lg object-cover">
        <div class="flex-1 min-w-0">
            <div class="text-sm font-bold text-white truncate">${escapeHtml(track.title)}</div>
            <div class="text-xs text-gray-500 truncate">${escapeHtml(track.artist_name)}</div>
        </div>
        <div class="text-xs text-gray-500 font-mono hidden sm:block">${formatTime(durationSec)}</div>
        ${!hideEllipsis ? `<button class="ellipsis-btn text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 p-2"><i class="fas fa-ellipsis-h"></i></button>` : ''}
    `;
    
    div.addEventListener('click', (e) => {
        if (e.target.closest('.ellipsis-btn')) {
            e.stopPropagation();
            showAddToPlaylistModal(track);
            return;
        }
        playlist = trackList; 
        originalPlaylist = [...trackList]; 
        playTrack(index); 
    });
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
    artwork.src = currentTrack.local_artwork || getProxyUrl(currentTrack.artwork_url);
    artwork.classList.remove('hidden');
    document.getElementById('artworkPlaceholder').classList.add('hidden');

    updateLikeButtonStatus();
    if (!document.getElementById('fullscreenPlayer').classList.contains('hidden')) updateFullscreenUI();

    document.getElementById('progressBarFill').style.width = '0%';
    document.getElementById('currentTimeLabel').textContent = '0:00';
    document.getElementById('durationLabel').textContent = '0:00';

    // 1. Check Preload Cache
    if (preloadedNextTrack && preloadedNextTrack.index === index) {
        if (preloadedNextTrack.source === 'audio') {
            loadAudioPlayer(preloadedNextTrack.url);
        } else {
            loadYouTubePlayer(preloadedNextTrack.videoId);
        }
        preloadedNextTrack = null;
        preloadNextTrack(); // Preload the one AFTER this
        return;
    }

    // 2. Check currentTrack for cached ID
    if (currentTrack.youtube_id || currentTrack.videoId) {
        loadYouTubePlayer(currentTrack.youtube_id || currentTrack.videoId);
        preloadNextTrack();
        return;
    }

    const directUrl = getDownloadUrl(currentTrack);
    if (directUrl) { 
        loadAudioPlayer(directUrl); 
        preloadNextTrack();
        return; 
    }

    try {
        const query = `${currentTrack.title} ${currentTrack.artist_name} official audio`;
        const response = await fetch(`${API_BASE_URL}/youtube-search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.videoId) {
            currentTrack.youtube_id = data.videoId; // Cache it
            saveLibraryData(); // Persist if it's in a playlist
            loadYouTubePlayer(data.videoId);
            preloadNextTrack();
        }
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
        audio.addEventListener('error', async () => {
            console.warn('Audio playback error, falling back to YouTube');
            if (currentTrack) {
                const query = `${currentTrack.title} ${currentTrack.artist_name} official audio`;
                try {
                    const response = await fetch(`${API_BASE_URL}/youtube-search?q=${encodeURIComponent(query)}`);
                    const data = await response.json();
                    if (data.videoId) loadYouTubePlayer(data.videoId);
                } catch (e) { console.error('Fallback failed', e); }
            }
        });
        audio.addEventListener('timeupdate', () => {
            if (activeSource === 'audio' && audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                document.getElementById('progressBarFill').style.width = percent + '%';
                document.getElementById('currentTimeLabel').textContent = formatTime(audio.currentTime);
                document.getElementById('durationLabel').textContent = formatTime(audio.duration);
                const fsBar = document.getElementById('fsProgressBarFill'); if (fsBar) fsBar.style.width = percent + '%';
                const fsCurrent = document.getElementById('fsCurrentTime'); if (fsCurrent) fsCurrent.textContent = formatTime(audio.currentTime);
                const fsDuration = document.getElementById('fsDuration'); if (fsDuration) fsDuration.textContent = formatTime(audio.duration);
                saveTrackDuration(currentTrack, audio.duration);
            }
        });
    }
    audio.src = url; 
    audio.volume = volume / 100;
    
    // Properly handle play() promise to avoid AbortError
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            if (error.name !== 'AbortError') console.error('Playback failed:', error);
        });
    }
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
    if (playlist.length === 0) {
        closeFullscreenIfNoTrack();
        return;
    }
    if (repeatMode === 'one') { playTrack(currentIndex); return; }
    if (isShuffle) {
        shuffledCurrentIndex++;
        if (shuffledCurrentIndex >= shuffledIndices.length) {
            if (repeatMode === 'all') { generateShuffledSequence(); shuffledCurrentIndex = 0; }
            else {
                closeFullscreenIfNoTrack();
                return;
            }
        }
        playTrack(shuffledIndices[shuffledCurrentIndex]);
    } else {
        let nextIndex = (currentIndex + 1) % playlist.length;
        if (nextIndex === 0 && repeatMode !== 'all') {
            closeFullscreenIfNoTrack();
            return;
        }
        playTrack(nextIndex);
    }
}

function playPrev() {
    if (playlist.length === 0) {
        closeFullscreenIfNoTrack();
        return;
    }
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
        if (btnEl) {
            btnEl.classList.remove('active');
            const icon = btnEl.querySelector('i');
            if (icon) icon.className = 'far fa-heart';
        }
    }
    else {
        favorites.push(track);
        if (btnEl) {
            btnEl.classList.add('active');
            const icon = btnEl.querySelector('i');
            if (icon) icon.className = 'fas text-red-500 fa-heart';
        }
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
    else {
        // Fetch artwork as base64 before saving
        if (currentTrack.artwork_url && !currentTrack.local_artwork) {
            const b64 = await urlToBase64(currentTrack.artwork_url);
            if (b64) currentTrack.local_artwork = b64;
        }
        favorites.push(currentTrack);
    }
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
    const likedCard = document.createElement('div'); likedCard.className = 'track-card relative aspect-square p-0 overflow-hidden group';
    likedCard.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center"><i class="fas fa-heart text-white text-5xl"></i></div><div class="absolute inset-x-0 bottom-0 h-1/3 bg-black/20 backdrop-blur-md border-t border-white/10 flex flex-col justify-center px-4"><div class="font-bold text-white">Liked Songs</div><div class="text-[10px] text-gray-300 uppercase">${favorites.length} songs</div></div>`;
    likedCard.onclick = () => switchView('favorites'); container.appendChild(likedCard);
    playlists.forEach(pl => {
        const card = document.createElement('div'); card.className = 'track-card relative aspect-square p-0 overflow-hidden group';
        card.innerHTML = `<div class="w-full h-full bg-card-dark flex items-center justify-center"><i class="fas fa-music text-gray-700 text-5xl"></i></div><div class="absolute inset-x-0 bottom-0 h-1/3 bg-black/20 backdrop-blur-md border-t border-white/10 flex flex-col justify-center px-4"><div class="font-bold text-white truncate">${escapeHtml(pl.name)}</div><div class="text-[10px] text-gray-300 uppercase">${pl.tracks.length} songs</div></div>`;
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
    else pl.tracks.forEach((track, index) => list.appendChild(createTrackRow(track, index, pl.tracks, true)));
    currentDynamicPlaylist = pl.tracks;
}

let currentDynamicPlaylist = [];
function playAllFromDynamic() { if (currentDynamicPlaylist.length > 0) { playlist = currentDynamicPlaylist; originalPlaylist = [...currentDynamicPlaylist]; preloadedNextTrack = null; playTrack(0); } }
function playAllFavorites() { if (favorites.length > 0) { playlist = favorites; originalPlaylist = [...favorites]; preloadedNextTrack = null; playTrack(0); } }

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

function showAddToPlaylistModal(track) {
    const modal = document.getElementById('addToPlaylistModal');
    const list = document.getElementById('playlistSelectionList');
    if (!modal || !list) return;
    
    list.innerHTML = '';
    if (playlists.length === 0) {
        list.innerHTML = '<div class="py-4 text-center text-gray-500">No playlists found. Create one first!</div>';
    } else {
        playlists.forEach(pl => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent hover:border-brand-border transition-all';
            item.innerHTML = `
                <div class="w-10 h-10 bg-card-dark rounded-lg flex items-center justify-center flex-shrink-0">
                    ${pl.cover_url ? `<img src="${getProxyUrl(pl.cover_url)}" class="w-full h-full object-cover rounded-lg">` : `<i class="fas fa-list text-gray-700"></i>`}
                </div>
                <div class="flex-1 font-bold text-white truncate">${escapeHtml(pl.name)}</div>
            `;
            item.onclick = () => addTrackToPlaylist(track, pl.id);
            list.appendChild(item);
        });
    }
    
    modal.style.display = 'flex';
}

function hideAddToPlaylistModal() {
    document.getElementById('addToPlaylistModal').style.display = 'none';
}

async function addTrackToPlaylist(track, playlistId) {
    const plIndex = playlists.findIndex(p => p.id.toString() === playlistId.toString());
    if (plIndex > -1) {
        // Ensure we save duration normalized to seconds if possible
        let durationSec = 0;
        if (track.duration) durationSec = track.duration > 10000 ? track.duration / 1000 : track.duration;
        else if (track.duration_seconds) durationSec = track.duration_seconds;
        track.duration = durationSec;
        
        // Prevent duplicates in same playlist
        const trackUid = getTrackUid(track);
        if (playlists[plIndex].tracks.some(t => getTrackUid(t) === trackUid)) {
            showToast('Already in playlist', 'info');
            hideAddToPlaylistModal();
            return;
        }

        playlists[plIndex].tracks.push(track);
        await saveLibraryData();
        renderSidebarPlaylists();
        renderLibrary();
        if (document.getElementById('dynamicView').classList.contains('active')) {
            // Refresh if looking at this playlist
            const currentViewTitle = document.querySelector('#dynamicView h1')?.textContent;
            if (currentViewTitle === playlists[plIndex].name) loadPlaylistView(playlistId);
        }
        showToast('Added to playlist', 'success');
    }
    hideAddToPlaylistModal();
}
// --- Cropper Logic ---
let cropperImage = null;
let cropState = { x: 0, y: 0, radius: 100 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };

function initCropper() {
    const cropperCanvas = document.getElementById('cropperCanvas');
    if (!cropperCanvas) return;
    const ctx = cropperCanvas.getContext('2d');

    const drawCropper = () => {
        if (!cropperImage) return;
        const w = cropperCanvas.width;
        const h = cropperCanvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(cropperImage, 0, 0, w, h);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.fill();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        const r = cropState.radius;
        const size = r * 2;
        const cornerRadius = size * 0.15;
        if (ctx.roundRect) ctx.roundRect(cropState.x - r, cropState.y - r, size, size, cornerRadius);
        else ctx.rect(cropState.x - r, cropState.y - r, size, size);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cropState.x - r, cropState.y - r, size, size, cornerRadius);
        else ctx.rect(cropState.x - r, cropState.y - r, size, size);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    const handleStart = (x, y) => {
        const r = cropState.radius;
        if (x >= cropState.x - r && x <= cropState.x + r && y >= cropState.y - r && y <= cropState.y + r) {
            isDragging = true;
            dragStart = { x, y };
        }
    };
    const handleMove = (x, y) => {
        if (isDragging) {
            const dx = x - dragStart.x;
            const dy = y - dragStart.y;
            let newX = cropState.x + dx;
            let newY = cropState.y + dy;
            const r = cropState.radius;
            const w = cropperCanvas.width;
            const h = cropperCanvas.height;
            newX = Math.max(r, Math.min(newX, w - r));
            newY = Math.max(r, Math.min(newY, h - r));
            cropState.x = newX;
            cropState.y = newY;
            dragStart = { x, y };
            requestAnimationFrame(drawCropper);
        }
    };
    const handleEnd = () => { isDragging = false; };
    const handleScroll = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;
        let newRadius = cropState.radius + delta;
        const w = cropperCanvas.width, h = cropperCanvas.height;
        const maxPossibleRadius = Math.min(w, h) / 2;
        newRadius = Math.max(20, Math.min(newRadius, maxPossibleRadius));
        const minX = newRadius, maxX = w - newRadius, minY = newRadius, maxY = h - newRadius;
        cropState.x = Math.max(minX, Math.min(cropState.x, maxX));
        cropState.y = Math.max(minY, Math.min(cropState.y, maxY));
        cropState.radius = newRadius;
        requestAnimationFrame(drawCropper);
    };

    cropperCanvas.addEventListener('mousedown', e => handleStart(e.offsetX, e.offsetY));
    cropperCanvas.addEventListener('mousemove', e => handleMove(e.offsetX, e.offsetY));
    cropperCanvas.addEventListener('mouseup', handleEnd);
    cropperCanvas.addEventListener('mouseleave', handleEnd);
    cropperCanvas.addEventListener('wheel', handleScroll);

    document.getElementById('playlistCoverInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            cropperImage = new Image();
            cropperImage.onload = () => {
                const fixedHeight = 400;
                const scale = fixedHeight / cropperImage.height;
                cropperCanvas.height = fixedHeight;
                cropperCanvas.width = cropperImage.width * scale;
                cropState = { x: cropperCanvas.width / 2, y: cropperCanvas.height / 2, radius: Math.min(cropperCanvas.width, cropperCanvas.height) / 3 };
                document.getElementById('cropperModal').style.display = 'flex';
                requestAnimationFrame(drawCropper);
            };
            cropperImage.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('cancelCropBtn').addEventListener('click', () => {
        document.getElementById('cropperModal').style.display = 'none';
        document.getElementById('playlistCoverInput').value = '';
    });

    document.getElementById('submitCropBtn').addEventListener('click', async () => {
        const tempCanvas = document.createElement('canvas');
        const size = 512;
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tCtx = tempCanvas.getContext('2d');
        const scale = cropperCanvas.height / cropperImage.height;
        const sourceX = (cropState.x - cropState.radius) / scale;
        const sourceY = (cropState.y - cropState.radius) / scale;
        const sourceSize = (cropState.radius * 2) / scale;
        tCtx.drawImage(cropperImage, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        const base64 = tempCanvas.toDataURL('image/jpeg', 0.8);
        
        const id = document.getElementById('uploadPlaylistId').value;
        const pl = playlists.find(p => p.id.toString() === id.toString());
        if (pl) {
            updatePlaylist(pl.id, pl.name, pl.description, base64);
            document.getElementById('cropperModal').style.display = 'none';
        } else {
            console.error('Playlist not found for ID:', id);
        }
    });
}

function showPlaylistCoverUploadModal(id) { 
    document.getElementById('uploadPlaylistId').value = id; 
    document.getElementById('playlistCoverInput').click(); 
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
                saveTrackDuration(currentTrack, total);
            }
        }
    }, 1000);
}
function stopProgressUpdate() { clearInterval(progressInterval); }
function updateVolumeUI() { const bar = document.getElementById('volumeBarFill'); if (bar) bar.style.width = volume + '%'; const slider = document.getElementById('volumeSlider'); if (slider) slider.value = volume; }
