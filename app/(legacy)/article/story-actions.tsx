'use client';

import { useCallback, useEffect, useState } from 'react';
import { SaveButton } from '../../save-button';
import { ShareButton } from '../../share-button';
import { LikeButton } from '../../like-button';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rezan.space';

export function StoryActions({ slug }: { slug:string }) {
  const [data, setData] = useState({ comments:0 });

  const load = useCallback(async () => {
    const token = localStorage.getItem('rezantech_session');
    const response = await fetch(`${API}/api/engagement.php?slug=${slug}`, {
      headers: token ? { Authorization:`Bearer ${token}` } : {},
    });
    if (response.ok) setData(await response.json());
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  return <div className="story-actions">
    <div><LikeButton slug={slug} compact/><a className="comment-action" href="#discussion"><i className="comment-icon"/><span>{data.comments}</span></a></div>
    <div><SaveButton slug={slug} compact/><ShareButton compact/></div>
  </div>;
}
