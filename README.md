# 4SP V7

**4SP V7** is the next-generation, evolutionary enhancement of the renowned **4SP** platform. It features a modernized design system, stateless customization architecture, and unhindered access to integrated tools.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/4simpleproblems/v7/)

---

## The V-Suite Ecosystem

**4SP V7** offers the **V-Suite**, a collection of connected apps designed to handle everything from media consumption to artificial intelligence.

### <i class="fa-solid fa-globe"></i> Vern: Advanced Proxy

The backbone of the platform. *Vern* is a dynamic proxy that circumvents network restrictions in a more reliable way than static proxies.

*   **Dynamic Routing**: Requires a dynamic host (e.g., Vercel, Railway) to function.
*   **Optimized Protocol**: Built for speed and low-latency browsing.
*   **Auto-Failover**: Automatically disables on static `*.github.io` URLs to prevent breaking the user interface.

### <i class="fa-solid fa-music"></i> Velium: Integrated Music

An integrated music player that eliminates the need to open external tabs.

*   **Background Playback**: Listen to music while you use other tools or play games.
*   **UI Integration**: Matches the sleek, dark design scheme of the platform.

### <i class="fa-solid fa-tv"></i> Vora: Media & Movies

The "Movie App" for the inner circle. **Vora** offers curated movies and TV shows for high-quality streaming.

*   **Sleek Library View**: A clean interface designed to display large content libraries.
*   **Optimized Player**: Engineered for minimal buffering, even on school networks.

### <i class="fa-solid fa-robot"></i> Vana: AI Chatbot

A personal AI collaborator integrated into the dashboard.

*   **Social & Dev Assistant**: Use **Vana** for debugging code or understanding social variables in real-time.
*   **Dynamic Response**: Powered by advanced LLM backends.

---

## UI & Design Philosophy

4SP V7 isn’t just a product—it’s a design upgrade.

*   **Bento Grid Architecture**: A modular, responsive grid layout for the main landing page, showcasing features, stats, links, and tools as asymmetrical but aligned cards.
*   **Manrope Typography**: Migrated entirely to Manrope from Google Fonts (weights 400, 500, 700, 800) as the global typography system.
*   **Stateless Customization**: Interactive themes, panic key configs, and tab disguisers run entirely in browser storage (`localStorage` & IndexedDB) with zero login required.
*   **Tactile Spring Physics**: Replaced all standard transitions with a custom spring bezier transition (`transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`), featuring interactive hover scaling (`1.02` with glow) and active compression (`0.97`).

---

## Hosting & Capability Comparison

| Feature             | 4SP (Standard) | 4SP V7                     |
| ------------------- | -------------- | -------------------------- |
| **Hosting Mode**    | Fully Static   | Dynamic Required           |
| **Vern Proxy**      | No             | Yes                        |
| **Velium Music**    | No             | Yes                        |   
| **Vora Media**      | No             | Yes                        |
| **Vana AI**         | No             | Yes                        |
| **Design Language** | Original       | V7 Aesthetic (Bento Grid)  |

> **Developer Note:** 4SP V7 is designed to run on dynamic environments like **Vercel**. GitHub Pages can be used to preview the UI; however, for **Vern** and **Vana** to be operational, a dynamic backend is required.
