import forge from 'node-forge';

const Endpoints = {
  search: {
    all: 'autocomplete.get',
    songs: 'search.getResults',
    albums: 'search.getAlbumResults',
    artists: 'search.getArtistResults',
    playlists: 'search.getPlaylistResults'
  },
  songs: {
    id: 'song.getDetails',
    link: 'webapi.get',
    suggestions: 'webradio.getSong',
    lyrics: 'lyrics.getLyrics',
    station: 'webradio.createEntityStation'
  },
  albums: {
    id: 'content.getAlbumDetails',
    link: 'webapi.get'
  },
  artists: {
    id: 'artist.getArtistPageDetails',
    link: 'webapi.get',
    songs: 'artist.getArtistMoreSong',
    albums: 'artist.getArtistMoreAlbum'
  },
  playlists: {
    id: 'playlist.getDetails',
    link: 'webapi.get'
  },
  modules: 'content.getBrowseModules',
  trending: 'content.getTrending'
};

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

export const createDownloadLinks = (encryptedMediaUrl) => {
  if (!encryptedMediaUrl) return [];

  const qualities = [
    { id: '_12', bitrate: '12kbps' },
    { id: '_48', bitrate: '48kbps' },
    { id: '_96', bitrate: '96kbps' },
    { id: '_160', bitrate: '160kbps' },
    { id: '_320', bitrate: '320kbps' }
  ];

  const key = '38346591';
  const iv = '00000000';

  try {
    const encrypted = forge.util.decode64(encryptedMediaUrl);
    const decipher = forge.cipher.createDecipher('DES-ECB', forge.util.createBuffer(key));
    decipher.start({ iv: forge.util.createBuffer(iv) });
    decipher.update(forge.util.createBuffer(encrypted));
    decipher.finish();
    const decryptedLink = decipher.output.getBytes();

    return qualities.map((quality) => ({
      quality: quality.bitrate,
      link: decryptedLink.replace('_96', quality.id)
    }));
  } catch (e) {
    console.error('Decryption failed', e);
    return [];
  }
};

export const createImageLinks = (link) => {
  if (!link) return [];
  if (Array.isArray(link)) return link; // Already mapped

  const qualities = ['50x50', '150x150', '500x500'];
  const qualityRegex = /150x150|50x50/;
  const protocolRegex = /^http:\/\//;

  return qualities.map((quality) => ({
    quality,
    link: link.replace(qualityRegex, quality).replace(protocolRegex, 'https://')
  }));
};

export const useFetch = async ({ endpoint, params, context = 'web6dot0' }) => {
  const url = new URL('https://www.jiosaavn.com/api.php');

  url.searchParams.append('__call', endpoint);
  url.searchParams.append('_format', 'json');
  url.searchParams.append('_marker', '0');
  url.searchParams.append('api_version', '4');
  url.searchParams.append('ctx', context);

  Object.keys(params).forEach((key) => url.searchParams.append(key, String(params[key])));

  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  const response = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json', 'User-Agent': randomUserAgent }
  });

  if (!response.ok) {
      throw new Error(`JioSaavn API error: ${response.status}`);
  }

  const data = await response.json();
  return { data, ok: response.ok };
};

export const formatTrack = (s) => ({
  id: s.id,
  title: s.title || s.name,
  artist_name: s.more_info?.artistMap?.primary_artists?.[0]?.name || s.primaryArtists || 'Unknown Artist',
  artist_id: s.more_info?.artistMap?.primary_artists?.[0]?.id || s.primaryArtistsId,
  artwork_url: createImageLinks(s.image)?.[2]?.link || s.image,
  image: createImageLinks(s.image),
  duration: s.more_info?.duration ? Number(s.more_info.duration) * 1000 : s.duration * 1000,
  album_name: s.more_info?.album || s.album?.name,
  lyricsId: s.more_info?.lyrics_id || s.lyrics_id || null,
  downloadUrl: createDownloadLinks(s.more_info?.encrypted_media_url || s.encrypted_media_url),
  url: s.perma_url
});

export const formatAlbum = (a) => ({
  id: a.id,
  name: a.title || a.name,
  artwork_url: createImageLinks(a.image)?.[2]?.link || a.image,
  image: createImageLinks(a.image),
  artist_name: a.more_info?.artistMap?.primary_artists?.[0]?.name || a.primaryArtists,
  release_year: a.year
});

export const formatArtist = (a) => ({
  id: a.id,
  name: a.name || a.title,
  image_url: createImageLinks(a.image)?.[2]?.link || a.image,
  image: createImageLinks(a.image)
});

export const formatPlaylist = (p) => ({
  id: p.id,
  name: p.title || p.name,
  artwork_url: createImageLinks(p.image)?.[2]?.link || p.image,
  image: createImageLinks(p.image),
  song_count: p.more_info?.song_count || p.songCount,
  firstname: p.more_info?.firstname || p.firstname
});

export { Endpoints };

// Made with ❤️ from 4SP
