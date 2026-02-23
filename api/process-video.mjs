import { fetchVideoDetails } from './youtube-extractor/extractor.mjs';

export default async function (req, res) {
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
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    const videoData = await fetchVideoDetails(videoId);

    return res.status(200).json({
      success: true,
      video: videoData,
    });
  } catch (error) {
    console.error('Error in process-video:', error);
    return res.status(500).json(
      { error: 'Failed to process video', details: error.message }
    );
  }
}