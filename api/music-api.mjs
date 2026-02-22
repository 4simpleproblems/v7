const MUSIC_API_BASE = 'https://bhindi1.ddns.net/music/api';

// Helper to get YouTube search
let youtubePromise; 
async function getYoutube() {
  if (!youtubePromise) {
    youtubePromise = (async () => {
      const { Innertube } = await import('youtubei.js');
      return Innertube.create({ 
        cache: null,
        generate_session_locally: true
      });
    })();
  }
  return youtubePromise;
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
                
                const contents = {
                    songs: [],
                    albums: [],
                    artists: []
                };

                search.sections.forEach(section => {
                    const title = section.title?.toString().toLowerCase() || '';
                    
                    if (title.includes('songs') || title.includes('results')) {
                        contents.songs.push(...(section.contents || []));
                    } else if (title.includes('albums')) {
                        contents.albums.push(...(section.contents || []));
                    } else if (title.includes('artists')) {
                        contents.artists.push(...(section.contents || []));
                    }
                });

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

              return {
                  id: `ytm-${item.id}`,
                  title: title,
                  artist_name: artist,
                  artist_id: artistId ? `ytm-${artistId}` : null,
                  artwork_url: thumbnail,
                  duration: duration,
                  youtube_id: item.id,
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
                return res.status(200).json({
                    id: `ytm-${rawId}`,
                    name: album.title,
                    artwork_url: album.thumbnails?.[0]?.url,
                    artists: album.artists.map(a => ({ id: `ytm-${a.id}`, name: a.name })),
                    total_tracks: album.contents.length,
                    release_year: album.year || 'Unknown',
                    tracks: album.contents.map(track => ({
                        id: `ytm-${track.id}`,
                        title: track.title,
                        artist_name: track.artists?.[0]?.name || album.artists[0]?.name,
                        artist_id: track.artists?.[0]?.id ? `ytm-${track.artists[0].id}` : (album.artists[0]?.id ? `ytm-${album.artists[0].id}` : null),
                        duration: (track.duration?.seconds || 0) * 1000,
                        artwork_url: album.thumbnails?.[0]?.url,
                        youtube_id: track.id,
                        source: 'YTMusic'
                    }))
                });
            } catch (e) {
                console.error('YT Music album details failed', e);
                return res.status(500).json({ error: 'Failed to fetch YT Music album' });
            }
        }
        return res.status(404).json({ error: 'Album not found' });
    }

    // 4. Artist Details
    if (endpoint === 'artist' || pathname.includes('/artist/')) {
        let artistId = id || pathParts[pathParts.length - 1];
        
        if (!artistId || artistId === 'undefined' || artistId === 'null') {
            return res.status(400).json({ error: 'Artist ID or Name required' });
        }
        
        const rawId = artistId.startsWith('ytm-') ? artistId.replace('ytm-', '') : (artistId.startsWith('argon-') ? artistId.replace('argon-', '') : artistId);
        const yt = await getYoutube();
        try {
            let artist;
            try {
                artist = await yt.music.getArtist(rawId);
            } catch (e) {
                console.warn(`Direct artist fetch failed for ${rawId}, attempting search fallback`);
                const search = await yt.music.search(rawId, { type: 'artist' });
                const firstArtist = search.artists?.[0] || search.results?.find(r => r.type === 'Artist');
                
                if (firstArtist && firstArtist.browseId) {
                    artist = await yt.music.getArtist(firstArtist.browseId);
                    artistId = `ytm-${firstArtist.browseId}`;
                } else {
                    return res.status(404).json({ error: 'Artist not found via search fallback' });
                }
            }

            if (!artist) return res.status(404).json({ error: 'Artist not found' });

            return res.status(200).json({
                id: artistId.startsWith('ytm-') || artistId.startsWith('argon-') ? artistId : `ytm-${artistId}`,
                name: artist.name,
                followers: 0,
                image_url: artist.thumbnails?.[0]?.url,
                top_tracks: (artist.sections?.find(s => s.type === 'MusicShelf' && s.title?.toString().toLowerCase().includes('songs'))?.contents || []).map(track => ({
                    id: `ytm-${track.id}`,
                    title: track.title,
                    artist_name: artist.name,
                    artist_id: artistId.startsWith('ytm-') || artistId.startsWith('argon-') ? artistId : `ytm-${artistId}`,
                    duration: (track.duration?.seconds || 0) * 1000,
                    artwork_url: track.thumbnails?.[0]?.url,
                    youtube_id: track.id,
                    source: 'YTMusic'
                })),
                albums: (artist.sections?.find(s => s.type === 'MusicCarouselShelf' && s.title?.toString().toLowerCase().includes('albums'))?.contents || []).map(album => ({
                    id: `ytm-${album.id}`,
                    name: album.title,
                    artwork_url: album.thumbnails?.[0]?.url,
                    release_year: album.year || 'Unknown',
                    artist_name: artist.name,
                    source: 'YTMusic'
                }))
            });
        } catch (e) {
            console.error('Artist details failed:', e);
            return res.status(500).json({ error: 'Internal server error fetching artist' });
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
            const lyrics = await yt.music.getLyrics(songId);
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
        
        const firstVideo = searchResults.results.find(item => item.type === 'Video');
        if (firstVideo) {
            return res.status(200).json({ videoId: firstVideo.id });
        } else {
            return res.status(404).json({ error: 'No video found' });
        }
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Music API Error:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}

// Made with ❤️ from 4SP
