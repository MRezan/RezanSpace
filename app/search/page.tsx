'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FollowButton } from '../follow-button';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
import {categories} from '../categories';
const topics = [...categories];
type Mode = 'stories'|'people'|'topics';
type Post = { id:number; slug:string; title:string; excerpt:string; image_url:string; author:string; published_at:string; category_name:string };

export default function Page(){return <Suspense fallback={<main className="feed-loading">Opening search…</main>}><Search/></Suspense>}

function Search() {
  const params = useSearchParams();
  const [query,setQuery] = useState(params.get('q') || '');
  const [posts,setPosts] = useState<Post[]>([]);
  const [loading,setLoading] = useState(true);
  const [mode,setMode] = useState<Mode>('stories');

  useEffect(() => {
    setQuery(params.get('q') || '');
  }, [params]);

  useEffect(() => {
    Promise.all([1,2,3,4,5,6,7].map(page => fetch(`${API}/api/posts.php?page=${page}&limit=25`).then(response => response.json())))
      .then(pages => setPosts(pages.flatMap(page => page.data || [])))
      .finally(() => setLoading(false));
  }, []);

  const normalized = query.trim().toLowerCase();
  const stories = useMemo(() => posts.filter(post => `${post.title} ${post.excerpt} ${post.category_name} ${post.author}`.toLowerCase().includes(normalized)), [normalized,posts]);
  const people = useMemo(() => Array.from(new Map(posts.filter(post => post.author.toLowerCase().includes(normalized)).map(post => [post.author,{name:post.author,count:posts.filter(item=>item.author===post.author).length}])).values()), [normalized,posts]);
  const matchingTopics = useMemo(() => topics.filter(topic => topic.toLowerCase().includes(normalized)), [normalized]);

  return <main className="social-search search-v2">
    <div className="search-layout"><section className="search-results">
      <span className="search-kicker">DISCOVER REZANTECH</span>
      <h1>{query ? `Results for “${query}”` : 'Search RezanTech'}</h1>
      <label className="search-page-input"><i>⌕</i><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search stories, people and topics"/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search">×</button>}</label>
      <nav aria-label="Search result type">
        <button className={mode==='stories'?'active':''} onClick={()=>setMode('stories')}>Stories <span>{stories.length}</span></button>
        <button className={mode==='people'?'active':''} onClick={()=>setMode('people')}>People <span>{people.length}</span></button>
        <button className={mode==='topics'?'active':''} onClick={()=>setMode('topics')}>Topics <span>{matchingTopics.length}</span></button>
      </nav>

      {loading ? <p className="feed-loading">Searching the community…</p> : mode==='stories' ? stories.length ? stories.map(post=><article key={post.id}>
        <div className="m-author"><Link href={`/author/?name=${encodeURIComponent(post.author)}`}><span>{post.author[0]}</span></Link><Link href={`/author/?name=${encodeURIComponent(post.author)}`}><b>{post.author}</b></Link><small>{new Date(post.published_at).toLocaleDateString()}</small></div>
        <Link href={`/post/${post.slug}`}><div><h2>{post.title}</h2><p>{post.excerpt}</p><small>{post.category_name}</small></div>{post.image_url&&<img src={post.image_url} alt={post.title}/>}</Link>
      </article>) : <Empty label="stories"/> : mode==='people' ? people.length ? <div className="search-people">{people.map(person=><article key={person.name}><Link className="avatar" href={`/author/?name=${encodeURIComponent(person.name)}`}>{person.name[0]}</Link><div><Link href={`/author/?name=${encodeURIComponent(person.name)}`}><b>{person.name}</b></Link><small>{person.count} published stories</small></div><FollowButton author={person.name} compact/></article>)}</div> : <Empty label="people"/> : matchingTopics.length ? <div className="search-topics">{matchingTopics.map(topic=><button key={topic} onClick={()=>{setQuery(topic);setMode('stories')}}><i/><div><b>{topic}</b><small>{posts.filter(post=>post.category_name===topic).length} stories</small></div><span>→</span></button>)}</div> : <Empty label="topics"/>}
    </section><aside><h3>Explore topics</h3>{topics.map(topic=><button onClick={()=>{setQuery(topic);setMode('stories')}} key={topic}>{topic}</button>)}</aside></div>
  </main>;
}

function Empty({label}:{label:string}){return <div className="search-empty"><b>No matching {label}.</b><p>Try a broader name, keyword or technology topic.</p></div>}
