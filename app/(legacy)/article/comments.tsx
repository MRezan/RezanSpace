'use client';
import {BrandLoader} from '../../brand-loader';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rezan.space';
type Comment = { id:number; body:string; created_at:string; updated_at:string; user_id:number; name:string; bio:string; can_delete:boolean };

export function Comments({ slug }: { slug:string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [viewer, setViewer] = useState<{ id:number; name:string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page,setPage]=useState(1);
  const [hasMore,setHasMore]=useState(false);
  const [total,setTotal]=useState(0);
  const [loadingMore,setLoadingMore]=useState(false);

  const load = useCallback(async (nextPage=1,append=false) => {
    if(append)setLoadingMore(true);
    try {
      const token = localStorage.getItem('rezantech_session');
      const response = await fetch(`${API}/api/comments.php?slug=${encodeURIComponent(slug)}&page=${nextPage}&limit=20`, {
        headers: token ? { Authorization:`Bearer ${token}` } : {},
      });
      const data = await response.json();
      setComments(current=>append?[...current,...(data.data||[])]:data.data||[]);
      setViewer(data.viewer || null);
      setPage(nextPage);setHasMore(Boolean(data.pagination?.has_more));setTotal(Number(data.pagination?.total||0));
      window.dispatchEvent(new CustomEvent('rezantech:engagement', { detail:{ slug, comments:Number(data.pagination?.total??(data.data||[]).length) } }));
    } finally { setLoading(false);setLoadingMore(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => [...comments].sort((a, b) => {
    const difference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return sort === 'newest' ? difference : -difference;
  }), [comments, sort]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem('rezantech_session');
    if (!token || !body.trim()) return;
    setSubmitting(true);
    setMessage('');
    const response = await fetch(`${API}/api/comments.php`, {
      method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
      body:JSON.stringify({ slug, body:body.trim() }),
    });
    const data = await response.json();
    if (response.ok) {
      setBody('');
      setMessage('Your comment was posted.');
      await load();
    } else setMessage(data.error || 'Could not post your comment.');
    setSubmitting(false);
  }

  async function remove(id:number) {
    const token = localStorage.getItem('rezantech_session');
    if (!token) return;
    setDeleting(id);
    const response = await fetch(`${API}/api/comments.php?id=${id}`, {
      method:'DELETE', headers:{ Authorization:`Bearer ${token}` },
    });
    if (response.ok) {
      setMessage('Comment deleted.');
      await load();
    }
    setDeleting(null);
  }

  return <section className="comments comments-v2">
    <header className="comments-head">
      <div><span className="comments-kicker"><i className="comment-icon"/>DISCUSSION</span><h2>Join the conversation</h2><p>{total} {total === 1 ? 'comment' : 'comments'} from the community</p></div>
      {comments.length > 1 && <label className="comment-sort">Sort by<select value={sort} onChange={event => setSort(event.target.value as 'newest' | 'oldest')}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>}
    </header>

    {viewer ? <form className="comment-box" onSubmit={submit}>
      <span className="comment-avatar">{viewer.name[0].toUpperCase()}</span>
      <div className="comment-compose-body">
        <label htmlFor="comment">Commenting as <b>{viewer.name}</b></label>
        <textarea id="comment" value={body} onChange={event => setBody(event.target.value)} required minLength={2} maxLength={2000} rows={4} placeholder="Share a thoughtful response, question or useful perspective…" />
        <div className="comment-actions"><small className={body.length > 1800 ? 'near-limit' : ''}>{body.length.toLocaleString()} / 2,000</small><button disabled={submitting || body.trim().length < 2}>{submitting ? 'Posting…' : 'Post comment'}</button></div>
      </div>
    </form> : <div className="comment-signin"><span className="comment-signin-icon"><i className="comment-icon"/></span><div><b>Join the discussion</b><p>Sign in to share a perspective or ask the community a question.</p></div><Link href="/account">Sign in to comment</Link></div>}

    {message && <p className="comment-message" role="status">{message}<button onClick={() => setMessage('')}>×</button></p>}

    <div className="comment-list">
      {loading ? <div className="comments-loading"><BrandLoader label="Loading discussion"/></div> : shown.length ? shown.map(comment => <article key={comment.id}>
        <Link className="comment-avatar" href={`/author/?name=${encodeURIComponent(comment.name)}`}>{comment.name[0].toUpperCase()}</Link>
        <div className="comment-bubble">
          <header><div><Link href={`/author/?name=${encodeURIComponent(comment.name)}`}><b>{comment.name}</b></Link>{comment.bio && <span>{comment.bio}</span>}<small>{new Date(comment.created_at).toLocaleString()}</small></div>{comment.can_delete && <button onClick={() => remove(comment.id)} disabled={deleting === comment.id}>{deleting === comment.id ? 'Deleting…' : 'Delete'}</button>}</header>
          <p>{comment.body}</p>
        </div>
      </article>) : <div className="no-comments"><span><i className="comment-icon"/></span><b>Start the conversation.</b><p>Be the first to leave a thoughtful response to this story.</p></div>}
    </div>
    {hasMore&&<button className="comments-load-more" disabled={loadingMore} onClick={()=>load(page+1,true)}>{loadingMore?<BrandLoader compact label="Loading more comments"/>:'Load more comments'}</button>}
  </section>;
}
