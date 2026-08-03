'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SaveButton } from '../save-button';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
type SavedStory = { post_slug:string; saved_at:string; title:string; excerpt:string; image_url:string; author:string; published_at:string; category_name:string; like_count:number; comment_count:number };

export default function Library() {
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const load = useCallback(async () => {
    const token = localStorage.getItem('rezantech_session');
    if (!token) { router.replace('/account'); return; }
    try {
      const response = await fetch(`${API}/api/library.php`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { router.replace('/account'); return; }
      if (!response.ok) throw new Error('Your saved stories could not be loaded.');
      const data = await response.json();
      setStories(data.saved || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load your library.');
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    function update(event: Event) {
      const detail = (event as CustomEvent<{ slug:string; saved:boolean }>).detail;
      if (detail && !detail.saved) setStories(current => current.filter(story => story.post_slug !== detail.slug));
    }
    window.addEventListener('rezantech:bookmark', update);
    return () => window.removeEventListener('rezantech:bookmark', update);
  }, []);

  if (loading) return <main className="library-page"><div className="library-loading"><i/><p>Opening your library…</p></div></main>;
  return <main className="library-page">
    <header className="library-heading"><div><span>YOUR READING SPACE</span><h1>Saved stories</h1><p>Keep the technology stories you want to revisit in one organized place.</p></div><Link href="/">Explore feed</Link></header>
    {error && <div className="library-error">{error}<button onClick={load}>Try again</button></div>}
    {!error && stories.length ? <section className="library-grid">{stories.map(story => <article key={story.post_slug}>
      <Link className="library-image" href={`/post/${story.post_slug}`}>{story.image_url ? <img src={story.image_url} alt={story.title}/> : <span>{story.title[0]}</span>}</Link>
      <div className="library-card-body"><div className="library-meta"><span>{story.category_name}</span><SaveButton slug={story.post_slug} compact/></div><Link href={`/post/${story.post_slug}`}><h2>{story.title}</h2><p>{story.excerpt}</p></Link><footer><span><Link href={`/author/?name=${encodeURIComponent(story.author)}`}>{story.author}</Link> · {new Date(story.published_at || story.saved_at).toLocaleDateString()}</span><small className="engagement-stat"><i className="like-icon"/>{story.like_count || 0}<i className="comment-icon"/>{story.comment_count || 0}</small></footer></div>
    </article>)}</section> : !error && <section className="library-empty"><span className="bookmark-icon"/><h2>Save stories for later.</h2><p>Use the bookmark button on any feed or story card. Your saved stories will appear here automatically.</p><Link href="/">Discover stories</Link></section>}
  </main>;
}
