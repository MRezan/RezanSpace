'use client';
import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Post } from './posts';

export function PostExplorer({posts}:{posts:Post[]}){
 const [filter,setFilter]=useState('All'); const [query,setQuery]=useState('');
 const categories=['All',...Array.from(new Set(posts.map(p=>p.category)))];
 const filtered=useMemo(()=>posts.filter(p=>(filter==='All'||p.category===filter)&&`${p.title} ${p.excerpt}`.toLowerCase().includes(query.toLowerCase())),[posts,filter,query]);
 return <><div className="filter-row"><div className="chips">{categories.map(c=><button className={filter===c?'active':''} onClick={()=>setFilter(c)} key={c}>{c}</button>)}</div><label className="search">⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search stories" aria-label="Search stories"/></label></div><div className="post-grid">{filtered.map((post,index)=><Link href={`/article/${post.slug}`} className={`post-card ${index===0?'wide':''}`} key={post.slug}><div className={`post-art ${post.accent}`}><span>0{index+2}</span><i/><b>{post.category.slice(0,2).toUpperCase()}</b></div><div className="post-body"><div className="post-meta"><b>{post.category}</b><span>{post.date}</span></div><h3>{post.title}</h3><p>{post.excerpt}</p><div className="post-bottom"><span>{post.readTime}</span><b>↗</b></div></div></Link>)}</div>{!filtered.length&&<p className="empty">No dispatches match that search.</p>}</>
}

export function Newsletter(){const [done,setDone]=useState(false); function submit(e:FormEvent){e.preventDefault();setDone(true)} return <section className="newsletter" id="newsletter"><div><span className="kicker">The REZAN Brief</span><h2>One thoughtful email.<br/><em>Every Thursday.</em></h2></div>{done?<p className="thanks">You’re on the list. See you Thursday.</p>:<form onSubmit={submit}><label htmlFor="email">Get the signal, skip the noise.</label><div><input id="email" type="email" required placeholder="you@example.com"/><button>Join the brief →</button></div><small>No spam. Unsubscribe whenever you like.</small></form>}</section>}
