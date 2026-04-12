// api/sports-proxy.mjs
// Proxy for streamed.pk sports data

export default async function handler(req, res) {
  const { path } = req.query;

  if (!path) {
    return res.status(400).json({ error: 'Missing "path" parameter' });
  }

  try {
    const targetUrl = `https://streamed.pk/api/${path}`;
    
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://superstrim.pages.dev/',
        'Origin': 'https://superstrim.pages.dev',
        'Accept': 'application/json, text/plain, */*',
      }
    };

    const response = await fetch(targetUrl, fetchOptions);

    if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch: ${response.statusText}` });
    }

    const data = await response.json();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 1 min
    
    res.json(data);
  } catch (error) {
    console.error('Sports Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
