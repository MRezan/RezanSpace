# REZAN

A multi-topic publishing community built with Next.js 16, React, TypeScript, PHP and MySQL.

## Frontend

1. Copy `.env.example` to `.env.local` and set the site/API URLs.
2. Run `npm install`, then `npm run dev`.
3. Create the static production build with `npm run build`.

## Backend

The PHP/MySQL backend is in `backend/`. The production database name is `if0_42558685_rezantech`.

## Private publishing API

This is the only API reference needed for future AI-assisted publishing.

```text
Publisher: http://rezan.space/api-publisher.html
Endpoint:  http://rezan.space/api/automation-publish.php
API key:   configure privately as REZAN_AUTOMATION_KEY; match backend/config.php
```

The browser publisher is the recommended interface on InfinityFree because the host blocks ordinary server-to-server API clients with a JavaScript challenge. Open the Publisher URL in a browser, enter the API key and publishing JSON, then select **Publish through API**.

The publisher accepts an unlimited overall number of posts. It sends them sequentially in batches of 100 or fewer so each request remains within the backend limit. It creates missing categories automatically and displays cumulative created, updated, skipped and failed counts.

### Publishing JSON

```json
{
  "categories": ["Technology", "Science", {"name": "Food", "slug": "food"}],
  "create_missing_categories": true,
  "on_conflict": "skip",
  "posts": [
    {
      "title": "A Practical Guide to Urban Gardening",
      "slug": "practical-guide-urban-gardening",
      "excerpt": "How small spaces can produce useful herbs and vegetables.",
      "content": "<p>Start with the light available to you.</p><h2>Choose suitable plants</h2><p>Herbs and leafy greens are forgiving choices.</p>",
      "author": "Maya Chen",
      "category": "Lifestyle",
      "image_url": "http://rezan.space/uploads/example.jpg",
      "status": "published",
      "published_at": "2026-08-06T10:00:00Z"
    }
  ]
}
```

Required post fields:

- `title`
- `excerpt`
- `content`
- `author`

Optional post fields:

- `slug`: generated from the title when omitted
- `category`: created automatically when missing
- `image_url`: must be an HTTPS URL; omit or use an empty string for a text-only post
- `status`: `published` or `draft`; defaults to `published`
- `published_at`: optional ISO-compatible publication date

`on_conflict` controls what happens when a slug already exists:

- `skip`: safely ignore the existing post
- `update`: replace the existing post using the supplied content
- `error`: stop that batch with a conflict response

The API supports rich HTML including paragraphs, headings, lists, emphasis, blockquotes and safe links. Unsafe scripts, embedded objects, styles and invalid links are removed by the backend.

### Direct request format

When the hosting environment permits direct API access:

```bash
curl --fail-with-body -sS \
  -X POST "http://rezan.space/api/automation-publish.php" \
  -H "X-Rezan-Automation-Key: ${REZAN_AUTOMATION_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary @publishing-payload.json
```

The backend accepts at most 100 posts and 100 categories in an individual HTTP request. The browser publisher handles larger imports automatically by splitting them into multiple requests.

Keep `api-publisher.html` available only when publishing automation is needed. Keep the publishing key out of repository files. Configure it privately in the backend and GitHub Actions secrets.

## Multilingual AI automation

See [AUTOMATION.md](AUTOMATION.md) for CPU Qwen writing, SSD-1B illustrations, all 15 languages, source/evidence checks, scheduled GitHub Actions and verified FTPS deployment. Live schedules are gated by `AUTO_PUBLISH_ENABLED` until HTTPS, database migration and hosting secrets are configured.

## UI maintenance

The original site design and Home animations are retained. `app/layout-fixes.css`
fixes the mobile bottom-navigation containing block, tablet admin form overflow
and hidden mobile admin drawer navigation. All sidebar topics appear at the same level; **See more** at the bottom
expands the list, which scrolls independently. The compact sidebar label is
**Tech Guides**. Existing theme, typography, icon treatment and hover animations are
preserved; the experimental redesign has been removed.

Run responsive checks with a local non-sensitive snapshot:

```bash
REZAN_POSTS_FILE=tests/fixtures/multilingual-posts.json npm run dev
npm ci --prefix automation
node automation/ui-review.mjs
```

The script uses Google Chrome via Playwright and local API fixtures. It checks
16 routes at five viewport widths, topic selection, menus and admin sections.
Screenshots/reports are ignored under `build/ui-review/`. Production export and
SEO checks use `npm run test:i18n`.

## Hourly publishing and search discovery

The hourly workflow covers all 16 categories and all 15 languages, with 20 parallel
generation slots and complete-batch validation. See `AUTOMATION.md` for queue,
source availability, artifact recovery and deployment behavior. Repository variable
`AUTO_PUBLISH_ENABLED=true` activates schedules; previews never publish.

Localized category archives link to real authored articles and expose canonical,
Open Graph, language-alternate, CollectionPage and breadcrumb metadata. Empty
archives are noindex and omitted from the sitemap. Account/admin/workspace routes
are noindex. Published articles link to their category and related stories.
The sitemap refreshes after publication, splits large URL sets safely, and is
checked after live deployment. These are technical SEO foundations, not a promise
of indexing dates or search rankings.

Validation for hourly/category/SEO changes (2026-11-05): all 16 categories selected
real, distinct source evidence; 28 Python automation/deployment tests, 23 static
SEO/export tests, five category/sitemap-limit tests and PHP backend checks passed.
Responsive review covers 80 route/viewport combinations. The sidebar retains the
original icon-tile style and exposes all topics in a flat list without subcategories.

All 15 language homes additionally passed 45 desktop/mobile viewport checks for the shared flat sidebar, compact labels, pinned expansion control and bottom navigation.


## Section generation recovery — 2026-11-08

Run `42431029813` failed in eight original-article jobs, all with the generic
“Section paragraph length or structure failed validation” message; publication
was correctly blocked. Native decoding intentionally omits string-length bounds
(to avoid llama.cpp grammar expansion), so valid JSON can still violate Python's
paragraph limits. The old section retry repeated generic correction instructions
without reporting the failing lengths or saving completed sections.

The generator now targets 300–700 characters per paragraph inside the unchanged
180–1100 validation bounds. Where possible it moves complete sentence boundaries
without removing words; it never clips body text or pads unsupported claims.
Unrepairable sections get at most three attempts with distinct, measured feedback.
Public diagnostics expose section/language, schema reason and lengths, not drafts.
Runtime failures are not blindly retried as content failures.

Validated sections are saved atomically in per-language progress files. Failed
original/translation jobs retain those files as artifacts, and same-run or trusted
cross-run recovery restores them. Fingerprints include evidence, language, original
translation input and generation policy; invalid/stale checkpoints are ignored.
Final evidence review, requested-language checks and complete 240-post validation
remain mandatory. A rejected review invalidates the partial draft. Successful
outputs remove redundant progress files.

Tests: `python -m unittest discover -s automation/tests -v` includes length repair,
CJK, unchanged literal code, bounded retries, private diagnostics, failure recovery,
changed evidence, invalid checkpoints, rejected reviews and artifact wiring.
Recovery of the source run should use current `main` and `resume_run_id=42431029813`
to reuse the eight completed originals. Rerunning its old jobs uses the old commit.
These safeguards address the observed failure; external service outages and
unverifiable drafts still stop safely and retain recoverable work.


GitHub Actions runtime maintenance (2026-11-08): all workflows now use native
Node.js 24 actions: checkout v5, setup-node v5, setup-python v6, cache/restore v5,
upload-artifact v6 and download-artifact v7. Their upstream action manifests were
checked for `runs.using: node24`; upload/download names, paths and recovery inputs
are preserved. This removes the Node 20 deprecation warning for new runs.
Already-started runs retain their original workflow snapshot and may still show
that warning; restarting their old jobs does not update the action versions.


Parallel generation update (2026-11-08): removed the all-images-before-translation
barrier. A shared 20-slot matrix runs the 16 covers and 224 non-English translations
concurrently, while the 16 English originals are reused directly. Publication
still waits for every task and validates all 240 articles and illustrations.
Inference models remain on separate runners, completed artifacts remain reusable,
and failed tasks do not cancel unrelated work. Already-running workflows keep
their saved dependency graph; checkpoint recovery on current main applies this
scheduling change without regenerating completed originals.


## Article landing pages and shared loading — 2026-11-08

Published localized and legacy post URLs now use one article reader with the
Home feed's blue palette, card surfaces and responsive typography. Related stories
are real cards, ranked within the authored language and linked to canonical
localized article URLs. Article headers expose the author, actual publication and
modification dates, reading estimate and available translations. Section anchors,
mobile section navigation and topic links help readers continue exploring.

SEO output includes one headline, a bounded description, canonical/real hreflang
alternates, article social metadata and connected WebPage/BlogPosting/breadcrumb
structured data. Older editorial sample links now point to real exported routes.
This improves crawlability and page presentation; it does not guarantee rankings.

Mobile actions use one Like / Comment / Share row, with Save beside the author.
The sidebar's See more/See less control follows the last topic inside the scroll
area. Home layout and existing hover animations are preserved.

A shared REZAN orbit animation now covers feed, story, discovery, search, library,
profile, author, discussion and administrative wait states. Story placeholders
match the final reader geometry. Motion is disabled for reduced-motion users;
there is no artificial loading delay. The API reader uses the same presentation,
validates its response and leaves loading after a bounded request timeout.

Checks: `npm run test:articles`, `npm run test:i18n`, and
`node automation/ui-review.mjs`. `UI_REVIEW_DELAY_MS=500` exercises real loading
transitions using mocked network latency; `UI_REVIEW_MOTION=on` previews motion.


### Firebase account integration (2026-11-08)

Google sign-in verifies a Firebase Google ID token on PHP with the pinned `firebase/php-jwt` library before issuing a normal REZAN session. Existing local passwords and profiles remain in MySQL. Existing non-Gmail accounts require their current REZAN password once before Google is linked. Password recovery uses Firebase reset emails, a custom `/account/` action handler and one-time code verification on PHP; a successful reset changes the local password hash and revokes existing sessions. The Firebase project must enable Google and Email/Password, authorize `rezan.space`, and set the email action URL to `https://rezan.space/account/`. The sender domain is verified separately through Firebase SPF/DKIM DNS records. Never commit server configuration or service-account keys.

Optional Firebase Analytics loads after a visitor opts in using Privacy preferences. Private routes and URL queries are excluded from manual page views; disable GA4 enhanced measurement for the web stream to prevent automatic history/form events. Analytics and Tag Manager are measurement tools, not ranking guarantees; only one GA4 integration is used. Crashlytics Web is public preview and explicitly not recommended for production by Google, so the isolated integration remains disabled unless `NEXT_PUBLIC_CRASHLYTICS_WEB_PREVIEW=true` is explicitly set on a preview build. No raw exceptions or account identifiers are submitted by that integration.

Validation: `php tests/firebase-auth.php`, `npm run test:i18n`, and `node automation/auth-ui-review.mjs` (with the built `out/` served on localhost:3000). Firebase security tests cover signed/forged/expired tokens, project/provider checks, account linking, reset replay and session revocation. The PHP transaction tests use SQLite with a small MySQL syntax adapter; hosted MySQL still requires deployment smoke checks. Revert this feature commit to return to local-only authentication; keep the database backup and do not delete existing users or password hashes.
