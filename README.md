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
