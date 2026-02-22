import axios from 'axios';

const SAAVN_API = 'https://jiosaavn-api-privatecvc2.vercel.app';

// Helper to get YouTube search (reusing logic from search.mjs but keeping it self-contained if needed)
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
      
      const response = await axios.get(`${SAAVN_API}/search/songs?query=${encodeURIComponent(searchQuery)}&limit=5`);
      const songs = response.data.data.results || [];
      
      const suggestions = songs.map(s => ({
        name: s.name,
        type: 'Song'
      }));
      
      return res.status(200).json({ suggestions });
    }

    // 2. Search
    if (endpoint === 'search') {
      const searchQuery = q || query;
      if (!searchQuery) return res.status(400).json({ error: 'Missing query' });
      
      const page = Math.floor((parseInt(offset) || 0) / 20) + 1;
      
      const [songsRes, albumsRes, artistsRes] = await Promise.all([
        axios.get(`${SAAVN_API}/search/songs?query=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`),
        axios.get(`${SAAVN_API}/search/albums?query=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`),
        axios.get(`${SAAVN_API}/search/artists?query=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`)
      ]);

      const formatTrack = (s) => ({
        id: s.id,
        title: s.name,
        artist_name: s.primaryArtists,
        artist_id: s.primaryArtistsId,
        artwork_url: s.image?.[s.image.length - 1]?.link || s.image?.[s.image.length - 1]?.url,
        duration: s.duration * 1000, // to ms
        album_name: s.album?.name
      });

      return res.status(200).json({
        tracks: (songsRes.data.data.results || []).map(formatTrack),
        albums: (albumsRes.data.data.results || []).map(a => ({
          id: a.id,
          name: a.name,
          artwork_url: a.image?.[a.image.length - 1]?.link || a.image?.[a.image.length - 1]?.url,
          artist_name: a.primaryArtists,
          release_year: a.year
        })),
        artists: (artistsRes.data.data.results || []).map(a => ({
          id: a.id,
          name: a.name,
          image_url: a.image?.[a.image.length - 1]?.link || a.image?.[a.image.length - 1]?.url
        }))
      });
    }

    // 3. Album Details
    if (endpoint === 'album' || pathname.includes('/album/')) {
        const albumId = id || pathParts[pathParts.length - 1];
        const response = await axios.get(`${SAAVN_API}/albums?id=${albumId}`);
        const data = response.data.data;
        
        return res.status(200).json({
            id: data.id,
            name: data.name,
            artwork_url: data.image?.[data.image.length - 1]?.link,
            artists: [{ id: data.primaryArtistsId, name: data.primaryArtists }],
            total_tracks: data.songCount,
            release_year: data.year,
            tracks: (data.songs || []).map(s => ({
                id: s.id,
                title: s.name,
                artist_name: s.primaryArtists,
                artist_id: s.primaryArtistsId,
                duration: s.duration * 1000,
                artwork_url: s.image?.[s.image.length - 1]?.link
            }))
        });
    }

    // 4. Artist Details
    if (endpoint === 'artist' || pathname.includes('/artist/')) {
        const artistId = id || pathParts[pathParts.length - 1];
        const [detailsRes, songsRes, albumsRes] = await Promise.all([
            axios.get(`${SAAVN_API}/artists?id=${artistId}`),
            axios.get(`${SAAVN_API}/artists/${artistId}/songs?page=1`),
            axios.get(`${SAAVN_API}/artists/${artistId}/albums?page=1`)
        ]);
        
        const details = detailsRes.data.data;
        
        return res.status(200).json({
            id: details.id,
            name: details.name,
            followers: details.followerCount,
            image_url: details.image?.[details.image.length - 1]?.link,
            top_tracks: (songsRes.data.data.results || []).map(s => ({
                id: s.id,
                title: s.name,
                artist_name: s.primaryArtists,
                duration: s.duration * 1000,
                artwork_url: s.image?.[s.image.length - 1]?.link
            })),
            albums: (albumsRes.data.data.results || []).map(a => ({
                id: a.id,
                name: a.name,
                artwork_url: a.image?.[a.image.length - 1]?.link,
                release_year: a.year,
                artist_name: a.primaryArtists
            }))
        });
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
    console.error('Music API Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
