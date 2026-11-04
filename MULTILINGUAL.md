# Multilingual publishing and search

Public language homes: `/en/`, `/es/`, `/pt-BR/`, `/hi/`, `/id/`, `/ar/`, `/fr/`, `/de/`, `/ja/`, `/bn/`, `/vi/`, `/tr/`, `/ko/`, `/it/`, `/pl/`.
Posts: `/{language}/post/{slug}/`. Arabic pages render right to left. The root is a language directory and community timeline. Account, moderation and writing tools keep their existing URLs.

## Deploying an existing installation

1. Back up the database and apply `backend/languages-migration.sql` once before deploying the updated API. Fresh installations use the updated schemas instead. Existing posts default to English; set any non-English post's correct language before the build.
2. Set `NEXT_PUBLIC_SITE_URL` to the exact public origin, consistently across Next.js and PHP `site_url`. The default is `https://rezan.space`; verify that your host has a valid HTTPS certificate. Set the API URL as well.
3. Build against the migrated API with `npm run build`. If the host blocks API clients, provide `REZAN_POSTS_FILE` pointing to a JSON array of all published posts including full sanitized HTML content, slug, title, excerpt, author, category_name, published_at, language, optional updated_at, image_url and translation_key. Do not commit private snapshots. Builds fail when the data source is unavailable rather than silently omitting stories.
4. Upload the generated `out/` and updated PHP API, `bootstrap.php`, and `lib/`. `scripts/package-infinityfree.sh` packages these. Keep the host's database configuration.
5. Rebuild after publishing, editing, translating, archiving or deleting posts. Set the PHP deploy webhook to a real build/deploy pipeline; static article pages cannot update themselves. Sitemap refresh alone does not publish new HTML.
6. Verify your domain in Google Search Console and submit `/sitemap.xml`. Inspect one published URL per language. Indexing and rankings depend on Google's evaluation, content and competition; code cannot guarantee rankings.

## Writing and translations

The Create page and timeline composer include a story-language selector. Each story contains real authored text in its selected language. Existing English posts are not automatically translated or duplicated into other languages. Empty language homes remain usable and show an honest translated empty state.

The private publishing API also accepts `language` and `translation_key`:

```json
{
  "on_conflict": "skip",
  "posts": [
    {"slug":"solar-energy-en","language":"en","translation_key":"solar-energy","title":"Solar energy","excerpt":"How solar power works.","content":"<p>An original English article.</p>","author":"REZAN Editorial"},
    {"slug":"solar-energy-bn","language":"bn","translation_key":"solar-energy","title":"সৌরশক্তি","excerpt":"সৌরবিদ্যুৎ যেভাবে কাজ করে।","content":"<p>বাংলায় লেখা সম্পূর্ণ অনুবাদ।</p>","author":"REZAN Editorial"}
  ]
}
```

Use a unique slug per post (including across languages), and the same nonempty translation_key only for actual translations of one story. Only one post per language is allowed in a translation group. Unrelated posts omit translation_key. API edits preserve the current story language; automation updates preserve those values when omitted.

## Search behavior

Pages contain server-rendered text, correct document lang/dir, self-referencing canonicals, localized Open Graph metadata and JSON-LD. Language homes advertise all 15 home alternatives. Articles advertise only published translations in the same group, reciprocally and including themselves. Sitemap entries follow the same rule; no fabricated translation URLs or ranking promises. Legacy post URLs remain readable and canonicalize to the prefixed story URL.

A language menu selects a language home. On translated stories, additional links open the actual equivalent article. No language is forced based on IP or browser settings.

Run `npm run test:i18n` for a fixture build plus 18 HTML/export checks and the PHP sitemap checks. This uses synthetic posts and example.com; do not deploy its `out/` directory. Always run a production build against your real migrated data before deployment.
