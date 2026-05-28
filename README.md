# TAGME Prep — PWA

A Progressive Web App for studying for the TAGME (Training Administrators of Graduate Medical Education) certification exam.

## What's inside

- **Browse** — read source material with citations
- **Flashcards** — tap to flip, mark known/unknown
- **Quiz** — multiple choice with feedback and source citations on every question
- **Adaptive review** — missed items return until you get them right twice in a row
- **Progress tracking** — per-section stats stored locally on your device
- **Offline support** — works fully offline once installed
- **Light / dark mode** — toggle in the top-right; follows system by default

No accounts, no backend, no data leaves your device.

## Testing locally

You can't just double-click `index.html` — service workers and ES modules need to be served over HTTP. From the project root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser. Open in Safari on your iPhone (on the same network: `http://<your-mac-ip>:8000`) to test the iOS install flow.

## Deploying to GitHub Pages

1. Create a new GitHub repository (public).
2. Push everything in this folder to the repo:
   ```bash
   cd tagme-pwa
   git init
   git add .
   git commit -m "Initial PWA shell"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / root → Save.**
4. After ~1 minute, the site is live at `https://<your-username>.github.io/<repo-name>/`.

## Installing on iPhone home screen

1. Open the deployed URL in **Safari** (not Chrome — Chrome on iOS can't install PWAs).
2. Tap the **Share** button.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm. The app icon appears on your home screen. Tapping it launches the app full-screen, no browser chrome, works offline.

## Updating

Push new commits to GitHub. The service worker checks for updates on each launch when online. Force a full refresh by deleting the home screen icon and reinstalling, or by bumping the `VERSION` constant in `sw.js`.

## File structure

```
tagme-pwa/
├── index.html
├── manifest.json
├── sw.js                 ← service worker for offline
├── css/styles.css
├── js/
│   ├── app.js            ← entry point, router, theme
│   ├── db.js             ← IndexedDB wrapper
│   ├── content.js        ← content loader
│   ├── view-home.js
│   ├── view-sections.js
│   ├── view-mode-picker.js
│   ├── view-browse.js
│   ├── view-flashcards.js
│   ├── view-quiz.js
│   ├── view-review.js
│   └── view-progress.js
├── content/
│   ├── index.json        ← lists all sections + counts
│   └── doc*.json         ← one file per document (currently placeholders)
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── icon-512-maskable.png
```

## Content status

Currently shipping with **placeholder content** in all 8 sections (3 flashcards and 3 MC questions each, 48 items total). Real content will be added document by document, replacing the placeholder JSON files.
