import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import test from 'node:test';
const locales=['en','es','pt-BR','hi','id','ar','fr','de','ja','bn','vi','tr','ko','it','pl'];
const html=path=>readFile(new URL(`../out/${path}/index.html`,import.meta.url),'utf8');
// Run against a build using tests/fixtures/multilingual-posts.json and NEXT_PUBLIC_SITE_URL=https://example.com.
for(const locale of locales)test(`${locale}: static language, direction, canonical and reciprocal home alternates`,async()=>{const page=await html(locale);assert.match(page,new RegExp(`<html[^>]*lang="${locale}"`));assert.match(page,new RegExp(`dir="${locale==='ar'?'rtl':'ltr'}"`));assert.ok(page.includes(`rel="canonical" href="https://example.com/${locale}/"`));for(const alternate of locales)assert.ok(page.includes(`hrefLang="${alternate}" href="https://example.com/${alternate}/"`));});
test('translated article HTML contains authored text and only real alternate articles',async()=>{const page=await html('bn/post/solar-energy-bn');assert.ok(page.includes('সৌর প্যানেল সূর্যের আলোকে বিদ্যুতে রূপান্তর করে।'));for(const locale of ['en','bn','ar'])assert.ok(page.includes(`hrefLang="${locale}" href="https://example.com/${locale}/post/solar-energy-${locale}/"`));assert.ok(!page.includes('hrefLang="fr" href="https://example.com/fr/post/'));assert.match(page,/"inLanguage":"bn"/);assert.ok(page.includes('BreadcrumbList'));assert.ok(!page.includes('Solar panels convert sunlight'));});
test('unrelated story does not pretend to be a translation',async()=>{const page=await html('es/post/independent-story');assert.ok(page.includes('hrefLang="es" href="https://example.com/es/post/independent-story/"'));assert.ok(!page.includes('hrefLang="en" href="https://example.com/en/post/'));await assert.rejects(access(new URL('../out/fr/post/independent-story/index.html',import.meta.url)));});
test('sitemap and robots use the same public origin and no fabricated articles',async()=>{const xml=await readFile(new URL('../out/sitemap.xml',import.meta.url),'utf8');assert.equal((xml.match(/<url>/g)||[]).length,32);assert.ok(xml.includes('https://example.com/bn/post/solar-energy-bn/'));assert.ok(!xml.includes('/fr/post/'));assert.ok(!xml.includes('localhost'));const robots=await readFile(new URL('../out/robots.txt',import.meta.url),'utf8');assert.ok(robots.includes('Sitemap: https://example.com/sitemap.xml'));});

test("legacy same-site cover URLs upgrade to HTTPS and retain descriptive alt text",async()=>{const page=await html("en/post/solar-energy-en");assert.ok(page.includes('src="https://example.com/uploads/solar-cover.webp"'));assert.ok(page.includes('alt="An illustrative solar panel"'));assert.ok(!page.includes('src="http://example.com/uploads/solar-cover.webp"'));});

test('every language reuses the social app shell and renders only its authored stories',async()=>{
 for(const locale of locales){const page=await html(locale);for(const marker of ['user-appbar','social-layout','social-left','social-center','social-right','composer','feed-tabs'])assert.ok(page.includes(marker),`${locale}: missing shared ${marker}`);assert.ok(!page.includes('class="language-header"'));}
 const bn=await html('bn');assert.ok(bn.includes('প্রচ্ছদ'));assert.ok(bn.includes('সৌর'));assert.ok(!bn.includes('Solar panels convert sunlight'));
});

test('category pages have real articles, matching canonical links and crawlable navigation',async()=>{
 const page=await html('en/category/science');
 assert.ok(page.includes('href="https://example.com/en/category/science/"'));
 assert.ok(page.includes('Solar energy explained'));
 assert.ok(page.includes('/en/post/solar-energy-en/'));
 assert.ok(page.includes('CollectionPage'));
 const article=await html('en/post/solar-energy-en');
 assert.ok(article.includes('/en/category/science/'));
 const home=await html('en');assert.equal((home.match(/<h1(?:\s|>)/g)||[]).length,1);
});
test('empty category archives are noindex and excluded from sitemap',async()=>{
 const empty=await html('bn/category/finance');assert.ok(empty.includes('noindex'));
 const xml=await readFile(new URL('../out/sitemap.xml',import.meta.url),'utf8');
 assert.ok(xml.includes('/en/category/science/'));
 assert.ok(!xml.includes('/bn/category/finance/'));
});
test('account and administrative pages do not advertise themselves for indexing',async()=>{
 for(const route of ['account','profile','library','create','admin','search'])assert.ok((await html(route)).includes('noindex'),route);
});


test('article landing pages render one headline, anchored sections and matching rich metadata',async()=>{
 const page=await html('en/post/solar-energy-en');
 assert.equal((page.match(/<h1(?:\s|>)/g)||[]).length,1);
 assert.ok(page.includes('class="reader-page"'));assert.ok(page.includes('class="reader-toc"'));
 assert.ok(page.includes('id="reader-section-1"'));assert.ok(page.includes('href="#reader-section-1"'));
 assert.ok(page.includes('dateTime="2026-10-02T00:00:00Z"'));
 const schemas=[...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));
 const graph=schemas.find(value=>value['@graph'])['@graph'];
 const article=graph.find(value=>value['@type']==='BlogPosting');
 assert.equal(article.headline,'Solar energy explained');assert.ok(article.wordCount>0);
 assert.equal(article.mainEntityOfPage['@id'],'https://example.com/en/post/solar-energy-en/');
 assert.equal(article.dateModified,'2026-10-02T00:00:00Z');
 assert.equal(article.author.url,'https://example.com/author/?name=Test%20Writer');
 assert.ok(page.includes('hrefLang="x-default" href="https://example.com/en/post/solar-energy-en/"'));
});
test('related cards use crawlable localized URLs and never cross article languages',async()=>{
 for(const lang of ['en','bn','ar']){
  const page=await html(`${lang}/post/solar-energy-${lang}`);
  const related=page.match(/<section class="reader-related"[\s\S]*?<\/section>/)?.[0];
  assert.ok(related,lang);assert.ok(related.includes('class="reader-card"'));
  assert.ok(related.includes(`href="/${lang}/post/solar-storage-${lang}/"`));
  assert.ok(!related.includes('solar-energy-'+lang));
  for(const other of ['en','bn','ar'].filter(value=>value!==lang))assert.ok(!related.includes(`/${other}/post/`));
 }
});
test('legacy published URLs reuse the landing page and canonicalize to the localized URL',async()=>{
 const page=await html('post/solar-energy-en');
 assert.ok(page.includes('class="reader-page"'));
 assert.ok(page.includes('rel="canonical" href="https://example.com/en/post/solar-energy-en/"'));
});
test('editorial sample links and canonical URLs point to existing exported routes',async()=>{
 const fs=await import('node:fs/promises');
 const names=await fs.readdir(new URL('../out/article/',import.meta.url));
 for(const slug of names.filter(name=>!name.endsWith('.txt'))){
  if(!(await fs.stat(new URL(`../out/article/${slug}`,import.meta.url))).isDirectory())continue;
  const page=await html(`article/${slug}`);
  assert.ok(page.includes(`rel="canonical" href="https://example.com/article/${slug}/"`));
  assert.ok(!page.includes('/en/article/'));
 }
});
