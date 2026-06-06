import http.server
import socketserver
import os
import urllib.parse
import requests
import sys

PORT = 8000
DIRECTORY = "."

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.end_headers()

    def do_GET(self):
        # Handle API proxy requests
        parsed_path = urllib.parse.urlparse(self.path)
        if parsed_path.path in ["/api/proxy", "/VALO_PLUS/api/proxy"]:
            query = urllib.parse.parse_qs(parsed_path.query)
            path_param = query.get('path', [None])[0]
            if path_param:
                # Build the target URL
                target_url = f"https://streamed.pk/api/{path_param}"
                try:
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Referer': 'https://superstrim.pages.dev/',
                        'Origin': 'https://superstrim.pages.dev'
                    }
                    resp = requests.get(target_url, headers=headers, timeout=10)
                    
                    self.send_response(resp.status_code)
                    # Copy relevant headers
                    for header in ['Content-Type', 'Cache-Control', 'Expires']:
                        if header in resp.headers:
                            self.send_header(header, resp.headers[header])
                    self.end_headers()
                    self.wfile.write(resp.content)
                    return
                except Exception as e:
                    self.send_error(500, f"Proxy error: {e}")
                    return

        # Handle static files
        path = parsed_path.path
        if not os.path.splitext(path)[1]:
            # Try path + /index.html
            local_path = path.lstrip('/')
            potential_file = os.path.join(DIRECTORY, local_path, "index.html")
            if os.path.exists(potential_file):
                self.path = path.rstrip('/') + "/index.html"
            else:
                # Try path + .html
                potential_file = os.path.join(DIRECTORY, local_path + ".html")
                if os.path.exists(potential_file):
                    self.path = path + ".html"
                # For Next.js dynamic routing fallback
                # VALO_PLUS pathing
                elif path.startswith("/VALO_PLUS/sports/"):
                    self.path = "/VALO_PLUS/sports/index.html"
                elif path.startswith("/VALO_PLUS/standings/"):
                    self.path = "/VALO_PLUS/standings/index.html"
                elif path.startswith("/VALO_PLUS/schedule/"):
                    self.path = "/VALO_PLUS/schedule/index.html"
                # V7 pathing
                elif path.startswith("/sports/"):
                    self.path = "/sports/index.html"
                elif path.startswith("/standings/"):
                    self.path = "/standings/index.html"
                elif path.startswith("/schedule/"):
                    self.path = "/schedule/index.html"

        return super().do_GET()

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    httpd.allow_reuse_address = True
    print(f"Serving v7 at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
