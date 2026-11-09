# AI blog publishing

Workflow: `.github/workflows/hourly-blog.yml`.

The user's Somoy-Jatri reference is reused only for its CPU model adapters:
Qwen/Qwen3-4B-Instruct-2507 (pinned, checksum-verified GGUF) writes the original
article and all translations; segmind/SSD-1B creates a 1024×576 illustration.
There are no paid inference API calls, video generation or YouTube/Drive tokens.
GitHub runner minutes, downloads, caches, artifacts and host quotas still apply.

## What runs

`.github/workflows/hourly-blog.yml` schedules a batch **every hour at minute 17**.
Each batch requires one distinct, unpublished source packet for **all 16 configured
categories**, then creates an English original, an SSD-1B illustration and all
15 language versions for each category: **240 articles per complete batch**.
`automation/topics.json` is the canonical batch inventory and matches the frontend
category names. `automation/sources.json` explicitly associates approved publishers
with each category; it is no longer limited to science and technology.

Up to 16 English originals run concurrently. After originals finish, illustrations
and non-English translations share a single `max-parallel: 20` matrix. Each
category has 15 tasks: one cover plus 14 translations, giving 240 tasks total.
Translations can start while images are still rendering. English is reused from
its original artifact, eliminating 16 redundant copy jobs. Text/image models
stay on separate runners; their combined generation concurrency never exceeds 20.
GitHub account capacity and other workflows can reduce available slots. Hourly
scheduling is not a promise that a complete CPU-generated batch finishes within
an hour. Whole batches use a FIFO
concurrency queue (`queue: max`, maximum 100 pending runs); new work does not
cancel an active batch. Runs beyond GitHub's queue limits can be rejected.

Every original and translation must pass schema, language and evidence review.
Sources are treated as evidence rather than instructions, generated markup is
escaped, and AI assistance/illustrations are disclosed. Each source topic receives a stable
generated pen name shared by its translations; it is not a newly created user
account or a claim about a real person’s credentials. This model consistency
review is not independent human fact-checking. No unsupported article is invented
to meet a quota. If any category has no eligible source, or any translation/image
fails, the batch fails visibly before publication. Publisher availability and the
supply of genuinely new source material limit what can be published each hour.

All 240 articles are validated before any API publication. The delivery client
sends **16 separate 15-language transactions**, staying below the API's 100-post
request limit. Stable source-derived slugs and `on_conflict: skip` make retries
idempotent. A publishing/network failure after an earlier category committed can
leave a partial database batch; retry the failed job to complete it. It is not
reported as a successfully deployed batch until every category is verified.

The backend refreshes the sitemap after changed posts. After the complete batch,
the workflow exports the entire public database, builds article/category pages
and the complete sitemap, deploys over verified FTPS, and checks **every new live
article and its sitemap entry**. Sitemap documents split before 10,000 URLs or
8 MB (below InfinityFree’s per-file limit), with a root index at `/sitemap.xml` when required. Both PHP's immediate
refresh and the static export support sitemap shards. Sitemap inclusion does not
guarantee Google indexing or ranking.

Deployments share a lock with manual deploy/recovery workflows. A remote SHA-256
manifest skips identical managed files on later uploads; hashed assets arrive
before HTML and the root sitemap arrives last. The manifest is committed only
after uploads succeed. Transfers use at most two FTP sessions; no coordinator
connection remains idle during upload. Existing host configuration and user uploads are preserved;
old static files are retained rather than deleted. Rerun failed jobs within the
seven-day artifact retention period to reuse successful phase artifacts.

The former `.github/workflows/ai-blog.yml` remains a **manual-only single-topic
recovery workflow**. It can reuse its earlier checkpoints via `resume_run_id`.
It no longer owns a schedule, avoiding duplicate scheduled pipelines.

## One-time activation

1. Finish the pending Google Trust SSL request in InfinityFree. DNS currently
   belongs to Namecheap; its required `_acme-challenge` CNAME must be installed
   there before requesting/installing the certificate. Valid HTTPS must work
   without bypassing a certificate warning. Set PHP `site_url`, `api_url` and
   frontend origins to `https://rezan.space` afterwards.
2. Back up the database and apply `backend/languages-migration.sql` once. If an
   earlier version was already applied, add only its new `image_alt VARCHAR(180)
   NOT NULL DEFAULT ''` column. Upload the new PHP backend and libraries before
   the first live run; `/api/automation-health.php` checks migration readiness.
3. Set a fresh, long random `automation_api_key` in the live `config.php`. The
   previously committed README key should not be reused for unattended publishing.
4. In **MRezan/RezanSpace → Settings → Secrets and variables → Actions**, save
   these repository secrets (never commit their values):
   - `REZAN_AUTOMATION_KEY`: match the live PHP key.
   - `REZAN_FTP_HOST`: the hostname shown in the InfinityFree FTP settings.
   - `REZAN_FTP_USER`: the hosting FTP username.
   - `REZAN_FTP_PASSWORD`: the hosting FTP password.
   The destination is fixed to `rezan.space/htdocs`; connections use explicit
   FTPS with a verified certificate, including the data channel.
5. Run **Hourly all-category publishing** manually with `dry_run: true`. Inspect
   the generated articles/image in the seven-day `blog-generation-preview`
   artifact. This performs real inference without publishing.
6. Run manually with `dry_run: false` once and verify that it reaches live-page
   verification. This publishes one complete 16-category, 15-language batch.
7. Set repository variable `AUTO_PUBLISH_ENABLED` to `true` to enable scheduled
   publishing. Set it to `false` to stop new scheduled runs. A manual preview
   remains available while scheduling is off.

Schedules run from the default branch. GitHub may delay scheduled jobs and can
suspend inactive public-repository schedules after 60 days; monitor the Actions
page and re-enable when needed. This is scheduled automation, not a guaranteed
24/7 service. Each successful complete batch adds 240 public posts; at most hourly, subject to generation throughput and source availability. Keep the source catalog and editorial
quality under review rather than increasing cadence to chase rankings.

## Checks

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r automation/requirements.txt
.venv/bin/python -m unittest discover -s automation/tests -v
node --check automation/delivery.mjs
npm run test:i18n
```

The CI checks do not download model weights or publish. Real model generation
and language/evidence review are exercised by a manual preview. Full AI output
quality cannot be established by unit tests alone.

## Rebuild and deploy without generating new AI content

Run **Deploy live multilingual site** manually to verify HTTPS, export the migrated live API, rebuild all language pages from real published posts, upload over FTPS and check the live sitemap and pages. It shares a deployment lock with AI publishing and preserves the host configuration and user-uploaded media.

To accelerate or recover a run, supply its ID as `resume_run_id`. The workflow verifies that it is this repository’s main-branch AI workflow, restores its English/source checkpoint, illustration and completed languages, and generates only missing outputs in the shared 20-slot image/translation matrix. An already-running workflow retains its original concurrency setting; start a checkpoint recovery run to apply the new limit.

### Hosting certificate chain

InfinityFree serves the Google Trust WR1 leaf without its intermediate. `automation/certs/google-wr1.pem` is the public intermediate from `https://i.pki.goog/wr1.crt`. Actions supply it as a chain-building certificate alongside the default trusted roots; hostname, expiry, signatures and root trust remain verified. This does not fix the provider’s missing chain for other non-browser clients.


### Recover a failed category batch

Supply the earlier hourly run ID in `resume_run_id`. Recovery verifies repository,
main branch, workflow identity and artifact expiry, then restores its source plan,
validated English originals, completed images and language outputs. Missing or
failed outputs alone are generated. Successful originals skip the model download.
Use this for run `42015683456`, whose Tech Guides draft tripped the old prose/code
validator. Literal tutorial code remains escaped and is now accepted; invalid
prose formatting/links are repaired at the section level before completing a draft.

Long generation runs build the **latest main-branch website** at the deployment
stage (`clean: false` preserves the generated batch). This prevents an earlier
content run from restoring an obsolete UI after a newer UI fix was deployed.


### Translation language checks (2026-11-08)

The recovery run completed all 16 originals and covers, then exposed a separate
failure: some translations copied English despite requesting another language.
The generator now repeats the target language in the final outline/section
instruction, detects the outline and each section before checkpointing, and gives
retries the detected/expected language codes. Wrong-language sections are repaired
locally instead of generating an entire article before noticing the problem.
Final article language and evidence checks still apply. Progress policy version 3
invalidates older partial drafts; completed validated originals, covers and
translations remain reusable. Tests cover early rejection and language repair.


### Resume interrupted hosting uploads

The earlier live deployment exceeded its 65-minute job limit. Deployment now
allows 180 minutes for a first full static export, while retaining the hosting-safe
two-session transfer limit. Every 25 successfully renamed files are recorded in a
separate progress journal. A retry reuses only matching file hashes tied to the
same completed deployment manifest; a stale journal cannot override a later
successful deployment. Assets still finish before HTML, and the root sitemap and
completed deployment manifest still commit last. Host configuration and uploaded
user media remain excluded. Tests simulate an interrupted 60-file transfer and
verify that cached transfers resume without committing an incomplete deployment.

### Deployment speed (2026-11-08)

The live deployment timing showed the production build finishing in 81 seconds; FTPS transfer was the long-running step. Deployment keeps two transfer sessions, skips matching content hashes, and resumes confirmed uploads after interruption. Existing manifest paths now seed the directory cache, avoiding repeated MKD/PWD/CWD requests for folders already deployed. New folders are still created normally, assets precede HTML, and the sitemap and completed manifest remain last. The manual deployment workflow also caches npm downloads. Transfer progress includes elapsed seconds; actual speed gains depend on the changed file count and hosting latency.


### 2026-11-09 — review and multilingual recovery

Run `42520619650` generated all 16 English originals and illustrations, but 28
translations failed and the full-coverage gate correctly skipped publishing.
Most failures were caused by an 800-character cap on the reviewer's diagnostic
notes, which discarded an otherwise validated draft and regenerated it.
Review notes now retain the explicit approval/rejection decision without a
metadata length cap. Malformed review responses retry only review and preserve
the validated draft if exhausted. Genuine rejections still block publication;
their findings now guide the next draft and survive checkpoint recovery.

Paragraph repair recognizes Bengali/Hindi danda and Arabic question marks and
protects inline code while splitting surrounding sentences. It preserves every
word; impossible partitions still require model correction.

For an explicit live recovery using existing Git SSH access, write the numeric
source hourly run ID to `.github/blog-recovery-trigger` and push that file to
`main`. An explicit recovery supersedes the older in-progress hourly batch;
scheduled ticks wait without cancelling recovery. This starts the same
full-coverage workflow and reuses validated originals,
images, translations and section checkpoints from that run. Ordinary code pushes
do not publish. Manual `workflow_dispatch` with `resume_run_id` still supports
preview and live modes. Recovery never bypasses source-run trust checks, language
validation, evidence review, the 240-article gate, or deployed URL verification.
