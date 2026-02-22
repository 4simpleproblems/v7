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

        const comments = await yt.getComments(videoId);
        
        const formattedComments = comments.contents.map(comment => {
            const author = comment.author?.name || 'Unknown Author';
            const text = comment.content?.text || '';
            const publishedTime = comment.published?.text || '';

            return {
                author: author,
                text: text,
                time: publishedTime
            };
        });

        return res.status(200).json({ comments: formattedComments });

    } catch (error) {
        console.error('Comments API Error:', error);
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
}
