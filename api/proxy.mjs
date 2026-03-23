// api/proxy.mjs
// Simple proxy for TGLSC content

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing "url" parameter' });
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    // Only allow glseries.net for security
    if (!decodedUrl.includes('glseries.net')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const response = await fetch(decodedUrl);

    if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
    }

    // Forward relevant headers
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Optimization: Cache images for 24h
    if (contentType && contentType.startsWith('image/')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
