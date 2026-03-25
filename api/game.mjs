// api/game.mjs
// Dynamic game page renderer for TGLSC games - Density 4 Style

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).send('Missing slug');
  }

  try {
    const tglscRes = await fetch("https://glseries.net/api/cdn");
    const tglscRaw = await tglscRes.json();

    if (!tglscRaw.success || !tglscRaw.data) {
      throw new Error('Failed to fetch TGLSC data');
    }

    const game = tglscRaw.data.find(g => g.slug === slug);

    if (!game) {
      return res.status(404).send('Game not found');
    }

    let embedUrl = game.embed_url;
    // Normalize embed URL to use local proxy
    if (/^https?:\/\/(www\.)?glseries\.net\//.test(embedUrl)) {
        embedUrl = embedUrl.replace(/^https?:\/\/(www\.)?glseries\.net\//, "/tglsc-proxy/");
    } else if (embedUrl.startsWith('/')) {
        embedUrl = '/tglsc-proxy' + embedUrl;
    } else if (!embedUrl.startsWith('http')) {
        embedUrl = '/tglsc-proxy/assets/applications/content/' + embedUrl;
    }

    const thumbnailUrl = game.thumbnail.replace(/^https?:\/\/(www\.)?glseries\.net\//, "/tglsc-proxy/");

    // EXACT HTML from user prompt, with dynamic injections and compatibility fixes
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script>
      // Early compatibility stubs for TGLSC scripts
      window.showImportantPopup = window.showImportantPopup || function(callback) { if(typeof callback === 'function') callback(); };
      window.showImportantText = window.showImportantText || function() {};
    </script>
    <meta property="og:url" content="https://glseries.net">
    <meta property="og:type" content="website">
    <meta property="og:title" content="TGLSC Density 4 - ${game.title}">
    <meta property="og:description" content="${game.title} works by allowing players to combine two words to create new ones, with an AI providing the resulting word.  Play Now On TGLSC Density 4 For Free!">
    <meta property="og:image" content="${thumbnailUrl}">
    <meta name="theme-color" content="#000000"/>
    <link rel="manifest" href="/tglsc-proxy/manifest.json" />
    <meta name="robots" content="noindex, nofollow" />
    <title>TGLSC Density 4 - ${game.title}</title>
    
    <!-- Use local proxy for all TGLSC core assets -->
    <link rel="stylesheet" href="/tglsc-proxy/assets/var/css/main.css" />
    <link rel="stylesheet" href="/tglsc-proxy/assets/var/css/content.css" />
    <link rel="stylesheet" href="/tglsc-proxy/assets/var/css/search.css" />
    <link rel="icon" href="/favicon.ico" type="image/x-icon" />
    <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
    
    <script src="/tglsc-proxy/assets/var/js/analytics.js"></script>
    <script type="module" src="/tglsc-proxy/assets/var/js/localtglscmodel.js"></script>
  </head>
  <body>
  <header class="main-header">
      <div class="logo-wrapper">
        <div class="logo-model-container">
            <model-viewer 
                id="header-logo-model" 
                src="/tglsc-proxy/assets/var/glb/logo.glb" 
                alt="TGLSC Density 4 Logo" 
                disable-zoom 
                disable-tap 
                interaction-prompt="none"
                camera-orbit="0deg 90deg 2m"
                field-of-view="30deg"
                interpolation-decay="200">
            </model-viewer>
        </div>
        <a href="/index.html" class="logo-text">TGLSC Density 4</a>
      </div>
      <div class="search-container">
        <div class="search-bar">
          <img src="/tglsc-proxy/assets/img/essential/searchicon24x.png" alt="Search" class="search-icon" />
          <input type="text" placeholder="Search..." class="search-input" />
          <img src="/tglsc-proxy/assets/img/essential/clearbtn24x.png" alt="Clear" class="clear-icon" />
        </div>
      </div>
      <div class="fps-box">
  <img
    src="/tglsc-proxy/assets/img/essential/fps.png"
    alt="FPS"
    class="widget-icon"
  />
  <div class="fps-text">
    <div class="update-label">FPS</div>
    <div class="update-timer" id="fps-value">--</div>
  </div>
</div>
      <div class="update-container">
        <div class="next-update">
          <img
            src="/tglsc-proxy/assets/img/essential/update.png"
            alt="Next Update"
            class="widget-icon"
          />
          <div class="update-text">
            <div class="update-label" id="next-update-label">
              Next Update
            </div>
            <div class="update-timer" id="next-update-timer">
              --
            </div>
          </div>
        </div>
        <div class="user-time">
          <img
            src="/tglsc-proxy/assets/img/essential/time.png"
            alt="Your Time"
            class="widget-icon"
          />
          <div class="time-text">
            <div class="time-label">Your Time</div>
            <div class="time-value" id="user-time">--</div>
          </div>
        </div>
      </div>
      <div class="auth-box" id="auth-box">
        <div class="auth-box-loading"></div>
      </div>
      <div class="header-actions">
        <div id="inbox-header-wrapper" style="position:relative">
          <button class="inbox-header-btn" id="inbox-header-btn" title="Inbox">
            <img src="/tglsc-proxy/assets/img/essential/inboxx24.png" alt="Inbox" />
            <span class="inbox-header-badge hidden" id="inbox-header-badge">0</span>
          </button>
          <div class="inbox-dropdown" id="inbox-dropdown">
            <div class="inbox-dd-header">
              <div class="inbox-dd-title">
                <img src="/tglsc-proxy/assets/img/essential/inboxx24.png" alt="" />
                Inbox
                <span class="inbox-dd-count" id="inbox-dd-count"></span>
              </div>
              <span class="inbox-dd-open" id="inbox-dd-open">Open Inbox</span>
            </div>
            <div class="inbox-dd-list" id="inbox-dd-list">
              <div class="inbox-dd-empty">No new messages</div>
            </div>
            <div class="inbox-dd-footer">
              <a href="#" id="inbox-dd-viewall">View all messages</a>
            </div>
          </div>
        </div>
        <button class="settings-btn" id="settings-btn">
          <img src="/tglsc-proxy/assets/img/essential/settings.png" alt="Settings" />
        </button>
      </div>
    </header>

    <div class="sidebar">
  <div class="top-links">
    <ul>
      <li onclick="location.href='/logged-in/games.html'">
        <img src="/tglsc-proxy/assets/img/essential/newbtn24x.png" alt="" /> New
      </li>
      <li onclick="location.href='/logged-in/games.html'">
        <img src="/tglsc-proxy/assets/img/essential/popularbtn24x.png" alt="" /> Popular
      </li>
      <li onclick="location.href='/logged-in/dashboard.html'">
        <img src="/tglsc-proxy/assets/img/essential/mystationbtn24x.png" alt="" /> My Applications
      </li>
    </ul>
  </div>

  <div class="divider"></div>

  <div class="scrollable">
    <ul id="dynamic-sidebar-list">
      <li id="sidebar-categories-btn" class="has-arrow">
        <div class="sidebar-item-content">
          <img src="/tglsc-proxy/assets/img/essential/allcategory24x.png" alt="" /> Categories
        </div>
        <img src="/tglsc-proxy/assets/img/essential/arrow24x.png" class="sidebar-arrow" alt="" />
      </li>
      <li id="sidebar-apps-btn" class="has-arrow">
        <div class="sidebar-item-content">
          <img src="/tglsc-proxy/assets/img/essential/appsbtn24x.png" alt="" /> Apps
        </div>
        <img src="/tglsc-proxy/assets/img/essential/arrow24x.png" class="sidebar-arrow" alt="" />
      </li>
      <li id="sidebar-partners-btn" class="has-arrow">
        <div class="sidebar-item-content">
          <img src="/tglsc-proxy/assets/img/essential/partner24x.png" alt="" /> Partners
        </div>
        <img src="/tglsc-proxy/assets/img/essential/arrow24x.png" class="sidebar-arrow" alt="" />
      </li>
      <li id="sidebar-favorites-btn" class="has-arrow">
        <div class="sidebar-item-content">
          <img src="/tglsc-proxy/assets/img/essential/favorite.png" alt="" /> Favorites
        </div>
        <img src="/tglsc-proxy/assets/img/essential/arrow24x.png" class="sidebar-arrow" alt="" />
      </li>
      <li id="sidebar-history-btn" class="has-arrow">
        <div class="sidebar-item-content">
          <img src="/tglsc-proxy/assets/img/essential/history.png" alt="" /> History
        </div>
        <img src="/tglsc-proxy/assets/img/essential/arrow24x.png" class="sidebar-arrow" alt="" />
      </li>
    </ul>
  </div>

  <div id="sidebar-user-count-wrapper"></div>

  <div class="divider"></div>

  <div class="static-links">
    <ul>
      <li onclick="location.href='/legal.html#privacy-policy'">
        <img src="/tglsc-proxy/assets/img/essential/privacypolicybtn24x.png" alt="" /> Privacy Policy
      </li>
      <li onclick="location.href='/legal.html#terms-of-service'">
        <img src="/tglsc-proxy/assets/img/essential/formbtn24x.png" alt="" /> Terms Of Service
      </li>
      <li onclick="location.href='/logged-in/dashboard.html'">
        <img src="/tglsc-proxy/assets/img/essential/extrabtn24x.png" alt="" /> Extras
      </li>
    </ul>
  </div>

  <div class="bottom-section">
    <div class="social-buttons">
      <button onclick="window.open('https://www.youtube.com/@GLSeriesDev', '_blank')">
        <img src="/tglsc-proxy/assets/img/essential/youtubebtn24x.png" alt="YouTube" />
      </button>
      <button onclick="window.open('https://discord.gg/mqGRCEAuna', '_blank')">
        <img src="/tglsc-proxy/assets/img/essential/discordbtn24x.png" alt="Discord" />
      </button>
      <button onclick="window.open('https://www.youtube.com/watch?v=u-JsPTukUb8', '_blank')">
        <img src="/tglsc-proxy/assets/img/essential/linkbtn24x.png" alt="Random" />
      </button>
    </div>
  </div>
</div>

    <div class="content-area">
      <iframe src="${embedUrl}" class="content-iframe" id="content-frame" scrolling="yes"></iframe>
    </div>

    <div class="settings-modal" id="settings-modal">
    <div class="modal-content"><button class="close-btn" id="close-modal">×</button><iframe
        src="/logged-in/settings.html" class="settings-iframe" id="settings-iframe"></iframe></div>
  </div>

  <div class="settings-modal" id="inbox-modal" style="display:none">
    <div class="modal-content"><button class="close-btn" id="inbox-close-btn">&times;</button><iframe src="" class="settings-iframe" id="inbox-iframe"></iframe></div>
  </div>

    <!-- Proxy all relative paths from main.js back to TGLSC -->
    <script src="/tglsc-proxy/assets/var/js/preferences.js" defer></script>
    <script src="/tglsc-proxy/assets/var/js/bugfix.js" defer></script>
    <script src="/tglsc-proxy/assets/var/js/search.js" defer></script>
    <script src="/tglsc-proxy/assets/var/js/newcontent.js" defer></script>
    <script src="/tglsc-proxy/assets/var/js/popularcontent.js" defer></script>
    <script src="/tglsc-proxy/assets/var/js/main.js" defer></script>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Game page error:', error);
    res.status(500).send('Internal Server Error');
  }
}
// Made with ❤️ from 4SP