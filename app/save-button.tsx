'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://trendtechorbit.freedev.app';

export function SaveButton({ slug, compact = false }: { slug:string; compact?:boolean }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('rezantech_session');
    if (!token) return;
    fetch(`${API}/api/engagement.php?slug=${encodeURIComponent(slug)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(response => response.ok ? response.json() : null)
      .then(data => data && setSaved(Boolean(data.saved)))
      .catch(() => null);
  }, [slug]);

  async function toggle() {
    const token = localStorage.getItem('rezantech_session');
    if (!token) { location.href = '/account'; return; }
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/engagement.php`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, action: 'bookmark' }),
      });
      if (response.ok) {
        const data = await response.json();
        setSaved(Boolean(data.saved));
        setMessage(data.saved ? 'Saved' : 'Removed');
        window.dispatchEvent(new CustomEvent('rezantech:bookmark', { detail:{ slug, saved:Boolean(data.saved) } }));
        setTimeout(() => setMessage(''), 1200);
      }
    } catch { setMessage('Could not connect'); }
    finally { setBusy(false); }
  }

  return <button type="button" className={`save-story ${saved ? 'saved' : ''} ${compact ? 'compact' : ''}`} onClick={toggle} disabled={busy} aria-label={saved ? 'Remove from saved stories' : 'Save story'} title={message || (saved ? 'Saved to your library' : 'Save to your library')}>
    <span className="bookmark-icon" aria-hidden="true" />{!compact && <em>Save</em>}
  </button>;
}
