# TrackPort PWA

This package is the repaired, installable TrackPort static web app.

## Deploy requirements

1. Upload the contents of this folder to a static host.
2. Serve the site from the domain root (`https://your-domain.example/`).
3. Use HTTPS. Browsers do not allow normal PWA installation from a plain HTTP or `file://` URL (localhost is allowed for testing).
4. Keep `manifest.webmanifest`, `sw.js`, `icons/`, and `index.html` at the same level as shown here.
5. After deployment, open the HTTPS URL in Chrome or Edge, reload once, and use the browser's **Install TrackPort** option. On iPhone/iPad, use Safari's Share menu and choose **Add to Home Screen**.

## What was repaired

- Changed the manifest launch URL and scope to absolute root paths so the installed app opens the correct document.
- Set explicit standalone display behavior and disabled related-app preference.
- Added a stable application name and correct 180px Apple touch icon link.
- Registered the service worker at `/sw.js` with `/` scope and updated its cache paths.
- Made service-worker updates safer by deleting only old TrackPort caches.
- Kept navigation network-first so online users receive the latest version, with an offline app-shell fallback.
- Stopped the Android install banner from presenting “Add shortcut” guidance unless the browser actually exposes an install prompt.
- Added `_headers` so compatible static hosts serve the manifest and service worker with appropriate content types and revalidation.
