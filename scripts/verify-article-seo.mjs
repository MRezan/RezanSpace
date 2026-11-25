import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {articleSeoFailure,metadataFailure} from '../automation/live-verification.mjs';

const posts=JSON.parse(await readFile(process.env.REZAN_POSTS_FILE||'work/blog/snapshot.json','utf8'));
const site=new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://rezan.space');
const out=resolve('out');
const decode=value=>value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity)=>{
 if(entity[0]==='#')return String.fromCodePoint(entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1)));
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[entity.toLowerCase()];
});
function attribute(tag,name){return decode(tag.match(new RegExp(`\\b${name}="([^"]*)"`,'i'))?.[1]||'');}
let xml=await readFile(resolve(out,'sitemap.xml'),'utf8');
if(xml.includes('<sitemapindex')){
 const children=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(decode(match[1])));
 if(!children.length)throw Error('Sitemap index has no shards');
 xml='';
 for(const url of children){
  if(url.origin!==site.origin||!/^\/sitemap-pages\/\d+\.xml$/.test(url.pathname))throw Error('Invalid sitemap shard URL');
  xml+=await readFile(resolve(out,'.'+url.pathname),'utf8');
 }
}
const urls=new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>decode(match[1])));
for(const post of posts){
 const path=`/${post.language}/post/${encodeURIComponent(post.slug)}/`,url=new URL(path,site).href;
 const html=await readFile(resolve(out,'.'+path,'index.html'),'utf8');
 const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].map(match=>match[0]);
 const named=name=>meta.find(tag=>attribute(tag,'name')===name)||'';
 const canonical=[...html.matchAll(/<link\b[^>]*>/gi)].map(match=>match[0]).find(tag=>attribute(tag,'rel')==='canonical')||'';
 const schema=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(match=>{
  const value=JSON.parse(match[1]);return Array.isArray(value)?value:value['@graph']||[value];
 });
 const actual={status:200,language:attribute(html.match(/<html\b[^>]*>/i)?.[0]||'','lang'),canonical:attribute(canonical,'href'),
  title:decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||''),description:attribute(named('description'),'content'),
  headings:[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(match=>decode(match[1].replace(/<[^>]+>/g,'')).trim()),
  robots:attribute(named('robots'),'content')+','+attribute(named('googlebot'),'content'),
  articleSchema:schema.some(node=>['BlogPosting','Article','NewsArticle'].includes(node['@type'])&&node.headline===post.title)};
 const problem=metadataFailure(actual,url,post.language)||articleSeoFailure(actual,post.title);
 if(problem)throw Error(`${url}: ${problem}`);
 if(!urls.has(url))throw Error(`${url}: canonical URL is missing from sitemap`);
}
console.log(`Verified standalone SEO and sitemap coverage for ${posts.length} published articles before deployment.`);
