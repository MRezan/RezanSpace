'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {Comments} from '../article/comments';
import {FollowButton} from '../../follow-button';
import {LikeButton} from '../../like-button';
import {SaveButton} from '../../save-button';
import {ShareButton} from '../../share-button';

const API=process.env.NEXT_PUBLIC_API_URL||'https://rezan.space';
type Post={slug:string;title:string;excerpt:string;content:string;image_url:string;author:string;published_at:string;category_name:string};

function requestedSlug(){
 if(typeof window==='undefined')return '';
 const query=new URLSearchParams(window.location.search).get('slug');
 if(query)return query;
 const match=window.location.pathname.match(/^\/post\/([^/]+)\/?$/);
 return match?decodeURIComponent(match[1]):'';
}

export default function LiveReader(){
 const [slug,setSlug]=useState('');
 const [post,setPost]=useState<Post|null>(null);
 const [state,setState]=useState<'loading'|'ready'|'missing'|'error'>('loading');
 useEffect(()=>{
  const value=requestedSlug();setSlug(value);
  if(!value){setState('missing');return;}
  const controller=new AbortController();
  fetch(`${API}/api/posts.php?slug=${encodeURIComponent(value)}&fresh=${Date.now()}`,{cache:'no-store',signal:controller.signal})
   .then(async response=>{if(response.status===404){setState('missing');return null;}if(!response.ok)throw new Error('request');return response.json();})
   .then(data=>{if(data){setPost(data);setState('ready');}})
   .catch(error=>{if(error.name!=='AbortError')setState('error');});
  return()=>controller.abort();
 },[]);
 if(state==='loading')return <main className="db-story social-story seo-story"><section className="live-reader-state"><span className="live-reader-spinner"/><h1>Opening story…</h1><p>Loading the latest published version.</p></section></main>;
 if(state==='missing')return <main className="db-story social-story seo-story"><section className="live-reader-state"><b>404</b><h1>Story not found</h1><p>This story may have been unpublished or its address may be incorrect.</p><Link href="/discover/">Explore published stories →</Link></section></main>;
 if(state==='error'||!post)return <main className="db-story social-story seo-story"><section className="live-reader-state"><b>!</b><h1>Story temporarily unavailable</h1><p>We could not reach the publishing service. Please try again shortly.</p><button onClick={()=>window.location.reload()}>Try again</button></section></main>;
 const plain=post.content.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const readMinutes=Math.max(1,Math.ceil(plain.split(' ').filter(Boolean).length/220));
 return <main className="db-story social-story seo-story">
  <nav className="story-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><Link href={`/search/?q=${encodeURIComponent(post.category_name)}`}>{post.category_name}</Link><span>›</span><em>{post.title}</em></nav>
  <div className="story-shell"><article className="story-article">
   <header className="story-header"><Link className="story-topic" href={`/search/?q=${encodeURIComponent(post.category_name)}`}>{post.category_name}</Link><h1>{post.title}</h1><p className="lead">{post.excerpt}</p>
    <div className="story-author"><Link href={`/author/?name=${encodeURIComponent(post.author)}`}><span>{post.author[0]}</span></Link><div><Link href={`/author/?name=${encodeURIComponent(post.author)}`}><b>{post.author}</b></Link><small><time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}</time><i aria-hidden="true">•</i>{readMinutes} min read</small></div><FollowButton author={post.author}/></div>
   </header>
   <div className="story-social"><LikeButton slug={slug}/><a className="comment-action" href="#discussion"><i className="comment-icon"/>Discuss</a><SaveButton slug={slug}/><ShareButton title={post.title}/></div>
   {post.image_url&&<img className="story-cover" src={post.image_url} alt={post.title}/>}
   <div className="db-body" dangerouslySetInnerHTML={{__html:post.content}}/>
   <div id="discussion"><Comments slug={slug}/></div>
  </article><aside><Link href="/">← Back to your feed</Link><h3>Explore this topic</h3><p>Find more community perspectives about <b>{post.category_name}</b>.</p><Link className="story-aside-link" href={`/search/?q=${encodeURIComponent(post.category_name)}`}>More in {post.category_name} →</Link><h3>More from the writer</h3><Link className="story-aside-link" href={`/author/?name=${encodeURIComponent(post.author)}`}>View {post.author}’s profile →</Link><h3>Keep exploring</h3><Link className="story-aside-link" href="/discover/">Discover more stories →</Link></aside></div>
 </main>;
}
