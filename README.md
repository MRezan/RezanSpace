# REZAN

A multi-topic publishing community built with Next.js 16, React, TypeScript and Tailwind CSS. The frontend exports to static files for Firebase Hosting. Content administration connects to a separate PHP and MySQL API.

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

## API reference

This section is the operational reference for administering a deployed REZAN backend. It is intentionally self-contained so it can be supplied to an API client or automation agent later.

### Connection details

Set these values for the target environment:

```bash
export REZAN_API_BASE="https://api.example.com"
export REZAN_TOKEN="replace-with-a-session-token"
```

`REZAN_API_BASE` is the public URL of the backend directory, without a trailing slash. All request and response bodies are JSON unless an endpoint explicitly accepts a file upload.

Never save a real password or bearer token in this README, source control, prompts, screenshots, or logs. Provide credentials through a secure secret mechanism when executing requests.

Common headers for protected JSON endpoints:

```http
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
Accept: application/json
```

### Access levels

| Access | Capabilities |
| --- | --- |
| Public | Read published posts and categories; read comments and writers; subscribe |
| Signed-in user | Manage own profile and posts; comment, react, save, and follow |
| Staff administrator (`editor`) | Open the editorial dashboard; create posts; change publishing status; delete posts |
| Owner administrator (`admin` plus configured owner email) | All staff capabilities plus categories, users, staff access, and subscribers |

Only the configured owner may create or delete categories or change another user's access. A staff administrator cannot grant themselves additional permissions.

### Authentication

#### Log in and receive a bearer token

`POST /api/auth.php?action=login`

```bash
curl --fail-with-body -sS \
  -X POST "$REZAN_API_BASE/api/auth.php?action=login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"YOUR_PASSWORD"}'
```

Successful response:

```json
{
  "token": "64-character-session-token",
  "user": {
    "id": 1,
    "name": "Owner Name",
    "email": "owner@example.com"
  }
}
```

Use the returned `token` as `REZAN_TOKEN`. Sessions remain active until logout.

#### Get the current user

`GET /api/auth.php?action=me` — signed-in user

```bash
curl --fail-with-body -sS \
  "$REZAN_API_BASE/api/auth.php?action=me" \
  -H "Authorization: Bearer $REZAN_TOKEN"
```

#### Log out

`POST /api/auth.php?action=logout` — signed-in user

```bash
curl --fail-with-body -sS \
  -X POST "$REZAN_API_BASE/api/auth.php?action=logout" \
  -H "Authorization: Bearer $REZAN_TOKEN"
```

### Categories

#### List categories

`GET /api/categories.php` — public

```bash
curl --fail-with-body -sS "$REZAN_API_BASE/api/categories.php"
```

Response:

```json
{
  "data": [
    {"id": 1, "name": "Technology", "slug": "technology", "post_count": 12}
  ]
}
```

#### Create a category

`POST /api/categories.php` — owner only

```bash
curl --fail-with-body -sS \
  -X POST "$REZAN_API_BASE/api/categories.php" \
  -H "Authorization: Bearer $REZAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Food"}'
```

The slug is generated automatically. Category names must be unique. Create a new category before publishing posts assigned to it.

#### Delete a category

`DELETE /api/categories.php?id=CATEGORY_ID` — owner only

```bash
curl --fail-with-body -sS \
  -X DELETE "$REZAN_API_BASE/api/categories.php?id=12" \
  -H "Authorization: Bearer $REZAN_TOKEN"
```

Posts remain in the database but become uncategorized.

### Posts

#### List published posts

`GET /api/posts.php?page=PAGE&limit=LIMIT` — public

- `page`: minimum `1`; default `1`
- `limit`: `1`–`25`; default `10`

```bash
curl --fail-with-body -sS \
  "$REZAN_API_BASE/api/posts.php?page=1&limit=25"
```

Response shape:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "has_more": true
  }
}
```

#### Get one published post

`GET /api/posts.php?slug=POST_SLUG` — public

```bash
curl --fail-with-body -sS \
  "$REZAN_API_BASE/api/posts.php?slug=example-post"
```

#### List all posts for administration

`GET /api/posts.php?admin=1&page=PAGE&limit=LIMIT&q=SEARCH` — owner or staff administrator

- Includes published, draft, and archived posts.
- `limit`: `5`–`100`; default `20`.
- `q` searches title, author, category, and status.

```bash
curl --fail-with-body -sS \
  "$REZAN_API_BASE/api/posts.php?admin=1&page=1&limit=50&q=science" \
  -H "Authorization: Bearer $REZAN_TOKEN"
```

Administrative pagination includes `page`, `limit`, `total`, `pages`, and `has_more`.

#### Create and immediately publish a post

`POST /api/posts.php` — owner or staff administrator

Required fields: `title`, `excerpt`, `content`, and `author`.

Optional fields: `slug` and `category`. If `slug` is omitted, it is generated from the title. The named category must already exist.

`content` accepts sanitized rich HTML. Supported content includes paragraphs, headings, strong/emphasis, lists, blockquotes, highlights, and safe HTTP/HTTPS links. Scripts, embedded objects, styles, and unsafe markup are removed.

```bash
curl --fail-with-body -sS \
  -X POST "$REZAN_API_BASE/api/posts.php" \
  -H "Authorization: Bearer $REZAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"A Practical Guide to Urban Gardening",
    "slug":"practical-guide-urban-gardening",
    "excerpt":"How small spaces can produce useful herbs and vegetables.",
    "content":"<p>Start with the light available to you.</p><h2>Choose suitable plants</h2><p>Herbs and leafy greens are forgiving choices.</p>",
    "author":"Maya Chen",
    "category":"Lifestyle"
  }'
```

Successful creation returns HTTP `201`:

```json
{
  "id": 123,
  "slug": "practical-guide-urban-gardening",
  "sitemap_updated": true,
  "deployment_queued": true
}
```

Publishing may regenerate the sitemap and invoke the configured deployment webhook. Do not retry a successful request merely because deployment remains queued. Slugs must be unique; a duplicate returns HTTP `409`.

#### Change post status

`PUT /api/posts.php` — owner or staff administrator

Allowed statuses: `draft`, `published`, and `archived`.

```bash
curl --fail-with-body -sS \
  -X PUT "$REZAN_API_BASE/api/posts.php" \
  -H "Authorization: Bearer $REZAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":123,"status":"archived"}'
```

#### Delete a post

`DELETE /api/posts.php?id=POST_ID` — owner or staff administrator

```bash
curl --fail-with-body -sS \
  -X DELETE "$REZAN_API_BASE/api/posts.php?id=123" \
  -H "Authorization: Bearer $REZAN_TOKEN"
```

Deletion is permanent and may trigger a sitemap rebuild and deployment.

### Bulk publishing with multiple categories and author names

There is no unsafe unauthenticated bulk endpoint. Bulk publishing is performed as a controlled sequence of authenticated category and post requests.

Recommended workflow:

1. Authenticate as the owner and store the bearer token securely.
2. Read `GET /api/categories.php`.
3. Create every missing category with `POST /api/categories.php`.
4. Validate that every planned post has a unique title or slug, non-empty excerpt and content, author name, and existing category.
5. Create posts one at a time with `POST /api/posts.php`.
6. Record the HTTP status, returned `id`, and returned `slug` for every request.
7. Stop or retry only failed items. Never resend successful items with the same slug.
8. Verify the result using the paginated administrative post list.

Example Bash workflow:

```bash
missing_categories=("Science" "Food" "Personal Growth")

# Populate this array only with names absent from GET /api/categories.php.
for category in "${missing_categories[@]}"; do
  curl --fail-with-body -sS \
    -X POST "$REZAN_API_BASE/api/categories.php" \
    -H "Authorization: Bearer $REZAN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$category\"}"
done

curl --fail-with-body -sS \
  -X POST "$REZAN_API_BASE/api/posts.php" \
  -H "Authorization: Bearer $REZAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"What Night Skies Teach Us","excerpt":"A field guide to observing the sky.","content":"<p>Begin with your eyes and a dark location.</p>","author":"Nadia Rahman","category":"Science"}'

curl --fail-with-body -sS \
  -X POST "$REZAN_API_BASE/api/posts.php" \
  -H "Authorization: Bearer $REZAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"The Foundations of a Useful Pantry","excerpt":"A flexible approach to everyday cooking.","content":"<p>Build around ingredients that combine well.</p>","author":"Jon Bell","category":"Food"}'
```

The `author` value controls the public byline and may differ between posts. Administrative post creation does not require a registered account matching that author name. If ownership by a real registered user is required, that user should publish through `/api/user-posts.php` using their own bearer token.

### Images

#### Upload an image

`POST /api/upload.php` — signed-in user, staff administrator, or owner

- Multipart field: `image`
- Supported formats: JPEG, PNG, and WebP
- Maximum size: 5 MB

```bash
curl --fail-with-body -sS \
  -X POST "$REZAN_API_BASE/api/upload.php" \
  -H "Authorization: Bearer $REZAN_TOKEN" \
  -F "image=@/absolute/path/cover.jpg"
```

Response:

```json
{"url":"https://api.example.com/uploads/generated-name.jpg"}
```

The administrative `POST /api/posts.php` endpoint currently creates text posts and does not accept `image_url`. User-owned posts can include the returned URL through `/api/user-posts.php`.

### Users and staff access

#### List users

`GET /api/admin-users.php?page=PAGE&limit=LIMIT&q=SEARCH` — owner only

`limit` is `5`–`100`, with a default of `20`. The response contains `data` and full pagination metadata.

#### Grant limited staff administrator access

`PUT /api/admin-users.php` — owner only

```bash
curl --fail-with-body -sS \
  -X PUT "$REZAN_API_BASE/api/admin-users.php" \
  -H "Authorization: Bearer $REZAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":42,"role":"editor"}'
```

#### Remove staff access

Use the same endpoint with `"role":"user"`. The configured owner account cannot be changed through this endpoint.

### User-owned posts

`POST /api/user-posts.php` — signed-in user

Required fields: `title`, `excerpt`, and `content`. Optional fields include `slug`, `category`, `image_url`, and `publish`.

- Without `publish`, the post is stored as a draft for editorial review.
- With `"publish": true`, the post is immediately published.
- The author and `user_id` come from the authenticated account and cannot be impersonated.
- A random suffix is added to the slug to avoid collisions.

```bash
curl --fail-with-body -sS \
  -X POST "$REZAN_API_BASE/api/user-posts.php" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Story","excerpt":"A short summary.","content":"<p>Story content.</p>","category":"Culture","publish":true}'
```

`PUT /api/user-posts.php` updates the authenticated user's post and requires `id`, `title`, `excerpt`, and `content`.

`DELETE /api/user-posts.php?id=POST_ID` permanently deletes only a post owned by the authenticated user.

### Comments

- `GET /api/comments.php?slug=POST_SLUG&page=1&limit=20` — public, paginated
- `POST /api/comments.php` — signed-in user; JSON body: `{"slug":"post-slug","body":"Comment text"}`
- `DELETE /api/comments.php?id=COMMENT_ID` — comment owner, staff administrator, or owner

Comment bodies must contain 2–2,000 characters. Pagination limits are `5`–`50` and include `page`, `limit`, `total`, `pages`, and `has_more`.

### Reactions, bookmarks, follows, and notifications

#### Like or dislike

- `GET /api/likes.php?slug=POST_SLUG` — public state; includes authenticated user's reaction when authorized
- `POST /api/likes.php` — signed-in user; JSON body: `{"slug":"post-slug","reaction":"like"}` or `"dislike"`

Posting the same reaction again toggles it off.

#### Follow or unfollow a writer

- `GET /api/follows.php` — signed-in user
- `POST /api/follows.php` — signed-in user; JSON body: `{"author":"Writer Name"}`

The POST operation toggles the follow state.

#### Saved posts and notifications

- `GET /api/library.php` — signed-in user; returns `saved` posts and up to 50 notifications
- `PUT /api/library.php` — signed-in user

Mark one notification read:

```json
{"id":55,"read":true}
```

Mark one notification unread:

```json
{"id":55,"read":false}
```

An empty PUT body marks all notifications as read for backward compatibility.

### Subscribers

- `POST /api/subscribers.php` — public; JSON body: `{"email":"reader@example.com"}`
- `GET /api/admin-subscribers.php?page=1&limit=20&q=SEARCH` — owner only, paginated
- `DELETE /api/admin-subscribers.php?id=SUBSCRIBER_ID` — owner only

### Writers and profiles

- `GET /api/people.php?name=WRITER_NAME` — public writer profile and published stories
- `GET /api/people.php?q=SEARCH&limit=25` — public writer search
- `GET /api/people.php?limit=5` — public writer suggestions
- `GET /api/profile.php` — signed-in user's profile and posts
- `PUT /api/profile.php` — update signed-in user's public profile
- `POST /api/profile.php` — update or remove the signed-in user's avatar URL

### Dashboard

`GET /api/dashboard.php` — owner or staff administrator

Returns the signed-in administrator identity, explicit permissions, publication statistics, recent posts, and category totals. Owner-only statistics are excluded for staff administrators.

### HTTP status codes and error handling

| Status | Meaning |
| --- | --- |
| `200` | Request succeeded |
| `201` | Resource created |
| `204` | CORS preflight succeeded |
| `401` | Missing or invalid signed-in session |
| `403` | Authenticated account lacks the required permission |
| `404` | Resource was not found |
| `405` | HTTP method is not supported by the endpoint |
| `409` | Unique value already exists, such as an email, category, or slug |
| `422` | Request data is missing or invalid |
| `500` | Backend configuration is missing |
| `503` | Database is unavailable |

Errors use this shape:

```json
{"error":"Human-readable explanation."}
```

Automation clients should use `--fail-with-body`, inspect the HTTP status, parse the JSON response, and log per-item results. Never assume a failed request created a resource, and never retry a successful non-idempotent POST without checking whether its slug or category already exists.

### Minimum handoff information for future API automation

When asking an API client or agent to manage a deployed REZAN site, provide:

1. This README or its API reference section.
2. The deployed `REZAN_API_BASE` URL.
3. A bearer token supplied through a secure secret channel, or authorization to log in using securely supplied credentials.
4. The requested categories and whether missing categories should be created.
5. For every post: title, excerpt, content, author name, category, optional slug, and any cover image.
6. Whether posts should be immediately published or prepared through user-owned draft workflows.
7. Whether deployment/webhook side effects are expected after publishing.

With those details, the API supports creating multiple categories, publishing multiple posts across different categories and author bylines, managing post status, moderating comments, managing limited staff access, and performing the remaining administrative workflows documented above.
