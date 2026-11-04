import {cache} from 'react';
import {readFile} from 'node:fs/promises';
import {isLocale, type Locale, localePath,siteUrl} from './locales';
export type LocalizedPost = {id:number;slug:string;title:string;excerpt:string;content:string;author:string;category_name:string;image_url?:string;image_alt?:string;published_at:string;updated_at?:string;language:Locale;translation_key?:string|null};
const api=process.env.REZAN_BUILD_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://rezan.space';
export const getPublishedPosts=cache(async():Promise<LocalizedPost[]>=>{
  // A build snapshot supports hosts that block server-side API requests. Never silently ship an empty blog.
  let rows:unknown[];
  if(process.env.REZAN_POSTS_FILE){rows=JSON.parse(await readFile(process.env.REZAN_POSTS_FILE,'utf8'));}
  else {
    const page=async(n:number)=>{const response=await fetch(`${api}/api/posts.php?page=${n}&limit=25`,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`Post API returned ${response.status}`);const body=await response.json();if(!Array.isArray(body.data))throw new Error('Post API must return a data array');return body;};
    const first=await page(1);const count=Math.max(1,Math.ceil(Number(first.pagination?.total || 0)/25));
    const remaining=await Promise.all(Array.from({length:count-1},(_,i)=>page(i+2)));
    rows=[first,...remaining].flatMap(result=>result.data);
  }
  if(!Array.isArray(rows))throw new Error('Post snapshot must be an array');
  const result=rows.map(value=>{const post=value as LocalizedPost;const language=post.language || 'en';if(!isLocale(language)||!post.slug||!post.title||!post.content)throw new Error('Invalid published post snapshot');let image_url=post.image_url; if(image_url){try{const image=new URL(image_url);const site=new URL(siteUrl);if(image.hostname===site.hostname&&image.protocol==='http:'&&site.protocol==='https:')image_url=site.origin+image.pathname+image.search;}catch{throw new Error('Published post has an invalid cover URL');}} return {...post,language,image_url};});
  const slugs=new Set<string>();const groups=new Set<string>();
  for(const post of result){if(slugs.has(post.slug))throw new Error(`Duplicate published slug: ${post.slug}`);slugs.add(post.slug);if(post.translation_key){const key=`${post.translation_key}:${post.language}`;if(groups.has(key))throw new Error(`Duplicate translation language: ${key}`);groups.add(key);}}
  return result;
});
export const postPath=(post:Pick<LocalizedPost,'language'|'slug'>)=>localePath(post.language,`post/${encodeURIComponent(post.slug)}`);
export function translationsFor(post:LocalizedPost, posts:LocalizedPost[]){return post.translation_key ? posts.filter(item=>item.translation_key===post.translation_key) : [post];}
export function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,'\\u003c');}
