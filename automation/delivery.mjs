import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const stage=process.argv[2];
const work=resolve(process.env.BLOG_WORK_DIR||'work/blog');
const site=new URL(process.env.REZAN_SITE_URL||'https://rezan.space');
if(site.protocol!=='https:'||site.username||site.password||site.pathname!=='/')throw new Error('A valid HTTPS site origin is required');
const key=process.env.REZAN_AUTOMATION_KEY;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext(); // TLS certificate verification stays enabled.
const page=await context.newPage();
async function jsonRequest(path,options={}){
 const target=new URL(path,site);
 if(target.origin!==site.origin)throw new Error('Cross-origin publishing is forbidden');
 for(let attempt=0;attempt<3;attempt++){
  const response=await context.request.fetch(target.href,{...options,maxRedirects:0,timeout:90000,headers:{Accept:'application/json',...(options.headers||{})}});
  if(response.status()>=500&&attempt<2){await new Promise(r=>setTimeout(r,2000*(attempt+1)));continue;}
  if(!response.ok()||!(response.headers()['content-type']||'').includes('application/json'))throw new Error(`Publishing API failed (${response.status()}); verify HTTPS, host browser challenge and backend setup`);
  const result=await response.json();if(result.error)throw new Error('Publishing API rejected the request');return result;
 }
}
async function deployedSitemap(){
 const response=await context.request.get(new URL('/sitemap.xml',site).href,{maxRedirects:0});
 let xml=await response.text();if(!response.ok())throw new Error('Live sitemap is unavailable');
 if(xml.includes('<sitemapindex')){
  const children=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1].replaceAll('&amp;','&')));
  if(!children.length||children.some(url=>url.origin!==site.origin||!url.pathname.startsWith('/sitemap-pages/')))throw new Error('Invalid sitemap index');
  xml='';for(const url of children){const child=await context.request.get(url.href,{maxRedirects:0});const content=await child.text();if(!child.ok()||!content.includes('<urlset'))throw new Error('A sitemap shard is unavailable');xml+=content;}
 }
 if(!xml.includes('<urlset'))throw new Error('Live sitemap has no URL entries');return xml;
}
async function snapshot(){
 const first=await jsonRequest('/api/posts.php?page=1&limit=25');
 if(!Array.isArray(first.data))throw new Error('Public post export is invalid');
 const rows=[...first.data];const total=Number(first.pagination?.total);
 if(!Number.isSafeInteger(total)||total<0||total>100000)throw new Error('Invalid post count');
 for(let number=2;number<=Math.ceil(total/25);number++){const next=await jsonRequest(`/api/posts.php?page=${number}&limit=25`);if(!Array.isArray(next.data))throw new Error('Incomplete public post export');rows.push(...next.data);}
 if(rows.length!==total||new Set(rows.map(post=>post.slug)).size!==total)throw new Error('Post export changed during pagination; retry before building');
 await writeFile(`${work}/snapshot.json`,JSON.stringify(rows));return rows;
}
try{
 await mkdir(work,{recursive:true});
 // Execute the hosting provider's normal browser challenge; do not disable TLS checks or use stealth bypasses.
 await page.goto(site.href,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForLoadState('networkidle',{timeout:20000}).catch(()=>{});
 if(new URL(page.url()).origin!==site.origin)throw new Error('Hosting redirected to a different origin');
 if(stage==='snapshot'){await snapshot();}
 else if(stage==='preflight'){
  if(!key)throw new Error('REZAN_AUTOMATION_KEY is missing');
  const health=await jsonRequest('/api/automation-health.php',{headers:{'X-Rezan-Automation-Key':key}});
  if(!health.ok||!health.multilingual||!health.media_upload||health.languages?.length!==15)throw new Error('Live backend is not ready for multilingual automation');
  await snapshot();
 } else if(stage==='publish'||stage==='publish-batch'){
  if(!key)throw new Error('REZAN_AUTOMATION_KEY is missing');
  const expected=['en','es','pt-BR','hi','id','ar','fr','de','ja','bn','vi','tr','ko','it','pl'];
  let topics=[{slug:'',name:null}];
  if(stage==='publish-batch'){
   topics=JSON.parse(await readFile(`${work}/batch.json`,'utf8'));
   const canonical=JSON.parse(await readFile(new URL('./topics.json',import.meta.url),'utf8'));
   if(JSON.stringify(topics)!==JSON.stringify(canonical))throw new Error('Every configured category is required before publishing');
  }
  const batches=[];const all=[];const seen=new Set();
  // Validate the whole batch before sending any category to the publishing API.
  for(const topic of topics){
   const folder=topic.slug?`${work}/topics/${topic.slug}`:work;
   const body=JSON.parse(await readFile(`${folder}/payload.json`,'utf8'));
   if(body.posts?.length!==15||new Set(body.posts.map(p=>p.language)).size!==15||body.posts.some(p=>!expected.includes(p.language)))throw new Error('All 15 validated translations are required for every category');
   if(topic.name&&body.posts.some(p=>p.category!==topic.name))throw new Error('Article category does not match the batch plan');
   const group=body.posts[0].translation_key;
   for(const post of body.posts){
    if(!post.slug||!group||post.translation_key!==group||seen.has(post.slug))throw new Error('Invalid or duplicate publishing identity');
    seen.add(post.slug);
   }
   batches.push({body,image:await readFile(`${folder}/cover.webp`)});all.push(...body.posts);
  }
  for(const {body,image} of batches){
   const uploaded=await jsonRequest('/api/automation-media.php',{method:'POST',headers:{'X-Rezan-Automation-Key':key},multipart:{image:{name:'cover.webp',mimeType:'image/webp',buffer:image}}});
   if(new URL(uploaded.url).origin!==site.origin)throw new Error('Image URL is outside the site');
   for(const post of body.posts)post.image_url=uploaded.url;
   // One 15-language category per transaction stays below the API's 100-post limit.
   const result=await jsonRequest('/api/automation-publish.php',{method:'POST',headers:{'X-Rezan-Automation-Key':key},data:body});
   const accepted=[...(result.posts?.created||[]),...(result.posts?.skipped||[]),...(result.posts?.updated||[])];
   if(accepted.length!==15||body.posts.some(post=>!accepted.some(saved=>saved.slug===post.slug)))throw new Error('Publishing did not acknowledge all translations');
  }
  const rows=await snapshot();
  for(const post of all)if(!rows.some(saved=>saved.slug===post.slug&&saved.language===post.language&&saved.translation_key===post.translation_key))throw new Error('Published translation could not be verified');
  await writeFile(`${work}/published.json`,JSON.stringify({slugs:all.map(post=>post.slug),categories:topics.map(topic=>topic.name)}));
  console.log(`Verified ${all.length} published translations. Article pages and sitemap deployment are still required.`);
 } else if(stage==='verify'){
  const published=JSON.parse(await readFile(`${work}/published.json`,'utf8'));
  const rows=JSON.parse(await readFile(`${work}/snapshot.json`,'utf8'));
  const xml=await deployedSitemap();
  for(const slug of published.slugs){
   const post=rows.find(item=>item.slug===slug);const target=new URL(`/${post.language}/post/${encodeURIComponent(slug)}/`,site);
   if(!xml.includes(target.href))throw new Error('A newly published article is missing from the deployed sitemap');
   const response=await context.request.get(target.href,{maxRedirects:0});
   const markup=await response.text();
   if(!response.ok()||!markup.includes(`lang="${post.language}"`)||!markup.includes(target.href)||!markup.includes('rel="canonical"'))throw new Error('A deployed language page is missing or stale');
  }
  console.log(`Verified ${published.slugs.length} live article pages and their sitemap entries.`);
 } else if(stage==='verify-site'){
  const languages=['en','es','pt-BR','hi','id','ar','fr','de','ja','bn','vi','tr','ko','it','pl'];
  for(const language of languages){
   const url=new URL(`/${language}/`,site);const response=await context.request.get(url.href,{maxRedirects:0});const markup=await response.text();
   if(!response.ok()||!markup.includes(`lang="${language}"`)||!markup.includes(url.href)||!markup.includes('rel="canonical"'))throw new Error('A live language home is missing or stale');
  }
  const rows=JSON.parse(await readFile(`${work}/snapshot.json`,'utf8'));
  const xml=await deployedSitemap();
  for(const post of rows){const url=new URL(`/${post.language}/post/${encodeURIComponent(post.slug)}/`,site);if(!xml.includes(url.href))throw new Error('A published article is missing from the live sitemap');}
  const samples=[rows[0],rows.at(-1)].filter(Boolean);
  for(const post of samples){const url=new URL(`/${post.language}/post/${encodeURIComponent(post.slug)}/`,site);const response=await context.request.get(url.href,{maxRedirects:0});const markup=await response.text();if(!response.ok()||!markup.includes(url.href)||!markup.includes(`lang="${post.language}"`))throw new Error('A published article page failed live verification');}
  console.log(`Verified 15 live language homes, ${rows.length} article sitemap entries and representative article HTML.`);
 } else throw new Error('Unknown delivery stage');
} finally{await browser.close();}
