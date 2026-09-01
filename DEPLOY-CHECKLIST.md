# Vercel deployment checklist

Deploy the contents of this folder as the site root. Confirm these URLs return 200 after deployment:

- `/index.html`
- `/manifest.webmanifest`
- `/sw.js`
- `/icons/icon-192.png`
- `/icons/icon-512.png`

After redeploying, open the site in Chrome, refresh once, and use the TrackPort **Install app** button in the top navigation. If Chrome has cached the old shortcut-only version, clear the site data or unregister the old service worker before testing again.
