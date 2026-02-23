import {
  extractPlaylistId,
  extractVideoId,
  fetchPlaylistVideos,
  fetchPlaylistInfo,
  isValidYouTubeUrl,
  isPlaylistUrl,
} from './youtube-extractor/extractor.mjs'; // Corrected import path

export default async function (req, res) { // Standard Node.js req, res
  res.setHeader('Access-Control-Allow-Origin', '*'); // Add CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { link } = req.body; // Access body from req.body

    if (!link) {
      return res.status(400).json({ error: 'Link is required' });
    }

    if (!isValidYouTubeUrl(link)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Remove MongoDB code

    const isPlaylist = isPlaylistUrl(link);

    if (isPlaylist) {
      const playlistId = extractPlaylistId(link);
      
      if (!playlistId) {
        return res.status(400).json({ error: 'Invalid playlist URL' });
      }

      const [playlistInfo, videoIds] = await Promise.all([
        fetchPlaylistInfo(playlistId),
        fetchPlaylistVideos(playlistId),
      ]);

      if (!videoIds || videoIds.length === 0) {
        return res.status(404).json({ 
          error: 'No videos found in playlist or YouTube API key not configured/invalid' 
        });
      }

      return res.status(200).json({
        success: true,
        type: 'playlist',
        playlistInfo,
        videoIds,
        totalVideos: videoIds.length,
      });
    } else {
      // Single video
      const videoId = extractVideoId(link);
      
      if (!videoId) {
        return res.status(400).json({ error: 'Invalid video URL' });
      }

      return res.status(200).json({
        success: true,
        type: 'video',
        videoIds: [videoId],
        totalVideos: 1,
      });
    }
  } catch (error) {
    console.error('Error in extract-playlist:', error);
    return res.status(500).json(
      { error: 'Failed to process YouTube link', details: error.message }
    );
  }
}