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

Originals, illustrations and translations run in separate phases, each with
`max-parallel: 20`. The translation matrix contains 16 × 15 = 240 jobs. Separating
phases keeps this workflow at no more than 20 simultaneous generation jobs and
keeps large text/image models on different runners. GitHub account capacity and
other workflows can reduce available slots. Hourly scheduling is not a promise
that 240 CPU-generated articles finish within an hour. Whole batches use a FIFO
concurrency queue (`queue: max`, maximum 100 pending runs); new work does not
cancel an active batch. Runs beyond GitHub's queue limits can be rejected.

Every original and translation must pass schema, language and evidence review.
Sources are treated as evidence rather than instructions, generated markup is
escaped, and AI authorship/illustrations are disclosed. This model consistency
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
article and its sitemap entry**. Sitemap documents split before 45,000 URLs or
40 MB, with a root index at `/sitemap.xml` when required. Both PHP's immediate
refresh and the static export support sitemap shards. Sitemap inclusion does not
guarantee Google indexing or ranking.

Deployments share a lock with manual deploy/recovery workflows. A remote SHA-256
manifest skips identical managed files on later uploads; hashed assets arrive
before HTML and the root sitemap arrives last. The manifest is committed only
after uploads succeed. Existing host configuration and user uploads are preserved;
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

To accelerate or recover a run, supply its ID as `resume_run_id`. The workflow verifies that it is this repository’s main-branch AI workflow, restores its English/source checkpoint, illustration and completed languages, and generates only missing outputs with a 15-worker matrix. An already-running workflow retains its original concurrency setting; start a checkpoint recovery run to apply the new limit.

### Hosting certificate chain

InfinityFree serves the Google Trust WR1 leaf without its intermediate. `automation/certs/google-wr1.pem` is the public intermediate from `https://i.pki.goog/wr1.crt`. Actions supply it as a chain-building certificate alongside the default trusted roots; hostname, expiry, signatures and root trust remain verified. This does not fix the provider’s missing chain for other non-browser clients.
