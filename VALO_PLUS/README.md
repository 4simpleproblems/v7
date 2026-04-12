# Superstrim Local Clone

A fully functional local clone of Superstrim, including a custom Python server to handle Next.js dynamic routing and API proxying for live sports data.

## Features
- **Full Asset Localization:** All JS, CSS, and images are hosted locally.
- **Dynamic Routing:** Automatically handles Next.js-style clean URLs (e.g., /sports, /standings).
- **Live API Proxy:** Proxies requests to `streamed.pk` via a local endpoint to bypass CORS and provide real-time data.
- **Category Fallbacks:** Ensures category pages render correctly using template fallbacks.

## How to Run
1. Ensure you have Python 3 and the `requests` library installed:
   ```bash
   pip install requests
   ```
2. Start the local server:
   ```bash
   python3 serve_locally.py
   ```
3. Open your browser and navigate to:
   [http://localhost:8000](http://localhost:8000)

Made with ❤️ from 4SP
