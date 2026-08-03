'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FollowButton } from '../follow-button';
import { LikeButton } from '../like-button';
import { SaveButton } from '../save-button';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
type Post = { id:number; slug:string; title:string; excerpt:string; image_url:string; author:string; published_at:string; category_name:string; like_count:number; comment_count:number };
type Person = { name:string; bio:string; website:string; profession:string; address:string; interests:string; created_at:string|null; post_count:number; follower_count:number };

export default function Page(){return <Suspense fallback={<main className="author-loading">Loading writer…</main>}><AuthorProfile/></Suspense>}

function AuthorProfile() {
  const name = useSearchParams().get('name') || '';
  const [person, setPerson] = useState<Person|null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('rezantech_session');
    fetch(`${API}/api/people.php?name=${encodeURIComponent(name)}`, { headers:token ? { Authorization:`Bearer ${token}` } : {} })
      .then(async response => { if (!response.ok) throw new Error('This writer could not be found.'); return response.json(); })
      .then(data => { setPerson(data.person); setPosts(data.posts || []); setFollowing(Boolean(data.following)); })
      .catch(reason => setError(reason.message));
  }, [name]);

  if (error) return <main className="author-loading"><h1>Writer not found</h1><p>{error}</p><Link href="/">Return home</Link></main>;
  if (!person) return <main className="author-loading">Loading writer…</main>;

  return <main className="author-page">
    <section className="author-hero"><div className="author-cover"><i/><i/></div><div className="author-identity"><span>{person.name[0]}</span><div><small>{person.profession||'REZANTECH CONTRIBUTOR'}</small><h1>{person.name}</h1><p>{person.bio || 'Technology contributor sharing useful ideas with the RezanTech community.'}</p>{person.address&&<em className="author-location">⌖ {person.address}</em>}<footer><b>{person.post_count}</b> stories <b>{person.follower_count}</b> followers {person.website && <a href={person.website} target="_blank" rel="noreferrer">↗ Website</a>}</footer></div><FollowButton author={person.name} initial={following}/></div></section>
    <div className="author-content"><section><header><div><small>PUBLISHED WORK</small><h2>Stories by {person.name}</h2></div><span>{posts.length} stories</span></header>{posts.length ? <div className="author-posts">{posts.map(post => <article key={post.id}><Link className="author-post-image" href={`/post/${post.slug}`}>{post.image_url ? <img src={post.image_url} alt={post.title}/> : <span>{post.title[0]}</span>}</Link><div><small>{post.category_name}</small><Link href={`/post/${post.slug}`}><h3>{post.title}</h3><p>{post.excerpt}</p></Link><footer><span>{new Date(post.published_at).toLocaleDateString()}</span><div><LikeButton slug={post.slug} initialCount={post.like_count} compact/><SaveButton slug={post.slug} compact/></div></footer></div></article>)}</div> : <div className="author-empty">No published stories yet.</div>}</section><aside><h3>About the writer</h3><p>{person.bio || 'Technology contributor at RezanTech.'}</p>{person.profession&&<strong>{person.profession}</strong>}{person.interests&&<div className="author-interests">{person.interests.split(',').filter(Boolean).map(item=><span key={item}>{item.trim()}</span>)}</div>}{person.created_at && <small>Community member since {new Date(person.created_at).getFullYear()}</small>}<Link href="/discover">Discover more writers →</Link></aside></div>
  </main>;
}
