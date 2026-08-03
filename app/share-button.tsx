'use client';

import { useState } from 'react';

export function ShareButton({ url, title, compact = false }: { url?:string; title?:string; compact?:boolean }) {
  const [message, setMessage] = useState('');

  async function share() {
    const target = url ? new URL(url, location.origin).toString() : location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: title || document.title, url: target });
        setMessage('Shared');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(target);
        setMessage('Link copied');
      } else {
        const field = document.createElement('textarea');
        field.value = target;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Copy unavailable');
        setMessage('Link copied');
      }
      setTimeout(() => setMessage(''), 1600);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage('Could not share');
      setTimeout(() => setMessage(''), 1800);
    }
  }

  return <button type="button" className={`share-story ${compact ? 'compact' : ''}`} onClick={share} aria-label="Share story" title={message || 'Share story'}>
    <span className="share-icon" aria-hidden="true" />{!compact && <em>Share</em>}
    {message && <i className="action-toast">{message}</i>}
  </button>;
}
