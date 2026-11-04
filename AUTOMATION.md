# AI blog publishing

Workflow: `.github/workflows/ai-blog.yml`.

The user's Somoy-Jatri reference is reused only for its CPU model adapters:
Qwen/Qwen3-4B-Instruct-2507 (pinned, checksum-verified GGUF) writes the original
article and all translations; segmind/SSD-1B creates a 1024×576 illustration.
There are no paid inference API calls, video generation or YouTube/Drive tokens.
GitHub runner minutes, downloads, caches, artifacts and host quotas still apply.

## What runs

Every six hours, at approximately **00:17, 06:17, 12:17 and 18:17 Asia/Dhaka**,
select one unpublished source from the configured primary publishers. Initially
these cover science and technology: NASA, Mozilla, web.dev, Python and Rust.
The generated explanation links its sources, uses transparent AI authorship,
checks its language and structure, and passes a second Qwen evidence review.
This is a model consistency check, not independent human fact-checking.

Text and image models run in separate jobs so their large weight files do not compete for runner disk space. Image generation and translations run concurrently after the English original is validated.

One English original and fourteen faithful localized translations share a
translation key and illustration. Localized image alt text is stored per post.
The pipeline publishes only when all fifteen texts pass validation; no missing
translation is silently substituted with English. Generated images retain the
reference's safety checker. Source HTML is treated as evidence rather than
instructions; generated markup is escaped and assembled from structured JSON.

Source URLs determine stable slugs and translation keys. Retries use
`on_conflict: skip`; image filenames use a content hash. A source already
published is skipped on a later fresh run. Generation checkpoints/artifacts
last seven days, so rerun failed jobs within that period. One workflow may run
at a time; all fifteen translation workers may run together, subject to GitHub account capacity.

Publishing sends all 15 posts in the existing database transaction. It then
exports the entire public blog, builds real static HTML, deploys it over verified
FTPS, and verifies the fifteen live URLs. Publishing to the database alone is
not called a successful deployment. If deployment fails, rerun the failed job;
previous slugs are not duplicated. Existing host config and uploaded user media
are never included in the managed upload or deleted. Stale old files are retained
by design; remove archived pages through an explicit site maintenance task.

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
5. Run **Multilingual AI blog publishing** manually with `dry_run: true`. Inspect
   the generated articles/image in the seven-day `blog-generation-preview`
   artifact. This performs real inference without publishing.
6. Run manually with `dry_run: false` once and verify that it reaches live-page
   verification. This publishes one complete 15-language batch.
7. Set repository variable `AUTO_PUBLISH_ENABLED` to `true` to enable scheduled
   publishing. Set it to `false` to stop new scheduled runs. A manual preview
   remains available while scheduling is off.

Schedules run from the default branch. GitHub may delay scheduled jobs and can
suspend inactive public-repository schedules after 60 days; monitor the Actions
page and re-enable when needed. This is scheduled automation, not a guaranteed
24/7 service. Each successful batch adds up to 15 public posts; at four batches
per day that is up to 60 posts per day. Keep the source catalog and editorial
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

To accelerate or recover a run, supply its ID as `resume_run_id`. The workflow verifies that it is this repository’s main-branch AI workflow, restores its English/source checkpoint, illustration and completed languages, and generates only missing outputs with a 15-worker matrix. An already-running workflow retains its original concurrency setting; start a checkpoint recovery run to apply the new limit.
