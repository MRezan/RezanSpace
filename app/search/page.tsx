'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FollowButton } from '../follow-button';
import { ExpandableText } from '../expandable-text';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://rezan.space';
import {categories} from '../categories';
const topics = [...categories];
type Mode = 'stories'|'people'|'topics';
type Post = { id:number; slug:string; title:string; excerpt:string; image_url:string; author:string; published_at:string; category_name:string };
type Person = { id:number; name:string; bio?:string; avatar_url?:string; post_count:number; follower_count:number };

export default function Page(){return <Suspense fallback={<main className="feed-loading">Opening search…</main>}><Search/></Suspense>}

function Search() {
  const params = useSearchParams();
  const [query,setQuery] = useState(params.get('q') || '');
  const [posts,setPosts] = useState<Post[]>([]);
  const [people,setPeople] = useState<Person[]>([]);
  const [loading,setLoading] = useState(true);
  const [mode,setMode] = useState<Mode>('stories');
  const normalized = query.trim().toLowerCase();

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(params.get('q') || ''), 0);
    return () => window.clearTimeout(timer);
  }, [params]);

  useEffect(() => {
    Promise.all([1,2,3,4,5,6,7].map(page => fetch(`${API}/api/posts.php?page=${page}&limit=25`).then(response => response.json())))
      .then(pages => setPosts(pages.flatMap(page => page.data || [])))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!normalized) { setPeople([]); return; }
      const token = localStorage.getItem('rezantech_session');
      fetch(`${API}/api/people.php?q=${encodeURIComponent(query.trim())}&limit=25`, {
        headers: token ? { Authorization:`Bearer ${token}` } : {},
        signal: controller.signal,
      }).then(response => response.ok ? response.json() : {data:[]})
        .then(result => {
          const matches = result.data || [];
          setPeople(matches);
          const hasMatchingStory = posts.some(post => `${post.title} ${post.excerpt} ${post.category_name} ${post.author}`.toLowerCase().includes(normalized));
          if (matches.length && !hasMatchingStory) setMode('people');
        })
        .catch(error => { if (error.name !== 'AbortError') setPeople([]); });
    }, 150);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalized,query,posts]);

  const stories = useMemo(() => posts.filter(post => `${post.title} ${post.excerpt} ${post.category_name} ${post.author}`.toLowerCase().includes(normalized)), [normalized,posts]);
  const matchingTopics = useMemo(() => topics.filter(topic => topic.toLowerCase().includes(normalized)), [normalized]);

  return <main className="social-search search-v2">
    <div className="search-layout"><section className="search-results">
      <span className="search-kicker">DISCOVER REZAN</span>
      <h1>{query ? `Results for “${query}”` : 'Search REZAN'}</h1>
      <label className="search-page-input"><i>⌕</i><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search stories, people and topics"/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search">×</button>}</label>
      <nav aria-label="Search result type">
        <button className={mode==='stories'?'active':''} onClick={()=>setMode('stories')}>Stories <span>{stories.length}</span></button>
        <button className={mode==='people'?'active':''} onClick={()=>setMode('people')}>People <span>{people.length}</span></button>
        <button className={mode==='topics'?'active':''} onClick={()=>setMode('topics')}>Topics <span>{matchingTopics.length}</span></button>
      </nav>

      {loading && mode==='stories' ? <p className="feed-loading">Searching the community…</p> : mode==='stories' ? stories.length ? stories.map(post=><article key={post.id}>
        <div className="m-author"><Link href={`/author/?name=${encodeURIComponent(post.author)}`}><span>{post.author[0]}</span></Link><Link href={`/author/?name=${encodeURIComponent(post.author)}`}><b>{post.author}</b></Link><small>{new Date(post.published_at).toLocaleDateString()}</small></div>
        <div className="search-story-result"><div><Link href={`/post/${post.slug}`}><h2>{post.title}</h2></Link><ExpandableText text={post.excerpt}/><small>{post.category_name}</small></div>{post.image_url&&<Link href={`/post/${post.slug}`}><img src={post.image_url} alt={post.title}/></Link>}</div>
      </article>) : <Empty label="stories"/> : mode==='people' ? people.length ? <div className="search-people">{people.map(person=><article key={person.id}><Link className="avatar" href={`/author/?name=${encodeURIComponent(person.name)}`}>{person.avatar_url?<img src={person.avatar_url} alt=""/>:person.name[0]}</Link><div className="person-details"><Link href={`/author/?name=${encodeURIComponent(person.name)}`}><b>{person.name}</b></Link>{person.bio&&<p>{person.bio}</p>}<small><span>{person.post_count} {person.post_count===1?'story':'stories'}</span><i/> <span>{person.follower_count} {person.follower_count===1?'follower':'followers'}</span></small></div><FollowButton author={person.name} compact/></article>)}</div> : <Empty label="people"/> : matchingTopics.length ? <div className="search-topics">{matchingTopics.map(topic=><button key={topic} onClick={()=>{setQuery(topic);setMode('stories')}}><i/><div><b>{topic}</b><small>{posts.filter(post=>post.category_name===topic).length} stories</small></div><span>→</span></button>)}</div> : <Empty label="topics"/>}
    </section><aside><h3>Explore topics</h3>{topics.map(topic=><button onClick={()=>{setQuery(topic);setMode('stories')}} key={topic}>{topic}</button>)}</aside></div>
  </main>;
}

function Empty({label}:{label:string}){return <div className="search-empty"><b>No matching {label}.</b><p>Try a broader name, keyword or topic.</p></div>}
