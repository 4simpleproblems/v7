import { Innertube } from 'youtubei.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { videoId } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'Video ID is required.' });
    }

    try {
        const yt = await Innertube.create({
            cache: null,
            generate_session_locally: true
        });

        const info = await yt.getInfo(videoId);
        const videoDetails = info.basic_info;

        return res.status(200).json({
            id: videoDetails.id,
            title: videoDetails.title,
            author: videoDetails.author,
            viewCount: videoDetails.view_count,
            published: videoDetails.date_text, // Or videoDetails.upload_date if a Date object is preferred
            description: videoDetails.description,
            thumbnails: videoDetails.thumbnail,
            // You can add more details here if needed, e.g., like/dislike counts if youtubei.js provides them
        });

    } catch (error) {
        console.error('Video Details API Error:', error);
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
}
