const MUSIC_API_BASE = 'https://bhindi1.ddns.net/music/api';
const SAAVN_API_BASE = 'https://jiosaavn-api-privatecvc2.vercel.app';
const SAAVN_API = SAAVN_API_BASE;

// Helper to get YouTube search
let youtubeInstance = null;
let isInitializing = false;

async function getYoutube() {
  if (youtubeInstance) return youtubeInstance;
  if (isInitializing) {
      while (isInitializing) await new Promise(r => setTimeout(r, 100));
      if (youtubeInstance) return youtubeInstance;
  }

  isInitializing = true;
  try {
      const { Innertube } = await import('youtubei.js');
      youtubeInstance = await Innertube.create({
          cache: null,
          generate_session_locally: true
      });
      isInitializing = false;
      return youtubeInstance;
  } catch (e) {
      isInitializing = false;
      console.error('API: Critical failure initializing Innertube', e);
      throw new Error(`Innertube initialization failed: ${e.message}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = pathname.split('/').filter(Boolean);
  const endpointFromPath = pathParts[pathParts.length - 1];
  const { q, query, offset, id, endpoint: endpointFromQuery } = req.query;
  const endpoint = (endpointFromQuery || endpointFromPath);

  try {
    // 1. Suggestions
    if (endpoint === 'suggestions') {
      const searchQuery = q || query;
      if (!searchQuery) return res.status(400).json({ error: 'Missing query' });
      
      try {
          const yt = await getYoutube();
          const suggestions = await yt.music.getSearchSuggestions(searchQuery);
          
          return res.status(200).json({ 
              suggestions: suggestions.map(s => ({
                  name: s.toString(),
                  type: 'Search'
              }))
          });
      } catch (e) {
          console.error('YT Music suggestions failed', e);
          return res.status(200).json({ suggestions: [] });
      }
    }

    // 2. Search
    if (endpoint === 'search') {
      const searchQuery = q || query;
      if (!searchQuery) return res.status(400).json({ error: 'Missing query' });
      
      const [musicApiRes, ytMusicRes, argonRes] = await Promise.all([
        // Provider 1: MusicAPI (External Fallback/Extra)
        fetch(`${MUSIC_API_BASE}/prepare/${encodeURIComponent(searchQuery)}`)
            .then(r => r.ok ? r.json() : null)
            .then(async data => {
                if (data && data.ID) {
                    const songData = await fetch(`${MUSIC_API_BASE}/fetch/${data.ID}`).then(r => r.ok ? r.json() : null);
                    return songData;
                }
                return null;
            })
            .catch(() => null),
        // Provider 2: YT Music (Local Logic via youtubei.js)
        getYoutube().then(async yt => {
            try {
                const search = await yt.music.search(searchQuery);
                console.log('API: Raw YT Music search results (general search):', JSON.stringify(search, null, 2)); // Add this log
                
                const contents = {
                    songs: search.songs || [],
                    albums: search.albums || [],
                    artists: search.artists || []
                };

                const topResult = search.sections.find(s => s.title?.toString().toLowerCase().includes('top result'))?.contents?.[0];
                if (topResult && topResult.type === 'MusicResponsiveListItem') {
                    const itemType = topResult.item_type?.toLowerCase() || '';
                    if (itemType.includes('song')) contents.songs.unshift(topResult);
                    else if (itemType.includes('album')) contents.albums.unshift(topResult);
                    else if (itemType.includes('artist')) contents.artists.unshift(topResult);
                }

                return contents;
            } catch (e) {
                console.error('YT Music search failed', e);
                return { songs: [], albums: [], artists: [] };
            }
        }).catch(() => ({ songs: [], albums: [], artists: [] })),
        // Provider 3: Argon API
        fetch(`https://argon.global.ssl.fastly.net/api/search?query=${encodeURIComponent(searchQuery)}&limit=20`)
            .then(r => r.ok ? r.json() : { collection: [] })
            .catch(() => ({ collection: [] }))
      ]);

      let tracks = [];
      
      if (musicApiRes && musicApiRes.SONG_NAME) {
          tracks.push({
              id: `mapi-${musicApiRes.ID}`,
              title: musicApiRes.SONG_NAME,
              artist_name: 'MusicAPI Result',
              artwork_url: musicApiRes.THUMBNAIL,
              duration: musicApiRes.DURATION * 1000,
              downloadUrl: [{ quality: '320kbps', link: musicApiRes.AUDIO_URL }],
              source: 'MusicAPI'
          });
      }

      if (ytMusicRes.songs) {
          const ytTracks = ytMusicRes.songs.map(item => {
              if (item.type !== 'MusicResponsiveListItem') return null;
              
              const title = item.title?.toString() || item.name?.toString() || 'Unknown Title';
              const artist = item.artists?.[0]?.name?.toString() || item.author?.name?.toString() || 'YT Music Artist';
              const artistId = item.artists?.[0]?.id || item.author?.id;
              
              const thumbnail = item.thumbnails?.[0]?.url || item.thumbnail?.url;
              const duration = (item.duration?.seconds || 0) * 1000;

              // Ensure item.id is present and use it, otherwise generate a unique ID
              const trackId = item.id ? `ytm-${item.id}` : `ytm-generated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

              return {
                  id: trackId, // Use the robustly generated trackId
                  title: title,
                  artist_name: artist,
                  artist_id: artistId ? `ytm-${artistId}` : null,
                  artwork_url: thumbnail,
                  duration: duration,
                  youtube_id: item.id, // Keep original item.id as youtube_id
                  source: 'YTMusic'
              };
          }).filter(Boolean);
          tracks.push(...ytTracks);
      }

      // Add Argon tracks
      if (argonRes.collection && Array.isArray(argonRes.collection)) {
          const ARGON_BASE = 'https://argon.global.ssl.fastly.net';
          const argonTracks = argonRes.collection.map(item => {
              let artwork = item.song?.img?.big || item.song?.img?.small || (Array.isArray(item.image) ? item.image[item.image.length-1].link : item.image);
              if (artwork && artwork.startsWith('/api/')) artwork = ARGON_BASE + artwork;
              
              return {
                  id: `argon-${item.id}`,
                  title: item.song?.name || item.name,
                  artist_name: item.author?.name || 'Argon Artist',
                  artist_id: item.author?.id ? `argon-${item.author.id}` : null,
                  artwork_url: artwork,
                  duration: (item.song?.duration || 0) * 1000,
                  url: item.song?.url || item.url,
                  source: 'Argon'
              };
          });
          tracks.push(...argonTracks);
      }

      let albums = [];
      if (ytMusicRes.albums) {
          albums = ytMusicRes.albums.map(item => {
              if (item.type !== 'MusicResponsiveListItem') return null;
              
              const title = item.title?.toString() || item.name?.toString() || 'Unknown Album';
              const artist = item.artists?.[0]?.name?.toString() || item.author?.name?.toString() || 'YT Music Artist';
              const artistId = item.artists?.[0]?.id || item.author?.id;
              const thumbnail = item.thumbnails?.[0]?.url || item.thumbnail?.url;

              return {
                  id: `ytm-${item.id}`,
                  name: title,
                  artwork_url: thumbnail,
                  artist_name: artist,
                  artist_id: artistId ? `ytm-${artistId}` : null,
                  release_year: item.year?.toString() || 'Unknown',
                  source: 'YTMusic'
              };
          }).filter(Boolean);
      }

      let artists = [];
      if (ytMusicRes.artists) {
          artists = ytMusicRes.artists.map(item => {
              if (item.type !== 'MusicResponsiveListItem') return null;
              
              const name = item.name?.toString() || item.title?.toString() || 'Unknown Artist';
              const thumbnail = item.thumbnails?.[0]?.url || item.thumbnail?.url;

              return {
                  id: `ytm-${item.id}`,
                  name: name,
                  image_url: thumbnail,
                  source: 'YTMusic'
              };
          }).filter(Boolean);
      }

      return res.status(200).json({
        tracks,
        albums,
        artists,
        playlists: []
      });
    }

    // New Endpoint: Artist Search
    if (endpoint === 'artist-search') {
        const searchQuery = q || query;
        if (!searchQuery) return res.status(400).json({ error: 'Missing query' });

        try {
            // Priority: Saavn for artists
            const saavnRes = await fetch(`${SAAVN_API}/search/artists?query=${encodeURIComponent(searchQuery)}&limit=20`).then(r => r.json());
            const artists = (saavnRes.data?.results || []).map(a => ({
                id: a.id,
                name: a.name,
                image_url: a.image?.[a.image.length - 1]?.link || a.image?.[a.image.length - 1]?.url,
                source: 'Saavn'
            }));

            // Fallback/Extra: YouTube Music
            try {
                const yt = await getYoutube();
                const search = await yt.music.search(searchQuery, { type: 'artist' });
                const ytArtists = (search.artists || search.results || []).map(item => {
                    if (item.type !== 'Artist' && item.type !== 'MusicResponsiveListItem') return null;
                    return {
                        id: `ytm-${item.id}`,
                        name: item.name?.toString() || item.title?.toString() || 'Unknown Artist',
                        image_url: item.thumbnails?.[0]?.url || item.thumbnail?.url,
                        source: 'YTMusic'
                    };
                }).filter(Boolean);
                artists.push(...ytArtists);
            } catch (e) {
                console.warn('YT Music artist search fallback failed', e.message);
            }

            return res.status(200).json({ artists });
        } catch (e) {
            console.error('Artist search failed', e);
            return res.status(500).json({ error: 'Failed to fetch artists', message: e.message });
        }
    }

    // New Endpoint: Album Search
    if (endpoint === 'album-search') {
        const searchQuery = q || query;
        if (!searchQuery) return res.status(400).json({ error: 'Missing query' });

        try {
            // Priority: Saavn for albums
            const saavnRes = await fetch(`${SAAVN_API}/search/albums?query=${encodeURIComponent(searchQuery)}&limit=20`).then(r => r.json());
            const albums = (saavnRes.data?.results || []).map(a => ({
                id: a.id,
                name: a.name,
                artwork_url: a.image?.[a.image.length - 1]?.link || a.image?.[a.image.length - 1]?.url,
                artist_name: a.primaryArtists,
                release_year: a.year,
                source: 'Saavn'
            }));

            // Fallback/Extra: YouTube Music
            try {
                const yt = await getYoutube();
                const search = await yt.music.search(searchQuery, { type: 'album' });
                const ytAlbums = (search.albums || search.results || []).map(item => {
                    if (item.type !== 'Album' && item.type !== 'MusicResponsiveListItem') return null;
                    return {
                        id: `ytm-${item.id}`,
                        name: item.name?.toString() || item.title?.toString() || 'Unknown Album',
                        artwork_url: item.thumbnails?.[0]?.url || item.thumbnail?.url,
                        artist_name: item.artists?.[0]?.name?.toString() || item.author?.name?.toString() || 'YT Music Artist',
                        artist_id: item.artists?.[0]?.id ? `ytm-${item.artists[0].id}` : null,
                        release_year: item.year?.toString() || 'Unknown',
                        source: 'YTMusic'
                    };
                }).filter(Boolean);
                albums.push(...ytAlbums);
            } catch (e) {
                console.warn('YT Music album search fallback failed', e.message);
            }

            return res.status(200).json({ albums });
        } catch (e) {
            console.error('Album search failed', e.message);
            return res.status(500).json({ error: 'Failed to fetch albums', message: e.message });
        }
    }

    // New Endpoint: Import YouTube Playlist
    if (endpoint === 'import-playlist') {
        const playlistUrl = q || query || id;
        if (!playlistUrl) return res.status(400).json({ error: 'Missing playlist URL' });

        try {
            const yt = await getYoutube();
            let playlistId = playlistUrl;
            let videoIds = [];
            
            // Handle watch_videos?video_ids=...
            if (playlistUrl.includes('watch_videos') && playlistUrl.includes('video_ids=')) {
                const match = playlistUrl.match(/video_ids=([^&]+)/);
                if (match) {
                    videoIds = match[1].split(',');
                    console.log(`API: Detected watch_videos with ${videoIds.length} videos`);
                }
            }

            if (videoIds.length === 0) {
                // Standard playlist extraction
                if (playlistUrl.includes('list=')) {
                    try {
                        const urlObj = new URL(playlistUrl.startsWith('http') ? playlistUrl : `https://${playlistUrl}`);
                        playlistId = urlObj.searchParams.get('list');
                    } catch (urlErr) {
                        const match = playlistUrl.match(/[&?]list=([^&]+)/);
                        if (match) playlistId = match[1];
                    }
                } else if (playlistUrl.includes('youtu.be/')) {
                    try {
                        const urlObj = new URL(playlistUrl.startsWith('http') ? playlistUrl : `https://${playlistUrl}`);
                        playlistId = urlObj.searchParams.get('list');
                    } catch(e) {}
                }
            }

            if (!playlistId && videoIds.length === 0) {
                return res.status(400).json({ error: 'Invalid playlist URL or ID' });
            }

            let playlistData = { title: 'Imported Playlist', contents: [] };

            if (videoIds.length > 0) {
                // Fetch individual video info for watch_videos
                const videoPromises = videoIds.slice(0, 50).map(vid => yt.getBasicInfo(vid).catch(() => null));
                const videoInfos = await Promise.all(videoPromises);
                playlistData.contents = videoInfos.filter(v => v).map(v => ({
                    id: v.basic_info.id,
                    title: v.basic_info.title,
                    artists: [{ name: v.basic_info.author }],
                    thumbnails: v.basic_info.thumbnail,
                    duration: v.basic_info.duration
                }));
            } else {
                try {
                    playlistData = await yt.music.getPlaylist(playlistId);
                } catch (e1) {
                    if (!playlistId.startsWith('VL')) {
                        try {
                            playlistData = await yt.music.getPlaylist('VL' + playlistId);
                        } catch (e2) {
                            const standard = await yt.getPlaylist(playlistId);
                            playlistData = {
                                title: standard.info?.title || 'Unknown Playlist',
                                description: standard.info?.description || '',
                                thumbnails: standard.info?.thumbnails || [],
                                contents: (standard.videos || []).map(v => ({
                                    id: v.id,
                                    title: v.title?.toString() || 'Unknown Video',
                                    artists: [{ name: v.author?.name || 'Unknown Artist', id: v.author?.id }],
                                    thumbnails: v.thumbnails,
                                    duration: v.duration
                                }))
                            };
                        }
                    } else {
                        const standard = await yt.getPlaylist(playlistId);
                        playlistData = {
                            title: standard.info?.title || 'Unknown Playlist',
                            description: standard.info?.description || '',
                            thumbnails: standard.info?.thumbnails || [],
                            contents: (standard.videos || []).map(v => ({
                                id: v.id,
                                title: v.title?.toString() || 'Unknown Video',
                                artists: [{ name: v.author?.name || 'Unknown Artist', id: v.author?.id }],
                                thumbnails: v.thumbnails,
                                duration: v.duration
                            }))
                        };
                    }
                }
            }

            const tracks = (playlistData.contents || []).map(item => {
                const tid = item.id || item.video_id;
                if (!tid) return null;
                return {
                    id: `ytm-${tid}`,
                    title: item.title?.toString() || 'Unknown Title',
                    artist_name: item.artists?.[0]?.name || item.author?.name || 'Unknown Artist',
                    artist_id: (item.artists?.[0]?.id || item.author?.id) ? `ytm-${item.artists?.[0]?.id || item.author?.id}` : null,
                    duration: (item.duration?.seconds || item.seconds || 0) * 1000,
                    artwork_url: item.thumbnails?.[0]?.url || (Array.isArray(item.thumbnail) ? item.thumbnail[0]?.url : null),
                    youtube_id: tid,
                    source: 'YTMusic'
                };
            }).filter(Boolean);

            return res.status(200).json({
                name: playlistData.title || 'Imported Playlist',
                description: playlistData.description || '',
                artwork_url: playlistData.thumbnails?.[0]?.url || (Array.isArray(playlistData.thumbnail) ? playlistData.thumbnail[0]?.url : null),
                tracks: tracks
            });

        } catch (error) {
            console.error('Music API Playlist Import Error:', error);
            return res.status(500).json({ error: 'Failed to import playlist', message: error.message });
        }
    }


    // 2.1 Playlist Details
    if (endpoint === 'playlist' || pathname.includes('/playlist/')) {
        // YT Music playlists would need implementation if needed
        return res.status(404).json({ error: 'Playlist view not implemented for YT Music yet' });
    }

    // 3. Album Details
    if (endpoint === 'album' || pathname.includes('/album/')) {
        let albumId = id || pathParts[pathParts.length - 1];
        
        if (albumId) {
            const rawId = albumId.startsWith('ytm-') ? albumId.replace('ytm-', '') : albumId;
            const yt = await getYoutube();
            try {
                const album = await yt.music.getAlbum(rawId);
                const albumArtists = (album.artists || []).map(a => ({ id: `ytm-${a.id}`, name: a.name }));
                
                // Ensure at least one artist exists for the frontend
                if (albumArtists.length === 0) {
                    albumArtists.push({ id: null, name: 'Unknown Artist' });
                }

                return res.status(200).json({
                    id: `ytm-${rawId}`,
                    name: album.title,
                    artwork_url: album.thumbnails?.[0]?.url,
                    artists: albumArtists,
                    total_tracks: album.contents?.length || 0,
                    release_year: album.year || 'Unknown',
                    tracks: (album.contents || []).map(track => ({
                        id: `ytm-${track.id}`,
                        title: track.title,
                        artist_name: track.artists?.[0]?.name || album.artists?.[0]?.name || 'Unknown Artist',
                        artist_id: track.artists?.[0]?.id ? `ytm-${track.artists[0].id}` : (album.artists?.[0]?.id ? `ytm-${album.artists[0].id}` : null),
                        duration: (track.duration?.seconds || 0) * 1000,
                        artwork_url: album.thumbnails?.[0]?.url,
                        youtube_id: track.id,
                        source: 'YTMusic'
                    }))
                });
            } catch (e) {
                console.error('YT Music album details failed', e.message);
                return res.status(500).json({ error: 'Failed to fetch YT Music album', message: e.message });
            }
        }
        return res.status(404).json({ error: 'Album not found' });
    }

    // 4. Artist Details (Custom: Search for songs by artist name or use ID)
    if (endpoint === 'artist' || pathname.includes('/artist/')) {
        let identifier = id || pathParts[pathParts.length - 1]; 
        identifier = decodeURIComponent(identifier.replace('ytm-', '').replace('argon-', ''));

        console.log(`API: Artist Details requested for: "${identifier}"`);

        if (!identifier || identifier === 'undefined' || identifier === 'null') {
            return res.status(400).json({ error: 'Artist identifier required' });
        }
        
        const yt = await getYoutube();
        try {
            // Check if it's a YouTube Channel ID or a generic YT Music ID
            const isYtId = identifier.startsWith('UC') || identifier.startsWith('FMe') || (identifier.length > 10 && !identifier.includes(' ') && !/^\d+$/.test(identifier));
            
            // If it's a numeric ID, it's likely Saavn
            const isSaavnId = /^\d+$/.test(identifier);

            const isId = isYtId || isSaavnId;

            let tracks = [];
            let artistName = identifier;
            let artistImage = null;
            let followers = null;
            let albums = [];

            if (isSaavnId) {
                console.log(`API: Fetching Saavn artist by ID: ${identifier}`);
                try {
                    const fetchJson = async (url) => {
                        const r = await fetch(url);
                        if (!r.ok) throw new Error(`API Error: ${r.status}`);
                        return r.json();
                    };

                    const [detailsRes, songsRes, albumsRes] = await Promise.all([
                        fetchJson(`${SAAVN_API}/artists?id=${identifier}`),
                        fetchJson(`${SAAVN_API}/artists/${identifier}/songs?page=1`),
                        fetchJson(`${SAAVN_API}/artists/${identifier}/albums?page=1`)
                    ]);
                    
                    const details = detailsRes.data;
                    if (details) {
                        artistName = details.name;
                        followers = details.followerCount;
                        artistImage = details.image?.[details.image.length - 1]?.link || details.image?.[details.image.length - 1]?.url;
                        
                        tracks = (songsRes.data?.results || []).map(s => ({
                            id: s.id,
                            title: s.name,
                            artist_name: s.primaryArtists,
                            artist_id: s.primaryArtistsId,
                            duration: s.duration * 1000,
                            artwork_url: s.image?.[s.image.length - 1]?.link || s.image?.[s.image.length - 1]?.url,
                            source: 'Saavn'
                        }));

                        albums = (albumsRes.data?.results || []).map(a => ({
                            id: a.id,
                            name: a.name,
                            artwork_url: a.image?.[a.image.length - 1]?.link || a.image?.[a.image.length - 1]?.url,
                            release_year: a.year,
                            artist_name: a.primaryArtists,
                            source: 'Saavn'
                        }));
                    }
                } catch (e) {
                    console.warn(`API: Saavn artist fetch failed for ${identifier}`, e.message);
                }
            } else if (isYtId && identifier.startsWith('UC')) {
                // YouTube Channel Logic
                console.log(`API: Fetching YT Channel: ${identifier}`);
                try {
                    const channel = await yt.getChannel(identifier);
                    const channelVideos = await channel.getVideos();
                    
                    artistName = channel.metadata.title;
                    artistImage = channel.metadata.thumbnail?.[channel.metadata.thumbnail.length - 1]?.url;
                    
                    tracks = (channelVideos.videos || []).map(v => ({
                        id: `ytm-${v.id}`,
                        title: v.title?.text || v.title?.toString(),
                        artist_name: artistName,
                        artist_id: `ytm-${identifier}`,
                        duration: (v.duration?.seconds || 0) * 1000,
                        artwork_url: v.thumbnails?.[0]?.url,
                        youtube_id: v.id,
                        source: 'YTMusic'
                    }));
                } catch (e) {
                    console.warn(`API: YT Channel fetch failed for ${identifier}`, e.message);
                }
            } else if (isYtId) {
                // Generic YT Music Artist
                console.log(`API: Fetching YT Music Artist: ${identifier}`);
                try {
                    const artist = await yt.music.getArtist(identifier);
                    artistName = artist.name;
                    artistImage = artist.thumbnails?.[artist.thumbnails.length - 1]?.url;
                    
                    const songSection = artist.sections?.find(s => 
                        s.type === 'MusicShelf' || 
                        s.title?.toString().toLowerCase().includes('songs') ||
                        s.title?.toString().toLowerCase().includes('top tracks')
                    );
                    
                    if (songSection && songSection.contents) {
                        tracks = songSection.contents.map(item => ({
                            id: `ytm-${item.id || item.video_id}`,
                            title: item.title?.toString() || 'Unknown Title',
                            artist_name: artistName,
                            artist_id: `ytm-${identifier}`,
                            artwork_url: item.thumbnails?.[0]?.url || artistImage,
                            duration: (item.duration?.seconds || 0) * 1000,
                            youtube_id: item.id || item.video_id,
                            source: 'YTMusic'
                        })).filter(t => t.youtube_id);
                    }
                } catch (e) {
                    console.warn(`API: YT Music artist fetch failed for ${identifier}`, e.message);
                }
            }

            // Fallback to name-based search if still empty
            if (tracks.length === 0) {
                console.log(`API: Performing search for artist: "${identifier}"`);
                const searchResults = await yt.music.search(identifier, { type: 'song' });
                
                if (searchResults.songs && searchResults.songs.length > 0) {
                    tracks = searchResults.songs.map(item => {
                        const currentArtist = item.artists?.[0]?.name?.toString() || item.author?.name?.toString() || 'Unknown Artist';
                        
                        // Relaxed matching: if searching by name, ensure name matches
                        if (!isId && !currentArtist.toLowerCase().includes(identifier.toLowerCase().replace(/-/g, ' ')) && 
                            !identifier.toLowerCase().replace(/-/g, ' ').includes(currentArtist.toLowerCase())) return null;

                        if (!artistImage && item.thumbnails?.[0]?.url) artistImage = item.thumbnails[0].url;

                        return {
                            id: item.id ? `ytm-${item.id}` : `ytm-gen-${Math.random().toString(36).substr(2, 9)}`,
                            title: item.title?.toString() || 'Unknown Title',
                            artist_name: currentArtist,
                            artist_id: item.artists?.[0]?.id ? `ytm-${item.artists[0].id}` : null,
                            artwork_url: item.thumbnails?.[0]?.url,
                            duration: (item.duration?.seconds || 0) * 1000,
                            youtube_id: item.id,
                            source: 'YTMusic'
                        };
                    }).filter(Boolean);
                    
                    if (tracks.length > 0) {
                        artistName = tracks[0].artist_name;
                    }
                }

                // Try to find a better artist image via artist search
                try {
                    const artistSearch = await yt.music.search(identifier, { type: 'artist' });
                    const bestMatch = artistSearch.artists?.find(a => 
                        a.name?.toLowerCase() === identifier.toLowerCase().replace(/-/g, ' ') ||
                        a.name?.toLowerCase().includes(identifier.toLowerCase().replace(/-/g, ' '))
                    ) || artistSearch.artists?.[0];
                    
                    if (bestMatch) {
                        artistName = bestMatch.name || artistName;
                        if (bestMatch.thumbnails?.[0]?.url) {
                            artistImage = bestMatch.thumbnails[bestMatch.thumbnails.length - 1].url;
                        }
                    }
                } catch (err) {
                    console.warn('API: Artist search fallback for image failed', err.message);
                }
            }

            if (tracks.length === 0) {
                return res.status(404).json({ error: `No songs found for artist: ${identifier}` });
            }

            return res.status(200).json({
                id: identifier,
                artist_name: artistName,
                followers: followers,
                artist_image_url: artistImage,
                top_tracks: tracks.slice(0, 10),
                all_songs: tracks,
                albums: albums
            });

        } catch (e) {
            console.error('API: Artist Details failed:', e.message);
            return res.status(500).json({ error: 'Internal server error fetching artist details', message: e.message });
        }
    }

    // 4.1 Lyrics
    if (endpoint === 'lyrics' || pathname.includes('/lyrics/')) {
        const songId = id || pathParts[pathParts.length - 1];
        
        if (songId.startsWith('mapi-')) {
            const mapiId = songId.replace('mapi-', '');
            const songData = await fetch(`${MUSIC_API_BASE}/fetch/${mapiId}`).then(r => r.ok ? r.json() : null);
            if (songData && songData.LYRICS) {
                return res.status(200).json({ lyrics: songData.LYRICS, source: 'MusicAPI' });
            }
        }

        // YT Music lyrics retrieval
        try {
            const yt = await getYoutube();
            // youtubei.js getLyrics requires the original video ID
            const lyrics = await yt.music.getLyrics(songId.replace('ytm-', ''));
            if (lyrics && lyrics.description) {
                return res.status(200).json({ lyrics: lyrics.description.toString(), source: 'YTMusic' });
            }
        } catch (e) {
            console.error('YT Music lyrics failed', e);
        }

        return res.status(404).json({ error: 'Lyrics not found' });
    }

    // 5. YouTube Search
    if (endpoint === 'youtube-search') {
        const searchQuery = q || query;
        if (!searchQuery) return res.status(400).json({ error: 'Missing query' });
        
        const yt = await getYoutube();
        const searchResults = await yt.search(searchQuery, { type: 'video' });
        
        const formattedResults = (searchResults.results || searchResults.videos || []).map(item => ({
            id: item.id,
            title: item.title?.toString(),
            author: item.author?.name,
            thumbnails: item.thumbnails
        }));

        return res.status(200).json({ results: formattedResults });
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Music API Critical Error:', error.message);
    return res.status(500).json({ 
        error: 'Critical API Failure', 
        message: error.message
    });
  }
}

// Made with ❤️ from 4SP
