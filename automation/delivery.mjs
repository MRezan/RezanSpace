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
 } else if(stage==='publish'){
  if(!key)throw new Error('REZAN_AUTOMATION_KEY is missing');
  const body=JSON.parse(await readFile(`${work}/payload.json`,'utf8'));
  const expected=['en','es','pt-BR','hi','id','ar','fr','de','ja','bn','vi','tr','ko','it','pl'];
  if(body.posts?.length!==15||new Set(body.posts.map(p=>p.language)).size!==15||body.posts.some(p=>!expected.includes(p.language)))throw new Error('All 15 validated translations are required before publishing');
  const image=await readFile(`${work}/cover.webp`);
  const uploaded=await jsonRequest('/api/automation-media.php',{method:'POST',headers:{'X-Rezan-Automation-Key':key},multipart:{image:{name:'cover.webp',mimeType:'image/webp',buffer:image}}});
  if(new URL(uploaded.url).origin!==site.origin)throw new Error('Image URL is outside the site');
  for(const post of body.posts)post.image_url=uploaded.url;
  const result=await jsonRequest('/api/automation-publish.php',{method:'POST',headers:{'X-Rezan-Automation-Key':key},data:body});
  const accepted=[...(result.posts?.created||[]),...(result.posts?.skipped||[]),...(result.posts?.updated||[])];
  if(accepted.length!==15||body.posts.some(post=>!accepted.some(saved=>saved.slug===post.slug)))throw new Error('Publishing did not acknowledge all translations');
  const rows=await snapshot();
  for(const post of body.posts)if(!rows.some(saved=>saved.slug===post.slug&&saved.language===post.language&&saved.translation_key===post.translation_key))throw new Error('Published translation could not be verified');
  await writeFile(`${work}/published.json`,JSON.stringify({slugs:body.posts.map(post=>post.slug),key:body.posts[0].translation_key}));
  console.log('Verified all 15 published translations. Static HTML deployment is still required.');
 } else if(stage==='verify'){
  const published=JSON.parse(await readFile(`${work}/published.json`,'utf8'));
  const rows=JSON.parse(await readFile(`${work}/snapshot.json`,'utf8'));
  for(const slug of published.slugs){
   const post=rows.find(item=>item.slug===slug);const target=new URL(`/${post.language}/post/${encodeURIComponent(slug)}/`,site);
   const response=await context.request.get(target.href,{maxRedirects:0});
   const markup=await response.text();
   if(!response.ok()||!markup.includes(`lang="${post.language}"`)||!markup.includes(target.href)||!markup.includes('rel="canonical"'))throw new Error('A deployed language page is missing or stale');
  }
  console.log('Verified live static pages for all 15 languages.');
 } else throw new Error('Unknown delivery stage');
} finally{await browser.close();}
