'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://rezan.space';

export function FollowButton({ author, initial = false, compact = false }: { author:string; initial?:boolean; compact?:boolean }) {
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('rezantech_session');
    if (!token) return;
    fetch(`${API}/api/follows.php`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(response => response.ok ? response.json() : null)
      .then(data => data && setFollowing((data.data || []).includes(author)))
      .catch(() => null);
  }, [author]);

  async function toggle() {
    const token = localStorage.getItem('rezantech_session');
    if (!token) { location.href='/account'; return; }
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/follows.php`, {
        method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body:JSON.stringify({ author }),
      });
      if (response.ok) {
        const next = Boolean((await response.json()).following);
        setFollowing(next);
        window.dispatchEvent(new CustomEvent('rezantech:follow', { detail:{ author, following:next } }));
      }
    } catch { /* Keep the current state when the API is offline. */ }
    finally { setBusy(false); }
  }

  return <button type="button" className={`follow-button ${following ? 'following' : ''} ${compact ? 'compact' : ''}`} onClick={toggle} disabled={busy} aria-pressed={following}>{busy ? '…' : following ? 'Following' : 'Follow'}</button>;
}
