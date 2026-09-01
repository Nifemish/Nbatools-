# TrackPort PWA

This folder contains the installable TrackPort web app:

- `index_1788257924122.html` — the TrackPort app with the top navigation install button
- `manifest.webmanifest` — app name, launch behavior, colors, and icons
- `sw.js` — offline app-shell caching and service-worker support
- `icons/` — 192px and 512px app icons for phone installation

## How installation works

Open the HTML through an HTTPS web address, or through `localhost` during development. On supported browsers, the **Install app** button in the top navigation opens the browser's native install prompt. Once installed, TrackPort launches in a standalone app window.

If the browser does not expose a native prompt, the button shows the device-specific browser instructions instead. iPhone and iPad installation must be completed from Safari's **Share → Add to Home Screen** menu because iOS does not allow a website to trigger that system action automatically.

The app must be hosted over HTTPS for service workers and normal PWA installation. Opening the HTML directly as a `file://` URL will not enable service-worker installation.