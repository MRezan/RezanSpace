# RezanTech

A technology publication built with Next.js 16, React, TypeScript and Tailwind CSS. The frontend exports to static files for Firebase Hosting. Content administration connects to a separate raw PHP + MySQL API intended to run on localhost during development.

## Frontend

1. Copy `.env.example` to `.env.local` and set your site/API URLs.
2. Run `npm install`, then `npm run dev`.
3. Build the static Firebase bundle with `npm run build` (output: `out/`).
4. Copy `.firebaserc.example` to `.firebaserc`, add the Firebase project ID, then run `firebase deploy --only hosting`.

## Backend

See `backend/README.md`. Import `backend/database.sql`, create `backend/config.php` from the example, and serve the folder through PHP/Apache on localhost.

## Scraper

See `scraper/README.md`. It checks robots.txt and is intended for permitted editorial research and imports.

## SEO

The build includes page metadata, canonical URLs, Open Graph/Twitter metadata, Article JSON-LD, a sitemap and robots directives. Set `NEXT_PUBLIC_SITE_URL` to the final Firebase URL before the production build.

### Automatic sitemap and Firebase publishing

Publishing a post immediately regenerates `public/sitemap.xml` and the current `out/sitemap.xml`. Because Firebase Hosting is static, configure `deploy_webhook_url` and `deploy_webhook_secret` in `backend/config.php` with a protected CI/build hook that runs `npm run build` followed by `firebase deploy --only hosting`. The publish API calls that hook after a post goes live, so the new `/post/{slug}` page and sitemap are deployed together. Drafts are excluded; publishing, archiving, and deleting refresh the sitemap automatically.
