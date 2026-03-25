// api/proxy.mjs
// Enhanced proxy for TGLSC content with URL rewriting

export default async function handler(req, res) {
  const { url, ...params } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing "url" parameter' });
  }

  try {
    let decodedUrl = decodeURIComponent(url);
    
    // Reconstruct query string if there were other parameters
    const queryParams = new URLSearchParams(params).toString();
    if (queryParams) {
      decodedUrl += (decodedUrl.includes('?') ? '&' : '?') + queryParams;
    }

    // Only allow glseries.net for security
    if (!decodedUrl.includes('glseries.net')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://glseries.net/',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
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
    const contentType = response.headers.get('content-type') || '';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    const contentLength = response.headers.get('content-length');
    if (contentLength && !contentType.includes('text/html')) { // Don't forward length if we might rewrite
      res.setHeader('Content-Length', contentLength);
    }

    // Optimization: Cache images for 24h
    if (contentType.startsWith('image/')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    // URL Rewriting for text-based content
    if (contentType.includes('text/html') || contentType.includes('application/javascript') || contentType.includes('text/css')) {
        let text = await response.text();
        
        // Replace root-relative URLs in HTML/CSS/JS
        // Handle src="/assets/...", href="/assets/...", url("/assets/...") and url(/assets/...)
        text = text.replace(/(src|href|url)\s*(?:=|\()\s*["']?\/(assets|js|css|img|images|lib|var|glb|fonts)\//g, (match, p1, p2) => {
            const separator = match.includes('=') ? '=' : '(';
            const quote = (match.includes('"') ? '"' : (match.includes("'") ? "'" : ""));
            return `${p1}${separator}${quote}/tglsc-proxy/${p2}/`;
        });
        
        // Handle root-relative URLs in scripts (e.g. fetch('/assets/...'))
        text = text.replace(/["']\/(assets|js|css|img|images|lib|var|glb|fonts)\//g, (match, p1) => {
            const quote = match.charAt(0);
            return `${quote}/tglsc-proxy/${p1}/`;
        });

        res.send(text);
    } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
