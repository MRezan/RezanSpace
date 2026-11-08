'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ArticleReader} from '../../article-reader';
import {StorySkeleton} from '../../story-skeleton';
import {UiLanguage} from '../../ui-language';
import {isLocale} from '../../../lib/i18n/locales';
import type {LocalizedPost} from '../../../lib/i18n/post-links';
const API=process.env.NEXT_PUBLIC_API_URL||'https://rezan.space';
function requestedSlug(){
 if(typeof window==='undefined')return '';
 const query=new URLSearchParams(window.location.search).get('slug');if(query)return query;
 const match=window.location.pathname.match(/^\/(?:[A-Za-z-]+\/)?post\/([^/]+)\/?$/);
 try{return match?decodeURIComponent(match[1]):'';}catch{return '';}
}
function postValue(value:unknown,related=false):LocalizedPost|null{
 if(!value||typeof value!=='object')return null;const data=value as Record<string,unknown>;
 if(!['slug','title','author','category_name','published_at'].every(key=>typeof data[key]==='string'&&data[key]))return null;
 if(!related&&typeof data.content!=='string')return null;
 if(!Number.isFinite(Date.parse(String(data.published_at))))return null;
 return {...data,id:Number(data.id)||0,image_url:typeof data.image_url==='string'?data.image_url:undefined,image_alt:typeof data.image_alt==='string'?data.image_alt:undefined,updated_at:typeof data.updated_at==='string'&&Number.isFinite(Date.parse(data.updated_at))?data.updated_at:undefined,language:isLocale(String(data.language))?data.language:'en',excerpt:typeof data.excerpt==='string'?data.excerpt:'',content:typeof data.content==='string'?data.content:''} as LocalizedPost;
}
export default function LiveReader(){
 const [post,setPost]=useState<LocalizedPost|null>(null),[related,setRelated]=useState<LocalizedPost[]>([]);
 const [state,setState]=useState<'loading'|'ready'|'missing'|'error'>('loading');
 useEffect(()=>{
  const slug=requestedSlug();if(!slug){setState('missing');return;}
  const controller=new AbortController();let disposed=false;
  const timer=setTimeout(()=>controller.abort(),15000);
  fetch(`${API}/api/posts.php?slug=${encodeURIComponent(slug)}&fresh=${Date.now()}`,{cache:'no-store',signal:controller.signal})
   .then(async response=>{if(disposed)return null;if(response.status===404){setState('missing');return null;}if(!response.ok)throw new Error('request');return response.json();})
   .then(data=>{if(disposed||!data)return;const value=postValue(data);if(!value||value.slug!==slug)throw new Error('Invalid story');setPost(value);setRelated(Array.isArray(data.related)?data.related.map((item:unknown)=>postValue(item,true)).filter((item:LocalizedPost|null):item is LocalizedPost=>item!==null):[]);document.title=value.title+' | REZAN';setState('ready');})
   .catch(()=>{if(!disposed)setState('error');}).finally(()=>clearTimeout(timer));
  return()=>{disposed=true;clearTimeout(timer);controller.abort();};
 },[]);
 if(state==='loading')return <StorySkeleton/>;
 if(state==='missing')return <main className="reader-page"><section className="live-reader-state"><b>404</b><h1>Story not found</h1><p>This story may have been unpublished or its address may be incorrect.</p><Link href="/discover/">Explore published stories →</Link></section></main>;
 if(state==='error'||!post)return <main className="reader-page"><section className="live-reader-state"><b>!</b><h1>Story temporarily unavailable</h1><p>We could not reach the publishing service. Please try again shortly.</p><button onClick={()=>window.location.reload()}>Try again</button></section></main>;
 return <UiLanguage locale={post.language}><ArticleReader post={post} posts={[post,...related]}/></UiLanguage>;
}
