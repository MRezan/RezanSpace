'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SaveButton } from '../save-button';
import { FollowButton } from '../follow-button';
import { ExpandableText } from '../expandable-text';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
import {categories} from '../categories';
const topics = ['All', ...categories];
type Post = { id:number; slug:string; title:string; excerpt:string; image_url:string; author:string; published_at:string; category_name:string; like_count:number; comment_count:number };

export default function Discover() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [topic, setTopic] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([1,2,3,4,5,6,7,8].map(page => fetch(`${API}/api/posts.php?page=${page}&limit=20`).then(response => response.json())))
      .then(pages => setPosts(pages.flatMap(page => page.data || [])))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => topic === 'All' ? posts : posts.filter(post => post.category_name === topic), [posts, topic]);
  const trending = useMemo(() => [...posts].sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count)).slice(0, 5), [posts]);
  const writers = useMemo(() => Array.from(new Set(posts.map(post => post.author))).slice(0, 4), [posts]);
  const featured = filtered[0];

  return <main className="discover-page">
    <section className="discover-hero"><div><span>EXPLORE WHAT’S NEXT</span><h1>Discover ideas<br/>worth understanding.</h1><p>Fresh stories, useful perspectives and thoughtful conversations across every topic in the REZAN community.</p></div><div className="discover-orbit"><i/><i/><b>R</b></div></section>

    <nav className="discover-topics" aria-label="Filter by topic">{topics.map(item => <button key={item} className={topic === item ? 'active' : ''} onClick={() => setTopic(item)}>{item}</button>)}</nav>

    {loading ? <div className="discover-loading"><i/><p>Finding stories for you…</p></div> : <div className="discover-layout">
      <section className="discover-main">
        {featured && <article className="discover-featured"><Link href={`/post/${featured.slug}`} className="featured-image">{featured.image_url ? <img src={featured.image_url} alt={featured.title}/> : <span>{featured.title[0]}</span>}<em>Editor’s pick</em></Link><div><small>{featured.category_name}</small><Link href={`/post/${featured.slug}`}><h2>{featured.title}</h2></Link><ExpandableText text={featured.excerpt}/><footer><span><Link href={`/author/?name=${encodeURIComponent(featured.author)}`}>{featured.author}</Link> · {new Date(featured.published_at).toLocaleDateString()}</span><SaveButton slug={featured.slug}/></footer></div></article>}
        <div className="discover-heading"><div><small>CURATED FOR YOU</small><h2>Explore stories</h2></div><span>{filtered.length} results</span></div>
        <div className="discover-cards">{filtered.slice(1, 13).map(post => <article key={post.id}><Link className="discover-card-image" href={`/post/${post.slug}`}>{post.image_url ? <img src={post.image_url} alt={post.title}/> : <span>{post.title[0]}</span>}</Link><div><header><small>{post.category_name}</small><SaveButton slug={post.slug} compact/></header><Link href={`/post/${post.slug}`}><h3>{post.title}</h3><p>{post.excerpt}</p></Link><footer><Link href={`/author/?name=${encodeURIComponent(post.author)}`}>{post.author}</Link><small className="engagement-stat"><i className="like-icon"/>{post.like_count || 0}<i className="comment-icon"/>{post.comment_count || 0}</small></footer></div></article>)}</div>
      </section>
      <aside className="discover-rail">
        <section><div className="rail-heading"><h3>Trending now</h3><span>LIVE</span></div>{trending.map((post, index) => <Link href={`/post/${post.slug}`} key={post.slug}><b>{String(index + 1).padStart(2, '0')}</b><div><strong>{post.title}</strong><small>{post.category_name}</small></div></Link>)}</section>
        <section><h3>Writers to know</h3>{writers.map((writer, index) => <div className="discover-writer" key={writer}><Link className={`avatar a${index}`} href={`/author/?name=${encodeURIComponent(writer)}`}>{writer[0]}</Link><p><Link href={`/author/?name=${encodeURIComponent(writer)}`}><b>{writer}</b></Link><small>Community writer</small></p><FollowButton author={writer} compact/></div>)}</section>
        <section className="discover-create"><span>✎</span><h3>Have something useful to share?</h3><p>Create a story directly from your home timeline.</p><Link href="/">Go to timeline</Link></section>
      </aside>
    </div>}
  </main>;
}
