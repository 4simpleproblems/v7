const API_BASE_URL = '/music-api';

// --- Proxy Helper ---
function getProxyUrl(url) {
    if (!url) return url;
    if (url.startsWith('data:')) return url;
    if (url.startsWith('//')) url = 'https:' + url;
    
    // Hardcoded absolute prefix for reliability
    const prefix = "/VELIUM/uv/service/";
    const origin = window.location.origin;
    
    // Check if it's already proxied (handle both relative and absolute forms)
    if (url.includes(prefix)) return url;

    // Direct encoding using Ultraviolet if available
    if (window.Ultraviolet && window.Ultraviolet.codec && window.Ultraviolet.codec.xor) {
        return origin + prefix + window.Ultraviolet.codec.xor.encode(url);
    }
    
    // Fallback to config-based encoding
    if (window.__uv$config && window.__uv$config.encodeUrl) {
        try {
            const encoded = window.__uv$config.encodeUrl(url);
            // If the wrapper returned the encoded version, prepend the prefix
            if (encoded !== url) {
                return origin + prefix + encoded;
            }
        } catch (e) {
            console.error("Proxy encoding failed", e);
        }
    }
    
    return url;
}

// --- State ---
let currentTrack = null;
let playlist = [];
let originalPlaylist = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 'off';
let favorites = loadFromStorage('favorites') || [];
let playlists = loadFromStorage('playlists') || [];
let player = null;
let progressInterval = null;
let volume = parseInt(loadFromStorage('volume')) || 70;

const popularArtists = [
    'The Weeknd', 'Drake', 'Post Malone', 'Dua Lipa', 'Ed Sheeran', 
    'Ariana Grande', 'Travis Scott', 'Olivia Rodrigo', 'Bad Bunny', 'SZA'
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
            initApp();
        });
        // Fallback if ready takes too long (e.g., 2 seconds)
        setTimeout(() => {
            if (!currentTrack && playlist.length === 0) initApp();
        }, 2000);
    } else {
        initApp();
    }
});

async function initApp() {
    setGreeting();
    setupEventListeners();
    loadPopularTracks();
    renderSidebarPlaylists();
    renderLibrary();
    updateVolumeUI();
}

function setupEventListeners() {
    // Nav View Switching
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
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
                searchTimeout = setTimeout(() => handleSearch(query), 500);
            } else {
                document.getElementById('searchResults').classList.add('hidden');
                document.getElementById('browseCategories').classList.remove('hidden');
            }
        });
    }

    // Search Tabs
    document.querySelectorAll('.search-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.search-tab').forEach(t => {
                t.classList.remove('active', 'bg-accent-indigo', 'text-white');
                t.classList.add('bg-card-dark', 'text-gray-400');
            });
            tab.classList.add('active', 'bg-accent-indigo', 'text-white');
            tab.classList.remove('bg-card-dark', 'text-gray-400');

            const tabName = tab.dataset.tab;
            document.querySelectorAll('.search-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });

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
            if (!player || typeof player.getDuration !== 'function') return;
            const rect = progressTrack.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            player.seekTo(player.getDuration() * percent);
        });
    }

    // Volume Slider
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            volume = parseInt(e.target.value);
            if (player) player.setVolume(volume);
            document.getElementById('volumeBarFill').style.width = volume + '%';
            saveToStorage('volume', volume);
        });
    }

    // Create Playlist Modal
    document.querySelector('.create-playlist-btn').addEventListener('click', showCreatePlaylistModal);
    document.getElementById('savePlaylistBtn').addEventListener('click', confirmCreatePlaylist);
}

// --- View Logic ---
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
        
        if (data.tracks) {
            renderTrackGrid(data.tracks.slice(0, 6), grid);
        }
    } catch (e) {
        console.error('Failed to load popular tracks', e);
    }
}

async function handleSearch(query) {
    const resultsDiv = document.getElementById('searchResults');
    const categoriesDiv = document.getElementById('browseCategories');
    const tracksGrid = document.getElementById('searchGrid');
    const albumsGrid = document.getElementById('albumsGrid');
    const artistsGrid = document.getElementById('artistsGrid');
    const playlistsGrid = document.getElementById('playlistsGrid');

    resultsDiv.classList.remove('hidden');
    categoriesDiv.classList.add('hidden');

    [tracksGrid, albumsGrid, artistsGrid, playlistsGrid].forEach(g => {
        if (g) g.innerHTML = '<div class="col-span-full py-20 flex justify-center"><i class="fas fa-circle-notch fa-spin text-3xl text-accent-indigo"></i></div>';
    });

    try {
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        renderTrackGrid(data.tracks, tracksGrid);
        renderAlbumGrid(data.albums, albumsGrid);
        renderArtistGrid(data.artists, artistsGrid);
        renderPlaylistGrid(data.playlists, playlistsGrid);
    } catch (e) {
        console.error('Search failed', e);
    }
}

function handleCategorySearch(category) {
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = category;
        handleSearch(category);
        
        // Automatically switch to playlists tab for categories
        const playlistsTab = document.querySelector('.search-tab[data-tab="playlists"]');
        if (playlistsTab) playlistsTab.click();
    }
}

// ... rendering grids ...

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
        data.tracks.forEach((track, index) => {
            const item = createTrackRow(track, index, data.tracks);
            list.appendChild(item);
        });

        currentDynamicPlaylist = data.tracks;
    } catch (e) {
        console.error('Failed to load playlist details', e);
    }
}

// --- Rendering ---
function renderTrackGrid(tracks, container) {
    if (!container) return;
    container.innerHTML = '';
    tracks.forEach((track, index) => {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.innerHTML = `
            <img src="${getProxyUrl(track.artwork_url)}" class="track-artwork" loading="lazy">
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

function renderAlbumGrid(albums, container) {
    if (!container) return;
    container.innerHTML = '';
    albums.forEach(album => {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.innerHTML = `
            <img src="${getProxyUrl(album.artwork_url)}" class="track-artwork" loading="lazy">
            <div class="font-bold text-sm truncate text-white mb-1">${escapeHtml(album.name)}</div>
            <div class="text-xs text-gray-500 truncate">${album.release_year} • ${escapeHtml(album.artist_name)}</div>
        `;
        card.addEventListener('click', () => loadAlbumDetails(album.id));
        container.appendChild(card);
    });
}

function renderArtistGrid(artists, container) {
    if (!container) return;
    container.innerHTML = '';
    artists.forEach(artist => {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.innerHTML = `
            <img src="${getProxyUrl(artist.image_url)}" class="track-artwork rounded-full" loading="lazy">
            <div class="text-center font-bold text-sm truncate text-white">${escapeHtml(artist.name)}</div>
            <div class="text-center text-xs text-gray-500">Artist</div>
        `;
        card.addEventListener('click', () => loadArtistDetails(artist.id));
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

function renderFavorites() {
    const list = document.getElementById('favoritesList');
    const count = document.getElementById('likedSongsCount');
    
    if (count) count.textContent = `${favorites.length} songs`;
    
    if (favorites.length === 0) {
        list.innerHTML = '<div class="py-20 text-center text-gray-500">Your liked songs will appear here.</div>';
        return;
    }

    list.innerHTML = '';
    favorites.forEach((track, index) => {
        const item = createTrackRow(track, index, favorites);
        list.appendChild(item);
    });
}

function createTrackRow(track, index, trackList) {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 group cursor-pointer border border-transparent hover:border-brand-border transition-all';
    div.innerHTML = `
        <div class="w-10 text-center text-gray-500 font-bold group-hover:hidden">${index + 1}</div>
        <div class="w-10 text-center text-accent-indigo hidden group-hover:block"><i class="fas fa-play"></i></div>
        <img src="${getProxyUrl(track.artwork_url)}" class="w-12 h-12 rounded-lg object-cover">
        <div class="flex-1 min-width-0">
            <div class="text-sm font-bold text-white truncate">${escapeHtml(track.title)}</div>
            <div class="text-xs text-gray-500 truncate">${escapeHtml(track.artist_name)}</div>
        </div>
        <div class="text-xs text-gray-500 font-mono hidden sm:block">${formatTime(track.duration / 1000)}</div>
        <button class="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><i class="fas fa-ellipsis-h"></i></button>
    `;
    div.addEventListener('click', () => {
        playlist = trackList;
        originalPlaylist = [...trackList];
        playTrack(index);
    });
    return div;
}

// --- Playback Logic ---
async function playTrack(index) {
    currentIndex = index;
    currentTrack = playlist[currentIndex];

    // Update UI
    document.getElementById('currentTrackName').textContent = currentTrack.title;
    document.getElementById('currentArtistName').textContent = currentTrack.artist_name;
    const artwork = document.getElementById('currentArtwork');
    artwork.src = getProxyUrl(currentTrack.artwork_url);
    artwork.classList.remove('hidden');
    document.getElementById('artworkPlaceholder').classList.add('hidden');

    updateLikeButtonStatus();

    // YouTube Search for video ID
    try {
        const query = `${currentTrack.title} ${currentTrack.artist_name} official audio`;
        const response = await fetch(`${API_BASE_URL}/youtube-search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.videoId) {
            loadYouTubePlayer(data.videoId);
        } else {
            console.error('No video found');
        }
    } catch (e) {
        console.error('Failed to get video ID', e);
    }
}

function loadYouTubePlayer(videoId) {
    if (window.YT && window.YT.Player) {
        if (player && typeof player.loadVideoById === 'function') {
            player.loadVideoById(videoId);
            player.playVideo();
        } else {
            player = new YT.Player('audioElement', {
                height: '0', width: '0',
                videoId: videoId,
                playerVars: { 
                    autoplay: 1, 
                    controls: 0, 
                    disablekb: 1,
                    origin: window.location.origin 
                },
                events: {
                    onReady: (e) => { e.target.setVolume(volume); e.target.playVideo(); },
                    onStateChange: onPlayerStateChange
                }
            });
        }
    } else {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        window.onYouTubeIframeAPIReady = () => loadYouTubePlayer(videoId);
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayPauseUI();
        startProgressUpdate();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayPauseUI();
        stopProgressUpdate();
    } else if (event.data === YT.PlayerState.ENDED) {
        playNext();
    }
}

function togglePlayPause() {
    if (!player || typeof player.pauseVideo !== 'function') return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
}

function updatePlayPauseUI() {
    const btn = document.getElementById('playPauseButton');
    btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

function playNext() {
    if (playlist.length === 0) return;
    let nextIndex = (currentIndex + 1) % playlist.length;
    if (isShuffle) nextIndex = Math.floor(Math.random() * playlist.length);
    playTrack(nextIndex);
}

function playPrev() {
    if (playlist.length === 0) return;
    let prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    playTrack(prevIndex);
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    document.getElementById('shuffleButton').classList.toggle('active', isShuffle);
}

function cycleRepeat() {
    const modes = ['off', 'all', 'one'];
    const currentModeIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentModeIndex + 1) % modes.length];
    
    const btn = document.getElementById('repeatButton');
    btn.classList.toggle('active', repeatMode !== 'off');
    btn.innerHTML = repeatMode === 'one' ? '<i class="fas fa-repeat"></i><span class="absolute text-[8px] font-bold mt-1">1</span>' : '<i class="fas fa-repeat"></i>';
}

// --- Storage & Helpers ---
async function loadLibraryData() {
    if (window.VeliumDB) {
        const lib = await window.VeliumDB.getLibrary();
        favorites = lib.likedSongs || [];
        playlists = lib.playlists || [];
    } else {
        favorites = loadFromStorage('favorites') || [];
        playlists = loadFromStorage('playlists') || [];
    }
}

async function saveLibraryData() {
    if (window.VeliumDB) {
        await window.VeliumDB.saveLibrary({ likedSongs: favorites, playlists: playlists });
    } else {
        saveToStorage('favorites', favorites);
        saveToStorage('playlists', playlists);
    }
}

function loadFromStorage(key) {
    const val = localStorage.getItem(`velium_v2_${key}`);
    return val ? JSON.parse(val) : null;
}

function saveToStorage(key, value) {
    localStorage.setItem(`velium_v2_${key}`, JSON.stringify(value));
}

// ... existing code ...

async function initApp() {
    await loadLibraryData(); // Load from DB first
    setGreeting();
    setupEventListeners();
    loadPopularTracks();
    renderSidebarPlaylists();
    renderLibrary();
    updateVolumeUI();
}

async function toggleLike() {
    if (!currentTrack) return;
    const index = favorites.findIndex(t => t.id === currentTrack.id);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(currentTrack);
    }
    await saveLibraryData();
    updateLikeButtonStatus();
    if (document.getElementById('favoritesView').classList.contains('active')) renderFavorites();
}

async function confirmCreatePlaylist() {
    const nameInput = document.getElementById('playlistNameInput');
    const name = nameInput.value.trim();
    if (name) {
        playlists.push({
            id: Date.now().toString(),
            name: name,
            description: document.getElementById('playlistDescInput').value.trim(),
            tracks: []
        });
        await saveLibraryData();
        renderSidebarPlaylists();
        hideCreatePlaylistModal();
    }
}

function renderSidebarPlaylists() {
    const container = document.getElementById('sidebar-playlists');
    if (!container) return;
    container.innerHTML = '';
    playlists.forEach(pl => {
        const item = document.createElement('div');
        item.className = 'nav-item';
        item.innerHTML = `<i class="fas fa-list"></i> <span class="truncate">${escapeHtml(pl.name)}</span>`;
        item.onclick = () => loadPlaylistView(pl.id);
        container.appendChild(item);
    });
}

function renderLibrary() {
    const container = document.getElementById('libraryContent');
    if (!container) return;
    container.innerHTML = '';
    
    // Liked Songs Card
    const likedCard = document.createElement('div');
    likedCard.className = 'track-card';
    likedCard.innerHTML = `
        <div class="w-full aspect-square bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center mb-4">
            <i class="fas fa-heart text-white text-5xl"></i>
        </div>
        <div class="font-bold text-white">Liked Songs</div>
        <div class="text-xs text-gray-500">${favorites.length} songs</div>
    `;
    likedCard.onclick = () => switchView('favorites');
    container.appendChild(likedCard);

    // Playlists
    playlists.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.innerHTML = `
            <div class="w-full aspect-square bg-card-dark border border-brand-border rounded-2xl flex items-center justify-center mb-4">
                <i class="fas fa-music text-gray-700 text-5xl"></i>
            </div>
            <div class="font-bold text-white truncate">${escapeHtml(pl.name)}</div>
            <div class="text-xs text-gray-500">${pl.tracks.length} songs</div>
        `;
        card.onclick = () => loadPlaylistView(pl.id);
        container.appendChild(card);
    });
}

// --- Detail Views ---
async function loadAlbumDetails(albumId) {
    switchView('dynamic');
    const container = document.getElementById('dynamicView');
    container.innerHTML = '<div class="py-20 flex justify-center"><i class="fas fa-circle-notch fa-spin text-3xl text-accent-indigo"></i></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/album/${albumId}`);
        const data = await response.json();

        container.innerHTML = `
            <div class="flex flex-col md:flex-row items-end gap-8 mb-10">
                <img src="${getProxyUrl(data.artwork_url)}" class="w-56 h-56 rounded-3xl shadow-2xl border border-brand-border">
                <div class="flex-1">
                    <span class="text-xs font-bold uppercase tracking-widest text-gray-400">Album</span>
                    <h1 class="text-6xl font-black tracking-tighter mb-4">${escapeHtml(data.name)}</h1>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-white">${escapeHtml(data.artists[0].name)}</span>
                        <span class="text-gray-500">•</span>
                        <span class="text-gray-500">${data.release_year}</span>
                        <span class="text-gray-500">•</span>
                        <span class="text-gray-500">${data.total_tracks} songs</span>
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
        data.tracks.forEach((track, index) => {
            const item = createTrackRow(track, index, data.tracks);
            list.appendChild(item);
        });

        currentDynamicPlaylist = data.tracks;
    } catch (e) {
        console.error('Failed to load album details', e);
    }
}

async function loadArtistDetails(artistId) {
    switchView('dynamic');
    const container = document.getElementById('dynamicView');
    container.innerHTML = '<div class="py-20 flex justify-center"><i class="fas fa-circle-notch fa-spin text-3xl text-accent-indigo"></i></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/artist/${artistId}`);
        const data = await response.json();

        container.innerHTML = `
            <div class="relative h-[40vh] -mx-8 -mt-8 mb-10 overflow-hidden">
                <img src="${getProxyUrl(data.image_url)}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div class="absolute bottom-10 left-10">
                    <div class="flex items-center gap-2 text-accent-indigo mb-2">
                        <i class="fas fa-check-circle"></i>
                        <span class="text-xs font-bold uppercase tracking-widest">Verified Artist</span>
                    </div>
                    <h1 class="text-8xl font-black tracking-tighter text-white mb-4">${escapeHtml(data.name)}</h1>
                    <div class="text-gray-300 font-bold">${formatNumber(data.followers)} followers</div>
                </div>
            </div>
            
            <div class="mb-12">
                <h2 class="text-2xl font-bold mb-6">Popular</h2>
                <div id="artistTopTracks" class="space-y-2"></div>
            </div>

            <div>
                <h2 class="text-2xl font-bold mb-6">Albums</h2>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6" id="artistAlbums"></div>
            </div>
        `;

        const list = document.getElementById('artistTopTracks');
        data.top_tracks.slice(0, 5).forEach((track, index) => {
            const item = createTrackRow(track, index, data.top_tracks);
            list.appendChild(item);
        });

        const albumsGrid = document.getElementById('artistAlbums');
        renderAlbumGrid(data.albums, albumsGrid);

        currentDynamicPlaylist = data.top_tracks;
    } catch (e) {
        console.error('Failed to load artist details', e);
    }
}

function loadPlaylistView(playlistId) {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;

    switchView('dynamic');
    const container = document.getElementById('dynamicView');
    
    container.innerHTML = `
        <div class="flex flex-col md:flex-row items-end gap-8 mb-10">
            <div class="w-56 h-56 bg-card-dark border border-brand-border rounded-3xl flex items-center justify-center shadow-2xl">
                <i class="fas fa-music text-gray-700 text-7xl"></i>
            </div>
            <div class="flex-1">
                <span class="text-xs font-bold uppercase tracking-widest text-gray-400">Playlist</span>
                <h1 class="text-7xl font-black tracking-tighter mb-4">${escapeHtml(pl.name)}</h1>
                <p class="text-gray-500 mb-4">${escapeHtml(pl.description || 'No description')}</p>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-white">${pl.tracks.length} songs</span>
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
    if (pl.tracks.length === 0) {
        list.innerHTML = '<div class="py-20 text-center text-gray-500">This playlist is empty. Add some songs!</div>';
    } else {
        pl.tracks.forEach((track, index) => {
            const item = createTrackRow(track, index, pl.tracks);
            list.appendChild(item);
        });
    }

    currentDynamicPlaylist = pl.tracks;
}

let currentDynamicPlaylist = [];
function playAllFromDynamic() {
    if (currentDynamicPlaylist.length > 0) {
        playlist = currentDynamicPlaylist;
        originalPlaylist = [...currentDynamicPlaylist];
        playTrack(0);
    }
}

function playAllFavorites() {
    if (favorites.length > 0) {
        playlist = favorites;
        originalPlaylist = [...favorites];
        playTrack(0);
    }
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
}

function escapeHtml(text) {
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

function startProgressUpdate() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (player && typeof player.getCurrentTime === 'function') {
            const current = player.getCurrentTime();
            const total = player.getDuration();
            if (total > 0) {
                const percent = (current / total) * 100;
                document.getElementById('progressBarFill').style.width = percent + '%';
                document.getElementById('currentTimeLabel').textContent = formatTime(current);
                document.getElementById('durationLabel').textContent = formatTime(total);
            }
        }
    }, 1000);
}

function stopProgressUpdate() {
    clearInterval(progressInterval);
}

function updateVolumeUI() {
    const bar = document.getElementById('volumeBarFill');
    if (bar) bar.style.width = volume + '%';
    const slider = document.getElementById('volumeSlider');
    if (slider) slider.value = volume;
}

function updateLikeButtonStatus() {
    if (!currentTrack) return;
    const isLiked = favorites.some(t => t.id === currentTrack.id);
    const btn = document.getElementById('likeButton');
    if (btn) btn.innerHTML = isLiked ? '<i class="fas fa-heart text-red-500"></i>' : '<i class="far fa-heart"></i>';
}

function showCreatePlaylistModal() {
    document.getElementById('createPlaylistModal').style.display = 'flex';
}

function hideCreatePlaylistModal() {
    document.getElementById('createPlaylistModal').style.display = 'none';
}

// Made with ❤️ from 4SP
