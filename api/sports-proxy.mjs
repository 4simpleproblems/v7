// api/sports-proxy.mjs
// Proxy for streamed.pk sports data

export default async function handler(req, res) {
  const { path } = req.query;

  if (!path) {
    return res.status(400).json({ error: 'Missing "path" parameter' });
  }

  try {
    const targetUrl = path.startsWith('http') ? path : `https://streamed.pk/api/${path}`;
    
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://streamed.pk/',
        'Origin': 'https://streamed.pk',
        'Accept': 'image/*, application/json, text/plain, */*',
      }
    };

    const response = await fetch(targetUrl, fetchOptions);

    if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch: ${response.statusText}`, url: targetUrl });
    }

    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (contentType.includes('application/json')) {
        const data = await response.json();
        res.setHeader('Cache-Control', 'public, max-age=60'); // Cache JSON for 1 min
        res.json(data);
    } else {
        const buffer = await response.arrayBuffer();
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache images for 24h
        res.send(Buffer.from(buffer));
    }
  } catch (error) {
    console.error('Sports Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
