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

    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://glseries.net/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    let response = await fetch(decodedUrl, fetchOptions);

    // Fallback for glseries.net -> www.glseries.net if 404
    if (response.status === 404 && decodedUrl.includes('glseries.net') && !decodedUrl.includes('www.')) {
        const wwwUrl = decodedUrl.replace('glseries.net', 'www.glseries.net');
        response = await fetch(wwwUrl, fetchOptions);
    }

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
