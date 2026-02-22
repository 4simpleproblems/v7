const urlInput = document.getElementById("link");
const launch = document.getElementById("launch");
const feedbackMessage = document.getElementById("feedbackMessage");
const videoPlayersContainer = document.getElementById("videoPlayersContainer");
const loadStatus = document.getElementById("loadStatus");
const unhelpfulText = document.getElementById("offtext");

// --- CONSTANTS ---
const INITIAL_VIDEO_WIDTH = 688;
const INITIAL_VIDEO_HEIGHT = 387;
const RESIZE_STEP = 0.10;
const ASPECT_RATIO = 0.5625;

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
    if (/playlist|\/channel\/|\/@/.test(url)) return null;
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

function preflightCheck(videoId) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let done = false;
        img.onload = () => {
            if (!done) {
                done = true;
                resolve();
            }
        };
        img.onerror = () => {
            if (!done) {
                done = true;
                reject("This video is unavailable or blocked.");
            }
        };
        img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        setTimeout(() => {
            if (!done) {
                done = true;
                reject("Network blocked video access.");
            }
        }, 1500);
    });
}

// --- PERSISTENCE UTILS ---
function saveOpenVideos() {
    const videos = [];
    const wrappers = videoPlayersContainer.querySelectorAll(
        ".video-unit-wrapper",
    );
    wrappers.forEach((wrapper) => {
        if (wrapper.dataset.videoId) {
            videos.push(wrapper.dataset.videoId);
        }
    });
    localStorage.setItem("savedVideos", JSON.stringify(videos));
}

function loadSavedVideos() {
    const saved = localStorage.getItem("savedVideos");
    if (saved) {
        try {
            const videoIds = JSON.parse(saved);
            [...videoIds].reverse().forEach((videoId) => {
                addVideoPlayer(videoId, false);
            });
        } catch (e) {
            console.error("Failed to load saved videos", e);
        }
    }
}

// --- VIDEO PLAYER LOGIC ---
function addVideoPlayer(videoId, showLoadedFeedback = true) {
    if (unhelpfulText) {
        unhelpfulText.classList.remove("active");
        unhelpfulText.style.display = "none";
    }

    if (!videoId) return showToast("Invalid YouTube URL.", true);

    const videoUnitWrapper = document.createElement("div");
    videoUnitWrapper.classList.add("video-unit-wrapper", "fade-in");
    videoUnitWrapper.dataset.videoId = videoId;

    // --- OPTIMIZED ATTRIBUTES ---
    const iframe = document.createElement("iframe");
    
    // Construct the YouTube embed URL
    const youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
    
    // Proxy the YouTube embed URL using UV
    if (self.__uv$config && Ultraviolet && Ultraviolet.codec && Ultraviolet.codec.xor) {
        const proxiedEmbedUrl = self.__uv$config.prefix + Ultraviolet.codec.xor.encode(youtubeEmbedUrl);
        iframe.src = proxiedEmbedUrl;
    } else {
        console.warn("UV proxy not fully initialized, falling back to direct embed.");
        iframe.src = youtubeEmbedUrl;
    }

    iframe.setAttribute("frameborder", "0");
    iframe.loading = "lazy";
    iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.borderRadius = "8px";

    // Spinner load
    const loadingOverlay = document.createElement("div");
    loadingOverlay.className = "video-loading-overlay";
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    loadingOverlay.appendChild(spinner);

    iframe.onload = () => {
        loadingOverlay.classList.add("hidden");
        setTimeout(() => loadingOverlay.remove(), 300);
    };

    const videoDisplay = document.createElement("div");
    videoDisplay.classList.add("video-display");
    videoDisplay.style.width = `${INITIAL_VIDEO_WIDTH}px`;
    videoDisplay.style.height = `${INITIAL_VIDEO_HEIGHT}px`;
    videoDisplay.dataset.initialWidth = INITIAL_VIDEO_WIDTH;
    videoDisplay.dataset.initialHeight = INITIAL_VIDEO_HEIGHT;

    const closeButton = document.createElement("button");
    closeButton.textContent = "X";
    closeButton.title = "Close Video";
    closeButton.classList.add("close-video-button");
    closeButton.addEventListener("click", () => {
        videoUnitWrapper.remove();
        saveOpenVideos();
        if (videoPlayersContainer.children.length === 0 && unhelpfulText) {
            unhelpfulText.classList.add("active");
            unhelpfulText.style.display = "block";
        }
    });

    videoDisplay.appendChild(loadingOverlay);
    videoDisplay.appendChild(iframe);
    videoDisplay.appendChild(closeButton);

    // --- CONTROLS SIDEBAR ---
    const sizeControls = document.createElement("div");
    sizeControls.classList.add("video-size-controls");

    const createCtrlBtn = (text, cls, title, action) => {
        const btn = document.createElement("button");
        btn.innerHTML = text;
        btn.className = `size-button ${cls}`;
        btn.title = title;
        btn.addEventListener("click", action);
        return btn;
    };

    // Plus
    sizeControls.appendChild(
        createCtrlBtn("+", "plus", "Increase Size", () => {
            const w = videoDisplay.offsetWidth * (1 + RESIZE_STEP);
            resizeVideoElement(videoDisplay, w);
        }),
    );

    // Minus
    sizeControls.appendChild(
        createCtrlBtn("\u2212", "minus", "Decrease Size", () => {
            const w = videoDisplay.offsetWidth * (1 - RESIZE_STEP);
            resizeVideoElement(videoDisplay, w);
        }),
    );

    // Reset
    sizeControls.appendChild(
        createCtrlBtn("\u21BA", "default", "Reset Size", () => {
            const w = parseInt(videoDisplay.dataset.initialWidth);
            resizeVideoElement(videoDisplay, w);
        }),
    );

    // Copy Button (SVG)
    const copySvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
    const copyBtn = createCtrlBtn(
        copySvg,
        "copy-mini",
        "Copy Video Link",
        () => {
            const finalLink = `https://www.youtube-nocookie.com/embed/${videoId}`;
            window.open(finalLink, '_blank').focus();
            navigator.clipboard.writeText(finalLink);
            showToast("Video Link Copied and Opened!");
        },
    );
    copyBtn.style.marginTop = "10px";
    copyBtn.style.backgroundColor = "#AB47BC";

    sizeControls.appendChild(copyBtn);

    videoUnitWrapper.appendChild(videoDisplay);
    videoUnitWrapper.appendChild(sizeControls);
    if (videoPlayersContainer) {
        videoPlayersContainer.prepend(videoUnitWrapper);
    } else {
        // Fallback if videoPlayersContainer is null, perhaps append to embed-container or another suitable element
        document.getElementById('embed-container').append(videoUnitWrapper);
    }

    if (typeof fadeInObserver !== "undefined")
        fadeInObserver.observe(videoUnitWrapper);

    if (showLoadedFeedback) {
        showToast("Video Loaded Successfully!");
    }
    saveOpenVideos();
}

function resizeVideoElement(elementToResize, newWidth) {
    const newHeight = newWidth * ASPECT_RATIO;
    elementToResize.style.width = `${Math.round(newWidth)}px`;
    elementToResize.style.height = `${Math.round(newHeight)}px`;
}

// --- LAUNCH HANDLER ---
if (launch) {
    launch.addEventListener("click", async () => {
        const url = urlInput.value.trim();
        if (!url) return showToast("Please paste a YouTube link first.");

        const videoId = extractVideoId(url);
        if (!videoId)
            return showToast("That doesn't look like a valid YouTube link.");

        launch.disabled = true;
        showToast("Checking availability...");

        try {
            await preflightCheck(videoId);
            addVideoPlayer(videoId);
            urlInput.value = "";
        } catch (err) {
            showToast(err);
        } finally {
            launch.disabled = false;
        }
    });
}

// --- Button Functions ---
function toggleOptimization() {
    const toggle = document.getElementById("optToggle");
    const statusText = document.getElementById("optStatusText");
    const isOpt = toggle.checked;

    localStorage.setItem("optimizedMode", isOpt);

    // Update Text UI
    if (isOpt) {
        statusText.textContent = "Enabled";
        statusText.classList.remove("disabled");
        statusText.classList.add("enabled");
        document.body.classList.add("optimized");
    } else {
        statusText.textContent = "Disabled";
        statusText.classList.remove("enabled");
        statusText.classList.add("disabled");
        document.body.classList.remove("optimized");
    }

    // Handle Particles visibility
    const pContainer = document.getElementById("particles-js");
    if (pContainer) pContainer.style.display = isOpt ? "none" : "block";
}

function clearAllVideos() {
    videoPlayersContainer.innerHTML = "";
    if (unhelpfulText) {
        unhelpfulText.classList.add("active");
        unhelpfulText.style.display = "block";
    }
    localStorage.removeItem("savedVideos");
}

async function loadCommentsForVideo(videoId) {
    const commentsContainer = document.getElementById('comments-container'); // Assuming an element with this ID exists
    if (!commentsContainer) return;

    commentsContainer.innerHTML = '<p class="text-gray-500 text-center">Loading comments...</p>';

    try {
        const response = await fetch(`/api/comments.mjs?videoId=${videoId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch comments: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.comments && data.comments.length > 0) {
            commentsContainer.innerHTML = data.comments.map(comment => `
                <div class="comment-item border-b border-brand-border py-4">
                    <p class="text-white font-medium">${comment.author}</p>
                    <p class="text-gray-400 text-sm">${comment.text}</p>
                    <p class="text-gray-600 text-xs">${comment.time}</p>
                </div>
            `).join('');
        } else {
            commentsContainer.innerHTML = '<p class="text-gray-500 text-center">No comments found.</p>';
        }
    } catch (error) {
        console.error("Error loading comments:", error);
        commentsContainer.innerHTML = '<p class="text-red-500 text-center">Failed to load comments.</p>';
    }
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
            const pContainer = document.getElementById("particles-js");
            if (pContainer) pContainer.style.display = "none";
        } else {
            statusText.classList.add("disabled");
        }
    }
    loadSavedVideos();
});

// Toggle Instructions
const instBox = document.getElementById("instructions");
const settingsBox = document.getElementById("settings");
const hideBtn = document.querySelector(".hide-button");
const showBtn = document.querySelector(".show-button");

if (hideBtn && showBtn && instBox && settingsBox) {
    hideBtn.onclick = () => {
        instBox.style.display = "none";
        settingsBox.style.display = "none";
        showBtn.style.display = "block";
    };
    showBtn.onclick = () => {
        instBox.style.display = "block";
        settingsBox.style.display = "block";
        showBtn.style.display = "none";
    };
}

function showComments() {
    const commentsContainer = document.getElementById('comments-container');
    if (commentsContainer) {
        if (commentsContainer.classList.contains('hidden')) {
            commentsContainer.classList.remove('hidden');
            const currentVideoId = document.querySelector('.video-unit-wrapper.active')?.dataset.videoId || document.querySelector('#youtube-embed')?.src.match(/embed\/([\w-]{11})/)?.[1];
            if (currentVideoId) {
                loadCommentsForVideo(currentVideoId);
            }
        } else {
            commentsContainer.classList.add('hidden');
        }
    }
}

// --- SEARCH LOGIC ---
const searchInput = document.getElementById('searchInput');
const videoGrid = document.getElementById('videoGrid');
const dynamicSection = document.getElementById('dynamic-section');
const noResultsMessage = document.getElementById('noResultsMessage');

let searchTimeout;

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query) {
            searchTimeout = setTimeout(() => handleSearch(query), 500);
        } else {
            videoGrid.innerHTML = '';
            dynamicSection.classList.remove('active');
            noResultsMessage.style.display = 'block';
        }
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
        const response = await fetch(`/music-api/youtube-search?q=${encodeURIComponent(query)}`);
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
                    addVideoPlayer(video.id, true); // Use addVideoPlayer for found video
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