(function() {
    const MIRRORS = [
        'https://streamed.pk/api',
        'https://streamed.ad/api',
        'https://strmd.link/api'
    ];
    let mirrorIndex = 0;
    const PROXY_PREFIX = '/VERN/uv/service/';
    
    // State
    let currentSport = 'all';
    let allMatches = [];
    let sports = [];
    let searchTimeout;

    // --- API Logic ---
    function getProxyUrl(url) {
        if (!url) return '';
        if (url.startsWith('http')) {
            return location.origin + PROXY_PREFIX + Ultraviolet.codec.xor.encode(url);
        }
        return url;
    }

    async function fetchSportsData(path) {
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        const currentBase = MIRRORS[mirrorIndex];
        const url = `${currentBase}/${cleanPath}`;
        const proxied = getProxyUrl(url);
        
        try {
            const response = await fetch(proxied, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': currentBase.replace('/api', '') + '/'
                }
            });
            
            if (response.status === 404 && mirrorIndex < MIRRORS.length - 1) {
                console.warn(`Mirror ${MIRRORS[mirrorIndex]} returned 404, rotating...`);
                mirrorIndex++;
                return fetchSportsData(path);
            }

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data;
        } catch (e) {
            console.error("Valo API Error:", e);
            if (mirrorIndex < MIRRORS.length - 1) {
                mirrorIndex++;
                return fetchSportsData(path);
            }
            return null;
        }
    }

    const SportsAPI = {
        getSports: () => fetchSportsData('sports'),
        getMatches: (sport = 'all') => fetchSportsData(`matches/${sport === 'all' ? 'all' : sport}`),
        getLiveMatches: () => fetchSportsData('matches/live'),
        getStreams: (source, id) => fetchSportsData(`stream/${source}/${id}`),
        getTeamBadge: (id) => id ? `https://images.weserv.nl/?url=${encodeURIComponent(`${MIRRORS[mirrorIndex]}/images/badge/${id}.webp`)}&w=100&h=100&fit=contain` : '/images/logo.png'
    };

    // --- UI Logic ---
    async function init() {
        // Load categories
        const sportsData = await SportsAPI.getSports();
        if (sportsData) {
            sports = Array.isArray(sportsData) ? sportsData : (sportsData.sports || []);
            renderSidebar();
            renderSportChips();
        }
        
        // Load initial matches
        loadMatches();
        setupSearch();
    }

    function renderSidebar() {
        const container = document.getElementById('sports-list');
        if (!container) return;
        
        container.innerHTML = sports.map(sport => `
            <div class="nav-item ${currentSport === sport.id ? 'active' : ''}" onclick="switchSport('${sport.id}')" id="nav-${sport.id}">
                <i class="fas ${getSportIcon(sport.id)}"></i>
                <span>${sport.name}</span>
            </div>
        `).join('');
    }

    function renderSportChips() {
        const container = document.getElementById('sport-chips');
        if (!container) return;

        const baseChips = `
            <div class="sport-chip ${currentSport === 'all' ? 'active' : ''}" id="chip-all" onclick="switchSport('all')">All Events</div>
            <div class="sport-chip ${currentSport === 'live' ? 'active' : ''}" id="chip-live" onclick="switchSport('live')">Live Now</div>
        `;

        container.innerHTML = baseChips + sports.map(sport => `
            <div class="sport-chip ${currentSport === sport.id ? 'active' : ''}" id="chip-${sport.id}" onclick="switchSport('${sport.id}')">${sport.name}</div>
        `).join('');
    }

    async function loadMatches() {
        const grid = document.getElementById('matches-grid');
        grid.innerHTML = '<div class="col-span-full py-20 text-center"><i class="fas fa-spinner fa-spin text-4xl opacity-20"></i></div>';

        let data;
        if (currentSport === 'live') {
            data = await SportsAPI.getLiveMatches();
        } else {
            data = await SportsAPI.getMatches(currentSport);
        }

        if (!data) {
            grid.innerHTML = '<div class="col-span-full py-20 text-center opacity-40">Failed to connect to sports arena. Retrying...</div>';
            setTimeout(loadMatches, 5000);
            return;
        }

        allMatches = Array.isArray(data) ? data : (data.matches || []);

        if (allMatches.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-20 text-center opacity-40">No active events found.</div>';
            return;
        }

        renderMatches(allMatches);
    }

    function renderMatches(matches) {
        const grid = document.getElementById('matches-grid');
        grid.innerHTML = matches.map(match => {
            const isLive = match.status?.toLowerCase() === 'live';
            const homeBadge = SportsAPI.getTeamBadge(match.home_team?.badge || match.home_badge);
            const awayBadge = SportsAPI.getTeamBadge(match.away_team?.badge || match.away_badge);
            
            // Logic from docs: use sources array
            const firstSource = (match.sources && match.sources[0]) ? match.sources[0] : { source: match.source, id: match.id };
            
            if (!firstSource.source || !firstSource.id) return '';

            return `
                <div class="match-card group" onclick="playMatch('${firstSource.source}', '${firstSource.id}', '${(match.title || 'Match').replace(/'/g, "\\'")}')">
                    <div class="flex justify-between items-start mb-6">
                        <span class="status-badge ${isLive ? 'live' : ''}">${match.status || 'Scheduled'}</span>
                        <span class="text-[10px] opacity-40 uppercase font-bold">${match.sport_id || 'Sports'}</span>
                    </div>
                    
                    <div class="flex items-center justify-between gap-4 mb-8">
                        <div class="flex flex-col items-center gap-3 flex-1 text-center">
                            <img src="${homeBadge}" class="team-logo" onerror="this.src='/images/logo.png'">
                            <span class="text-xs font-bold text-white line-clamp-2 h-8">${match.home_team?.name || match.home_name || 'Home'}</span>
                        </div>
                        
                        <div class="flex flex-col items-center gap-1">
                            <span class="text-2xl font-black text-white italic">VS</span>
                            ${match.score ? `<span class="text-sm font-mono text-[var(--accent-orange)]">${match.score}</span>` : ''}
                        </div>

                        <div class="flex flex-col items-center gap-3 flex-1 text-center">
                            <img src="${awayBadge}" class="team-logo" onerror="this.src='/images/logo.png'">
                            <span class="text-xs font-bold text-white line-clamp-2 h-8">${match.away_team?.name || match.away_name || 'Away'}</span>
                        </div>
                    </div>

                    <div class="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div class="flex flex-col">
                            <span class="text-[10px] opacity-40 uppercase font-bold">Tournament</span>
                            <span class="text-[11px] text-white font-medium truncate max-w-[150px]">${match.league || 'Global'}</span>
                        </div>
                        <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[var(--accent-orange)] transition-colors">
                            <i class="fas fa-play text-[10px] text-white"></i>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.switchSport = function(sportId) {
        currentSport = sportId;
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const activeNav = document.getElementById('nav-' + sportId);
        if (activeNav) activeNav.classList.add('active');
        document.querySelectorAll('.sport-chip').forEach(el => el.classList.remove('active'));
        const activeChip = document.getElementById('chip-' + sportId);
        if (activeChip) activeChip.classList.add('active');
        loadMatches();
    };

    window.playMatch = async (source, id, title) => {
        const modal = document.getElementById('player-modal');
        const container = document.getElementById('stream-container');
        const info = document.getElementById('active-stream-info');
        const streamTitle = document.getElementById('stream-title');

        modal.style.display = 'flex';
        container.innerHTML = '<div class="flex items-center justify-center h-full"><i class="fas fa-spinner fa-spin text-4xl text-white opacity-20"></i></div>';

        const streams = await SportsAPI.getStreams(source, id);
        if (!streams || !streams.streams || streams.streams.length === 0) {
            container.innerHTML = '<div class="flex items-center justify-center h-full text-white opacity-40">No streams available for this match.</div>';
            return;
        }

        const stream = streams.streams[0];
        const streamUrl = getProxyUrl(stream.url);
        
        container.innerHTML = `<iframe src="${streamUrl}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`;
        
        if (info && streamTitle) {
            info.classList.remove('hidden');
            info.classList.add('flex');
            streamTitle.textContent = title;
        }
    };

    window.closeStream = () => {
        const modal = document.getElementById('player-modal');
        const container = document.getElementById('stream-container');
        modal.style.display = 'none';
        container.innerHTML = '';
    };

    function setupSearch() {
        const input = document.getElementById('searchInput');
        if (!input) return;
        input.oninput = (e) => {
            clearTimeout(searchTimeout);
            const val = e.target.value.toLowerCase();
            searchTimeout = setTimeout(() => {
                if (!val) {
                    renderMatches(allMatches);
                    return;
                }
                const filtered = allMatches.filter(m => 
                    (m.title && m.title.toLowerCase().includes(val)) || 
                    (m.league && m.league.toLowerCase().includes(val)) ||
                    (m.home_team?.name && m.home_team.name.toLowerCase().includes(val)) ||
                    (m.away_team?.name && m.away_team.name.toLowerCase().includes(val))
                );
                renderMatches(filtered);
            }, 300);
        };
    }

    function getSportIcon(id) {
        const icons = {
            'football': 'fa-soccer-ball', 'basketball': 'fa-basketball-ball', 'tennis': 'fa-tennis-ball',
            'hockey': 'fa-hockey-puck', 'baseball': 'fa-baseball-ball', 'mma': 'fa-hand-fist',
            'boxing': 'fa-hand-fist', 'cricket': 'fa-bat-ball', 'golf': 'fa-golf-ball',
            'racing': 'fa-car', 'nfl': 'fa-football-ball'
        };
        return icons[id] || 'fa-trophy';
    }

    init();
})();
// Made with ❤️ from 4SP
