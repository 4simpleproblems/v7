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
  const { q, query, offset, limit, id, endpoint: endpointFromQuery } = req.query;
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
              suggestions: (suggestions || []).map(s => ({
                  name: s.toString(),
                  type: 'Search'
              }))
          });
      } catch (e) {
          console.error('YT Music suggestions failed', e.message);
          return res.status(200).json({ suggestions: [] });
      }
    }

    // 2. Search
    if (endpoint === 'search') {
      const searchQuery = q || query;
      if (!searchQuery) return res.status(400).json({ error: 'Missing query' });
      
      const [musicApiRes, ytMusicRes, argonRes] = await Promise.all([
        // Provider 1: MusicAPI
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
        // Provider 2: YT Music
        getYoutube().then(async yt => {
            try {
                const search = await yt.music.search(searchQuery);
                
                const contents = {
                    songs: search.songs || [],
                    albums: [],
                    artists: []
                };

                const topResult = search.sections?.find(s => s.title?.toString().toLowerCase().includes('top result'))?.contents?.[0];
                if (topResult && topResult.type === 'MusicResponsiveListItem') {
                    const itemType = topResult.item_type?.toLowerCase() || '';
                    if (itemType.includes('song')) contents.songs.unshift(topResult);
                }

                return contents;
            } catch (e) {
                console.error('YT Music search failed', e.message);
                return { songs: [], albums: [], artists: [] };
            }
        }).catch(() => ({ songs: [], albums: [], artists: [] })),
        // Provider 3: Argon API
        fetch(`https://argon.global.ssl.fastly.net/api/search?query=${encodeURIComponent(searchQuery)}&offset=${offset || 0}&limit=${limit || 25}`)
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
              if (!item) return null;
              
              const title = item.title?.toString() || item.name?.toString() || 'Unknown Title';
              const artist = item.artists?.[0]?.name?.toString() || item.author?.name?.toString() || 'YT Music Artist';
              const artistId = item.artists?.[0]?.id || item.author?.id;
              
              const thumbnail = item.thumbnails?.[0]?.url || item.thumbnail?.url;
              const duration = (item.duration?.seconds || 0) * 1000;
              
              // Robust ID extraction
              const rawId = item.id || item.video_id;
              const trackId = rawId ? `ytm-${rawId}` : `ytm-gen-${Math.random().toString(36).substr(2, 9)}`;

              return {
                  id: trackId,
                  title: title,
                  artist_name: artist,
                  artist_id: artistId ? `ytm-${artistId}` : null,
                  artwork_url: thumbnail,
                  duration: duration,
                  youtube_id: rawId,
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

      return res.status(200).json({
        tracks,
        albums: [],
        artists: [],
        playlists: []
      });
    }

    // Search Endpoints (DISABLED)
    if (endpoint === 'artist-search' || endpoint === 'album-search') {
        return res.status(404).json({ error: 'Endpoint is disabled' });
    }

    // 3. Album Details (DISABLED)
    if (endpoint === 'album' || pathname.includes('/album/')) {
        return res.status(404).json({ error: 'Album view is disabled' });
    }

    // 4. Artist Details (DISABLED)
    if (endpoint === 'artist' || pathname.includes('/artist/')) {
        return res.status(404).json({ error: 'Artist view is disabled' });
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

        try {
            const yt = await getYoutube();
            const lyrics = await yt.music.getLyrics(songId.replace('ytm-', ''));
            if (lyrics && lyrics.description) {
                return res.status(200).json({ lyrics: lyrics.description.toString(), source: 'YTMusic' });
            }
        } catch (e) {
            console.error('YT Music lyrics failed', e.message);
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
