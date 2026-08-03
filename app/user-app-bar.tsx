'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type Notice = {
  id: number;
  message: string;
  link: string;
  read_at: string | null;
  created_at: string;
};

type Viewer = { name: string } | null;

export function UserShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return children;
  return <><UserAppBar />{children}</>;
}

export function UserAppBar() {
  const pathname = usePathname();
  const activePath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const router = useRouter();
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [viewer, setViewer] = useState<Viewer>(null);
  const [menu, setMenu] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const cached = localStorage.getItem('rezantech_user');
    setViewer(cached ? JSON.parse(cached) : null);
    const token = localStorage.getItem('rezantech_session');
    if (!token) return;
    fetch(`${API}/api/library.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setNotices(data.notifications || []));
  }, [pathname]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === 'Escape') { setMenu(false); setNoticesOpen(false); searchInput.current?.blur(); }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  const unread = notices.filter(notice => !notice.read_at).length;
  const initial = viewer?.name?.[0]?.toUpperCase() || 'A';

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (value) router.push(`/search/?q=${encodeURIComponent(value)}`);
  }

  async function toggleNotices() {
    const next = !noticesOpen;
    setNoticesOpen(next);
    setMenu(false);
    if (!next || !unread) return;
    const token = localStorage.getItem('rezantech_session');
    if (!token) return;
    await fetch(`${API}/api/library.php`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotices(current => current.map(notice => ({
      ...notice,
      read_at: notice.read_at || new Date().toISOString(),
    })));
  }

  async function logout() {
    const token = localStorage.getItem('rezantech_session');
    if (token) await fetch(`${API}/api/auth.php?action=logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    localStorage.removeItem('rezantech_session');
    localStorage.removeItem('rezantech_user');
    router.push('/');
    router.refresh();
  }

  return <header className="social-top upgraded user-appbar">
    <div className="app-brand">
      <Link href="/" className="social-logo">R</Link>
      <Link href="/" className="app-wordmark">Rezan<span>Tech</span></Link>
    </div>
    <form className="app-search" onSubmit={search}>
      <span>⌕</span>
      <input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search stories, people and topics" />
      <kbd>⌘ K</kbd>
    </form>
    <nav>
      <Link className={activePath === '/' ? 'active' : ''} href="/">⌂<small>Home</small></Link>
      <Link className={activePath.startsWith('/discover') ? 'active' : ''} href="/discover">◈<small>Discover</small></Link>
      <Link className={activePath.startsWith('/library') ? 'active' : ''} href={viewer ? '/library' : '/account'}>♧<small>Library</small></Link>
    </nav>
    <div className="app-actions">
      <button className="notice" aria-label="Notifications" onClick={toggleNotices}>
        <span className="bell-shape">●</span>
        {unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}
      </button>
      {noticesOpen && <div className="notifications-menu">
        <header><h3>Notifications</h3><span>{unread ? 'Marked as read' : 'All caught up'}</span></header>
        {notices.length ? notices.slice(0, 8).map(notice => <Link href={notice.link || '/'} key={notice.id}>
          <b>◯</b><p>{notice.message}<small>{new Date(notice.created_at).toLocaleString()}</small></p>
        </Link>) : <div className="empty-notices"><b>🔔</b><p>No notifications yet.</p><small>Comments and publishing updates will appear here.</small></div>}
      </div>}
      <button className="account-trigger" onClick={() => { setMenu(!menu); setNoticesOpen(false); }}>
        <span className="social-avatar">{initial}</span><b>{viewer?.name || 'Account'}</b><em>⌄</em>
      </button>
      {menu && <div className="account-menu">
        <div><span className="social-avatar">{initial}</span><p><b>{viewer?.name || 'Guest reader'}</b><small>{viewer ? 'View your profile' : 'Sign in to personalize'}</small></p></div>
        <Link href={viewer ? '/profile' : '/account'}>◎ Profile</Link>
        <Link href={viewer ? '/library' : '/account'}>♧ Saved posts</Link>
        {viewer && <Link href="/">✎ Create from timeline</Link>}
        <hr />
        {viewer ? <button onClick={logout}>↗ Sign out</button> : <Link href="/account">→ Sign in</Link>}
      </div>}
    </div>
  </header>;
}
