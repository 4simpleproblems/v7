const urlInput = document.getElementById("searchInput"); // Changed to searchInput for single player model
const launch = null; // No longer needed for single player
const feedbackMessage = null; // No longer needed
const videoPlayersContainer = null; // No longer needed
const loadStatus = null; // No longer needed
const unhelpfulText = document.getElementById("noResultsMessage"); // Re-purpose for search feedback

const VIRA_API_BASE = '/music-api'; // Use existing music-api endpoint for YouTube related queries.

// --- CONSTANTS ---
const RESIZE_STEP = 0.10;
const ASPECT_RATIO = 0.5625;

let currentVideoId = null; // Track the currently loaded video ID

function showToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.className = "toast-notification";
    if (isError) toast.style.borderColor = "#D73939"; // Red border for errors
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function extractVideoId(url) {
    // Already in utils.js, but keeping a local copy for robustness in Vira
    if (!url) return null;
    if (/playlist|\/channel\/|\/@/.test(url)) return null; // Vira focuses on single videos
    const patterns = [
        /youtu\.be\/([\w-]{11})/,
        /[?&]v=([\w-]{11})/,
        /embed\/([\w-]{11})/,
        /shorts\/([\w-]{11})/,
        /googleusercontent\.com\/youtube\.com\/5\/([\w-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

// --- VIDEO PLAYER LOGIC ---
async function loadVideoIntoPlayer(videoId) {
    const playerSection = document.getElementById('player-section');
    const youtubeEmbed = document.getElementById('youtube-embed');
    const playerTitle = document.getElementById('player-title');
    const playerMetadata = document.getElementById('player-metadata');
    const playerDescription = document.getElementById('player-description');
    
    if (!playerSection || !youtubeEmbed || !playerTitle || !playerMetadata || !playerDescription) return;

    playerSection.classList.remove('hidden'); // Show player section
    videoGrid.innerHTML = ''; // Clear search results

    currentVideoId = videoId;
    
    // Construct the YouTube embed URL
    const youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
    
    // Proxy the YouTube embed URL using UV
    if (self.__uv$config && Ultraviolet && Ultraviolet.codec && Ultraviolet.codec.xor) {
        const proxiedEmbedUrl = self.__uv$config.prefix + Ultraviolet.codec.xor.encode(youtubeEmbedUrl);
        youtubeEmbed.src = proxiedEmbedUrl;
    } else {
        console.warn("UV proxy not fully initialized, falling back to direct embed.");
        youtubeEmbed.src = youtubeEmbedUrl;
    }

    // Fetch video details (title, author, likes, description)
    try {
        const response = await fetch(`${VIRA_API_BASE}/videoDetails/${videoId}`);
        if (!response.ok) throw new Error('Failed to fetch video details.');
        const details = await response.json();

        playerTitle.textContent = details.title || 'Video Title';
        playerMetadata.textContent = `${details.author?.name || 'Unknown'} • ${formatCount(details.viewCount)} views • ${formatDate(details.published)}`;
        playerDescription.textContent = details.description || 'No description available.';
        
        // Show comments section and load comments
        showComments(videoId);

    } catch (error) {
        console.error("Error fetching video details:", error);
        playerTitle.textContent = 'Error Loading Video';
        playerMetadata.textContent = 'Details unavailable.';
        playerDescription.textContent = 'Could not load video details.';
        document.getElementById('comments-container').innerHTML = '<p class="text-red-500 text-center">Failed to load comments.</p>';
    }
}

function closePlayer() {
    const playerSection = document.getElementById('player-section');
    const youtubeEmbed = document.getElementById('youtube-embed');
    if (playerSection) playerSection.classList.add('hidden');
    if (youtubeEmbed) youtubeEmbed.src = ''; // Stop video playback
    currentVideoId = null;
}

// Utility to format large numbers
function formatCount(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
}

// Utility to format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// --- SEARCH LOGIC ---
const searchInput = document.getElementById('searchInput');
const videoGrid = document.getElementById('videoGrid');
const dynamicSection = document.getElementById('dynamic-section');
const noResultsMessage = document.getElementById('noResultsMessage');
const searchCloseBtn = document.getElementById('searchCloseBtn');

let searchTimeout;

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query) {
            searchCloseBtn.classList.remove('hidden');
            searchTimeout = setTimeout(() => handleSearch(query), 500);
        } else {
            searchCloseBtn.classList.add('hidden');
            videoGrid.innerHTML = '';
            dynamicSection.classList.remove('active');
            noResultsMessage.style.display = 'block';
        }
    });
    searchCloseBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchCloseBtn.classList.add('hidden');
        videoGrid.innerHTML = '';
        dynamicSection.classList.remove('active');
        noResultsMessage.style.display = 'block';
    });
}

async function handleSearch(query) {
    if (!query) {
        videoGrid.innerHTML = '';
        dynamicSection.classList.remove('active');
        noResultsMessage.style.display = 'block';
        return;
    }

    dynamicSection.classList.add('active');
    videoGrid.innerHTML = '<p class="text-gray-500 text-center col-span-full"><i class="fas fa-circle-notch fa-spin text-accent-red"></i> Searching...</p>';
    noResultsMessage.style.display = 'none';

    try {
        const response = await fetch(`${VIRA_API_BASE}/youtube-search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            videoGrid.innerHTML = ''; // Clear previous results
            data.results.forEach(video => {
                const videoItem = document.createElement('div');
                videoItem.className = 'video-item';
                videoItem.onclick = () => {
                    loadVideoIntoPlayer(video.id); // Load into main player
                    // Optionally scroll to top to see the new player
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
                videoItem.innerHTML = `
                    <div class="thumbnail-container">
                        <img src="${video.thumbnails?.[0]?.url || ''}" alt="${video.title}">
                        <div class="play-overlay">
                            <i class="fas fa-play text-white text-3xl"></i>
                        </div>
                    </div>
                    <div class="p-4">
                        <h3 class="text-white text-md font-medium truncate">${video.title}</h3>
                        <p class="text-gray-400 text-sm">${video.author?.name || 'Unknown'}</p>
                    </div>
                `;
                videoGrid.appendChild(videoItem);
            });
            noResultsMessage.style.display = 'none';
        } else {
            videoGrid.innerHTML = '<p class="text-gray-500 text-center col-span-full">No videos found for your search.</p>';
            noResultsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error("Error during search:", error);
        videoGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Failed to perform search.</p>';
        noResultsMessage.style.display = 'block';
    }
}

// --- PLAYLIST LOGIC (Existing) ---
let playlists = JSON.parse(localStorage.getItem('viraPlaylists')) || [];
let currentVideoPlaying = null; // Used for playlists to know what to add

function savePlaylists() {
    localStorage.setItem('viraPlaylists', JSON.stringify(playlists));
}

function renderPlaylists() {
    const playlistList = document.getElementById('playlist-list');
    if (!playlistList) return;

    playlistList.innerHTML = ''; // Clear existing list

    playlists.forEach(playlist => {
        const playlistItem = document.createElement('a');
        playlistItem.href = `javascript:void(0)`;
        playlistItem.className = 'nav-link';
        playlistItem.innerHTML = `<i class="fas fa-list"></i> <span>${playlist.name}</span>`;
        playlistItem.onclick = () => showPlaylistVideos(playlist.id);
        playlistList.appendChild(playlistItem);
    });
}

function showPlaylistVideos(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    dynamicSection.classList.add('active');
    document.getElementById('dynamic-title').textContent = playlist.name;
    videoGrid.innerHTML = ''; // Clear existing videos

    if (playlist.videos.length > 0) {
        playlist.videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.onclick = () => {
                loadVideoIntoPlayer(video.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            videoItem.innerHTML = `
                <div class="thumbnail-container">
                    <img src="${video.thumbnails?.[0]?.url || ''}" alt="${video.title}">
                    <div class="play-overlay">
                        <i class="fas fa-play text-white text-3xl"></i>
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="text-white text-md font-medium truncate">${video.title}</h3>
                    <p class="text-gray-400 text-sm">${video.author?.name || 'Unknown'}</p>
                </div>
            `;
            videoGrid.appendChild(videoItem);
        });
        noResultsMessage.style.display = 'none';
    } else {
        videoGrid.innerHTML = '<p class="text-gray-500 text-center col-span-full">This playlist is empty.</p>';
    }
}

function openCreatePlaylistModal() {
    const modal = document.getElementById('create-playlist-modal');
    if (modal) modal.style.display = 'flex';
}

function confirmCreatePlaylist() {
    const newPlaylistNameInput = document.getElementById('new-playlist-name');
    const name = newPlaylistNameInput.value.trim();
    if (name) {
        const newPlaylist = {
            id: Date.now().toString(),
            name: name,
            videos: []
        };
        playlists.push(newPlaylist);
        savePlaylists();
        renderPlaylists();
        closeModals();
        showToast(`Playlist "${name}" created!`);
    } else {
        showToast("Playlist name cannot be empty.", true);
    }
}

function openAddToPlaylistModal(videoId) {
    currentVideoPlaying = videoId; // Store video ID to add
    const modal = document.getElementById('add-to-playlist-modal');
    if (modal) modal.style.display = 'flex';
    renderAddToPlaylistModalList();
}

function renderAddToPlaylistModalList() {
    const modalPlaylistList = document.getElementById('modal-playlist-list');
    if (!modalPlaylistList) return;

    modalPlaylistList.innerHTML = '';
    if (playlists.length === 0) {
        modalPlaylistList.innerHTML = '<p class="text-gray-500 text-center">No playlists available. Create one first!</p>';
        return;
    }

    playlists.forEach(playlist => {
        const playlistItem = document.createElement('button');
        playlistItem.className = 'w-full text-left p-3 hover:bg-white/5 rounded-[10px] transition-all flex items-center gap-3';
        playlistItem.innerHTML = `<i class="fas fa-list text-gray-400"></i><span class="text-white">${playlist.name}</span>`;
        playlistItem.onclick = () => addVideoToPlaylist(playlist.id, currentVideoPlaying);
        modalPlaylistList.appendChild(playlistItem);
    });
}

function addVideoToPlaylist(playlistId, videoId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    if (!playlist.videos.some(v => v.id === videoId)) {
        // Fetch video details to save (thumbnail, title, author)
        fetch(`${VIRA_API_BASE}/videoDetails?videoId=${videoId}`)
            .then(res => res.json())
            .then(details => {
                playlist.videos.push({
                    id: videoId,
                    title: details.title,
                    author: details.author,
                    thumbnails: details.thumbnails // Save thumbnails to display in playlist view
                });
                savePlaylists();
                renderPlaylists();
                closeModals();
                showToast(`Video added to "${playlist.name}"!`);
            })
            .catch(error => {
                console.error("Error fetching video details for playlist:", error);
                showToast("Failed to add video to playlist. Could not fetch details.", true);
            });
    } else {
        showToast("Video already in this playlist.", false);
    }
}

function closeModals() {
    document.getElementById('create-playlist-modal').style.display = 'none';
    document.getElementById('add-to-playlist-modal').style.display = 'none';
}

// --- INIT for home---
document.addEventListener("DOMContentLoaded", () => {
    // Check saved mode for switch
    const savedMode = localStorage.getItem("optimizedMode") === "true";
    const toggle = document.getElementById("optToggle");

    // Set initial UI state
    if (toggle) {
        toggle.checked = savedMode;
        const statusText = document.getElementById("optStatusText");
        if (savedMode) {
            statusText.textContent = "Enabled";
            statusText.classList.add("enabled");
            document.body.classList.add("optimized");
            // const pContainer = document.getElementById("particles-js"); // No particles in Vira
            // if (pContainer) pContainer.style.display = "none";
        } else {
            statusText.classList.add("disabled");
        }
    }
    // loadSavedVideos(); // No longer used for single player model
    renderPlaylists();
});

// Toggle Instructions
// const instBox = document.getElementById("instructions"); // No instructions in Vira
// const settingsBox = document.getElementById("settings"); // No settings in Vira
// const hideBtn = document.querySelector(".hide-button");
// const showBtn = document.querySelector(".show-button");

// if (hideBtn && showBtn && instBox && settingsBox) {
//     hideBtn.onclick = () => {
//         instBox.style.display = "none";
//         settingsBox.style.display = "none";
//         showBtn.style.display = "block";
//     };
//     showBtn.onclick = () => {
//         instBox.style.display = "block";
//         settingsBox.style.display = "block";
//         showBtn.style.display = "none";
//     };
// }

function showComments(videoId) { // Modified to accept videoId
    const commentsContainer = document.getElementById('comments-container');
    if (!commentsContainer) return;

    commentsContainer.innerHTML = '<p class="text-gray-500 text-center">Loading comments...</p>';

    try {
        fetch(`/api/comments/${videoId}`) // Use the new comments API
            .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch comments: ${response.statusText}`);
                return response.json();
            })
            .then(data => {
                if (data.comments && data.comments.length > 0) {
                    commentsContainer.innerHTML = `
                        <h4 class="text-white text-lg font-medium mb-4">Comments (${data.comments.length})</h4>
                        ${data.comments.map(comment => `
                            <div class="comment-item border-b border-brand-border py-4">
                                <p class="text-white font-medium">${comment.author}</p>
                                <p class="text-gray-400 text-sm">${comment.text}</p>
                                <p class="text-gray-600 text-xs">${comment.time}</p>
                            </div>
                        `).join('')}
                    `;
                } else {
                    commentsContainer.innerHTML = '<p class="text-gray-500 text-center">No comments found.</p>';
                }
            })
            .catch(error => {
                console.error("Error loading comments:", error);
                commentsContainer.innerHTML = '<p class="text-red-500 text-center">Failed to load comments.</p>';
            });
    } catch (error) {
        console.error("Error loading comments:", error);
        commentsContainer.innerHTML = '<p class="text-red-500 text-center">Failed to load comments.</p>';
    }
}

// Made with ❤️ from 4SP
