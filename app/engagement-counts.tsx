'use client';

import { useEffect, useState } from 'react';

export function EngagementCounts({ slug, likes:initialLikes, comments:initialComments }: { slug:string; likes:number; comments:number }) {
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [dislikes, setDislikes] = useState(0);

  useEffect(() => {
    setLikes(initialLikes);
    setComments(initialComments);
  }, [slug, initialLikes, initialComments]);

  useEffect(() => {
    function update(event: Event) {
      const detail = (event as CustomEvent<{ slug:string; likes?:number; dislikes?:number; comments?:number }>).detail;
      if (!detail || detail.slug !== slug) return;
      if (typeof detail.likes === 'number') setLikes(detail.likes);
      if (typeof detail.dislikes === 'number') setDislikes(detail.dislikes);
      if (typeof detail.comments === 'number') setComments(detail.comments);
    }
    window.addEventListener('rezantech:engagement', update);
    return () => window.removeEventListener('rezantech:engagement', update);
  }, [slug]);

  return <div className="engagement live-engagement" aria-live="polite">
    <span className="engagement-stat"><i className="like-icon"/>{likes} {likes === 1 ? 'like' : 'likes'}</span>
    <span className="engagement-stat engagement-right"><i className="like-icon dislike-icon"/>{dislikes} {dislikes === 1 ? 'dislike' : 'dislikes'}<i className="comment-icon"/>{comments} {comments === 1 ? 'comment' : 'comments'}</span>
  </div>;
}
