import { Endpoints, useFetch, formatTrack, formatAlbum, formatArtist, formatPlaylist } from './jsaavn-internal.mjs';

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
      
      const { data } = await useFetch({
        endpoint: Endpoints.search.all,
        params: { query: searchQuery }
      });
      
      const suggestions = (data.songs?.data || []).map(s => ({
        name: s.title,
        type: 'Song'
      }));
      
      return res.status(200).json({ suggestions });
    }

    // 2. Search
    if (endpoint === 'search') {
      const searchQuery = q || query;
      if (!searchQuery) return res.status(400).json({ error: 'Missing query' });
      
      const page = Math.floor((parseInt(offset) || 0) / 20) + 1;
      
      const [jsRes, musicApiRes, ytMusicRes] = await Promise.all([
        // Provider 1: JioSaavn (Local Logic)
        Promise.all([
            useFetch({ endpoint: Endpoints.search.songs, params: { q: searchQuery, p: page, n: 20 } }),
            useFetch({ endpoint: Endpoints.search.albums, params: { q: searchQuery, p: page, n: 20 } }),
            useFetch({ endpoint: Endpoints.search.artists, params: { q: searchQuery, p: page, n: 20 } }),
            useFetch({ endpoint: Endpoints.search.playlists, params: { q: searchQuery, p: page, n: 20 } })
        ]).catch(err => {
            console.error('JioSaavn search failed', err);
            return [ {data: {results: []}}, {data: {results: []}}, {data: {results: []}}, {data: {results: []}} ];
        }),
        // Provider 2: MusicAPI (External Fallback/Extra)
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
        // Provider 3: YT Music (Local Logic via youtubei.js)
        getYoutube().then(async yt => {
            try {
                // Search for multiple types to populate all grids
                const [songs, albums, artists] = await Promise.all([
                    yt.music.search(searchQuery, { type: 'song' }),
                    yt.music.search(searchQuery, { type: 'album' }),
                    yt.music.search(searchQuery, { type: 'artist' })
                ]);
                return { 
                    songs: songs.sections[0]?.contents || [], 
                    albums: albums.sections[0]?.contents || [],
                    artists: artists.sections[0]?.contents || []
                };
            } catch (e) {
                console.error('YT Music search failed', e);
                return { songs: [], albums: [], artists: [] };
            }
        }).catch(() => ({ songs: [], albums: [], artists: [] }))
      ]);

      const [songsRes, albumsRes, artistsRes, playlistsRes] = jsRes;

      // 1. Format Tracks
      let tracks = (songsRes.data?.results || []).map(formatTrack);
      
      if (musicApiRes && musicApiRes.SONG_NAME) {
          tracks.unshift({
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
              return {
                  id: `ytm-${item.id}`,
                  title: item.title,
                  artist_name: item.artists?.[0]?.name || 'YT Music Artist',
                  artwork_url: item.thumbnails?.[0]?.url,
                  duration: (item.duration?.seconds || 0) * 1000,
                  youtube_id: item.id,
                  source: 'YTMusic'
              };
          }).filter(Boolean);
          tracks.push(...ytTracks);
      }

      // 2. Format Albums
      let albums = (albumsRes.data?.results || []).map(formatAlbum);
      if (ytMusicRes.albums) {
          const ytAlbums = ytMusicRes.albums.map(item => {
              if (item.type !== 'MusicResponsiveListItem') return null;
              return {
                  id: item.id,
                  name: item.title,
                  artwork_url: item.thumbnails?.[0]?.url,
                  artist_name: item.artists?.[0]?.name || 'YT Music Artist',
                  release_year: item.year || 'Unknown',
                  source: 'YTMusic'
              };
          }).filter(Boolean);
          albums.push(...ytAlbums);
      }

      // 3. Format Artists
      let artists = (artistsRes.data?.results || []).map(formatArtist);
      if (ytMusicRes.artists) {
          const ytArtists = ytMusicRes.artists.map(item => {
              if (item.type !== 'MusicResponsiveListItem') return null;
              return {
                  id: item.id,
                  name: item.name,
                  image_url: item.thumbnails?.[0]?.url,
                  source: 'YTMusic'
              };
          }).filter(Boolean);
          artists.push(...ytArtists);
      }

      return res.status(200).json({
        tracks,
        albums,
        artists,
        playlists: (playlistsRes.data?.results || []).map(formatPlaylist)
      });
    }

    // 2.1 Playlist Details
    if (endpoint === 'playlist' || pathname.includes('/playlist/')) {
        const playlistId = id || pathParts[pathParts.length - 1];
        const { data } = await useFetch({
            endpoint: Endpoints.playlists.id,
            params: { listid: playlistId }
        });
        
        if (!data) throw new Error('No playlist data found');
        
        return res.status(200).json({
            id: data.id,
            name: data.name,
            description: data.description,
            artwork_url: createImageLinks(data.image)?.[2]?.link,
            song_count: data.list_count,
            tracks: (data.songs || []).map(formatTrack)
        });
    }

    // 3. Album Details
    if (endpoint === 'album' || pathname.includes('/album/')) {
        const albumId = id || pathParts[pathParts.length - 1];
        const { data } = await useFetch({
            endpoint: Endpoints.albums.id,
            params: { albumid: albumId }
        });
        
        if (!data) throw new Error('No album data found');
        
        return res.status(200).json({
            id: data.id,
            name: data.name,
            artwork_url: createImageLinks(data.image)?.[2]?.link,
            artists: [{ id: data.primary_artists_id, name: data.primary_artists }],
            total_tracks: data.song_count,
            release_year: data.year,
            tracks: (data.songs || []).map(formatTrack)
        });
    }

    // 4. Artist Details
    if (endpoint === 'artist' || pathname.includes('/artist/')) {
        const artistId = id || pathParts[pathParts.length - 1];
        
        const [detailsRes, songsRes, albumsRes] = await Promise.all([
            useFetch({ endpoint: Endpoints.artists.id, params: { artistId } }),
            useFetch({ endpoint: Endpoints.artists.songs, params: { artistId, page: 1 } }),
            useFetch({ endpoint: Endpoints.artists.albums, params: { artistId, page: 1 } })
        ]);
        
        const details = detailsRes.data;
        if (!details) throw new Error('No artist details found');
        
        return res.status(200).json({
            id: details.artistId,
            name: details.name,
            followers: details.follower_count,
            image_url: createImageLinks(details.image)?.[2]?.link,
            top_tracks: (songsRes.data?.results || []).map(formatTrack),
            albums: (albumsRes.data?.results || []).map(formatAlbum)
        });
    }

    // 4.1 Lyrics
    if (endpoint === 'lyrics' || pathname.includes('/lyrics/')) {
        const songId = id || pathParts[pathParts.length - 1];
        
        // Try MusicAPI first if it's a mapi ID
        if (songId.startsWith('mapi-')) {
            const mapiId = songId.replace('mapi-', '');
            const songData = await fetch(`${MUSIC_API_BASE}/fetch/${mapiId}`).then(r => r.ok ? r.json() : null);
            if (songData && songData.LYRICS) {
                return res.status(200).json({ lyrics: songData.LYRICS, source: 'MusicAPI' });
            }
        }

        // Try JioSaavn
        try {
            const { data } = await useFetch({
                endpoint: Endpoints.songs.lyrics,
                params: { lyrics_id: songId }
            });
            if (data && data.lyrics) {
                return res.status(200).json({ lyrics: data.lyrics, source: 'JioSaavn' });
            }
        } catch (e) {
            console.error('JioSaavn lyrics failed', e);
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
