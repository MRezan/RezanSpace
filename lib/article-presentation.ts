import type {Metadata} from 'next';
import {absoluteUrl,ogLocales} from './i18n/locales';
import {postPath,translationsFor,type LocalizedPost} from './i18n/post-links';

export function plainArticleText(html:string){
 const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
 return html.replace(/<[^>]*>/g,' ').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity:string)=>{
  if(entity[0]!=='#')return entities[entity.toLowerCase()];
  const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));
  return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';
 }).replace(/\s+/g,' ').trim();
}
export function articleSummary(post:LocalizedPost){
 const text=plainArticleText(post.excerpt||post.content);
 if(text.length<=170)return text;
 const cut=text.slice(0,167);return (cut.lastIndexOf(' ')>100?cut.slice(0,cut.lastIndexOf(' ')):cut)+'…';
}
export function prepareArticleContent(content:string){
 // A page has one headline. Body headings become crawlable reading anchors.
 const toc:{id:string;label:string;level:number}[]=[];const ids=new Set<string>();
 const html=content.replace(/<h1(\s[^>]*)?>/gi,'<h2$1>').replace(/<\/h1>/gi,'</h2>')
  .replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,(_match,level:string,attributes:string,inner:string)=>{
   if(/<a\b/i.test(inner))return `<p class="reference-entry">${inner}</p>`;
   const label=plainArticleText(inner);if(!label)return `<h${level}${attributes}>${inner}</h${level}>`;
   const existing=attributes.match(/\sid\s*=\s*["']([\p{L}\p{N}_-]+)["']/iu)?.[1];
   let id=existing&&!ids.has(existing)?existing:`reader-section-${toc.length+1}`;
   while(ids.has(id))id+='-next';ids.add(id);toc.push({id,label,level:Number(level)});
   const clean=attributes.replace(/\s+id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');
   return `<h${level}${clean} id="${id}">${inner}</h${level}>`;
  });
 return {html,toc};
}
export function readingStats(post:LocalizedPost){
 const text=plainArticleText(post.content);
 const wordCount=typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter(post.language,{granularity:'word'}).segment(text)).filter(part=>part.isWordLike).length:text.split(/\s+/).filter(Boolean).length;
 return {wordCount,minutes:Math.max(1,Math.ceil(wordCount/220))};
}
export function relatedArticles(post:LocalizedPost,posts:LocalizedPost[]){
 return posts.filter(item=>item.language===post.language&&item.slug!==post.slug)
  .sort((a,b)=>Number(b.category_name===post.category_name)-Number(a.category_name===post.category_name)||Number(b.author===post.author)-Number(a.author===post.author)||Date.parse(b.published_at)-Date.parse(a.published_at)).slice(0,6);
}
export function articleMetadata(post:LocalizedPost,posts:LocalizedPost[]):Metadata{
 const description=articleSummary(post);const alternatives=translationsFor(post,posts);const fallback=alternatives.find(item=>item.language==='en')||alternatives[0];
 return {
  title:post.title,description,authors:[{name:post.author,url:absoluteUrl('/author/?name='+encodeURIComponent(post.author))}],
  alternates:{canonical:postPath(post),languages:{...Object.fromEntries(alternatives.map(item=>[item.language,absoluteUrl(postPath(item))])),'x-default':absoluteUrl(postPath(fallback))}},
  openGraph:{type:'article',siteName:'REZAN',locale:ogLocales[post.language],url:postPath(post),title:post.title,description,publishedTime:post.published_at,modifiedTime:post.updated_at||post.published_at,section:post.category_name,authors:[post.author],images:post.image_url?[{url:post.image_url,alt:post.image_alt||post.title}]:undefined},
  twitter:{card:post.image_url?'summary_large_image':'summary',title:post.title,description,images:post.image_url?[post.image_url]:undefined},
  robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}},
 };
}
