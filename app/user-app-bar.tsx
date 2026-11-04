'use client';

import Link from 'next/link';
import {LanguageSwitcher} from './language-switcher';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rezan.space';

type Notice = {
  id: number;
  type: string;
  message: string;
  link: string;
  read_at: string | null;
  created_at: string;
};

type Viewer = { name: string; avatar_url?:string; role?:'user'|'editor'|'admin' } | null;
function cachedViewer():Viewer{try{const value=localStorage.getItem('rezantech_user');return value?JSON.parse(value):null}catch{localStorage.removeItem('rezantech_user');return null}}

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
  const appActions = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [viewer, setViewer] = useState<Viewer>(null);
  const [menu, setMenu] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    setViewer(cachedViewer());
    const token = localStorage.getItem('rezantech_session');
    if (!token) return;
    fetch(`${API}/api/auth.php?action=me`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.ok?r.json():null)
      .then(data=>{if(data?.user){setViewer(data.user);localStorage.setItem('rezantech_user',JSON.stringify(data.user))}})
      .catch(()=>null);
    fetch(`${API}/api/library.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setNotices(data.notifications || []))
      .catch(()=>null);
  }, [pathname]);

  useEffect(()=>{function refresh(){setViewer(cachedViewer())}window.addEventListener('rezantech:profile-updated',refresh);return()=>window.removeEventListener('rezantech:profile-updated',refresh)},[]);

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

  useEffect(() => {
    function closeMenus(event: PointerEvent) {
      if (!appActions.current?.contains(event.target as Node)) {
        setMenu(false);
        setNoticesOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeMenus);
    return () => document.removeEventListener('pointerdown', closeMenus);
  }, []);

  const unread = notices.filter(notice => !notice.read_at).length;
  const initial = viewer?.name?.[0]?.toUpperCase() || 'A';

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (value) router.push(`/search/?q=${encodeURIComponent(value)}`);
  }

  function toggleNotices() {
    setNoticesOpen(!noticesOpen);
    setMenu(false);
  }

  function noticeHref(link:string){return link.startsWith('/article/')?`${link.replace('/article/','/post/').replace(/\/$/,'')}/#discussion`:link||'/'}

  function setNoticeRead(id:number,read:boolean) {
    const token = localStorage.getItem('rezantech_session');
    if (!token) return;
    setNotices(current=>current.map(notice=>notice.id===id?{...notice,read_at:read?new Date().toISOString():null}:notice));
    fetch(`${API}/api/library.php`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' },
      body:JSON.stringify({id,read}),
      keepalive:true,
    }).catch(()=>null);
  }

  async function logout() {
    const token = localStorage.getItem('rezantech_session');
    setMenu(false);
    try {
      if (token) await fetch(`${API}/api/auth.php?action=logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      localStorage.removeItem('rezantech_session');
      localStorage.removeItem('rezantech_user');
      setViewer(null);
      router.push('/');
      router.refresh();
    }
  }

  return <header className="social-top upgraded user-appbar">
    <div className="app-brand">
      <Link href="/en/" className="social-logo" aria-label="REZAN home"><img src="/favicon.svg" alt=""/></Link>
      <Link href="/en/" className="app-wordmark">REZAN</Link>
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
    <div className="app-actions" ref={appActions}><LanguageSwitcher/>
      <button className="notice" aria-label="Notifications" onClick={toggleNotices}>
        <span className="bell-shape">●</span>
        {unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}
      </button>
      {noticesOpen && <div className="notifications-menu">
        <header><h3>Notifications</h3><span>{unread?`${unread} unread`:'All caught up'}</span></header>
        {notices.length ? notices.slice(0, 8).map(notice => <div className={`notification-row ${notice.read_at?'is-read':'is-unread'}`} key={notice.id}><Link href={noticeHref(notice.link)} onClick={()=>{setNoticeRead(notice.id,true);setNoticesOpen(false)}}>
          <b className={`notification-type ${notice.type}`} aria-hidden="true"><i/></b><p>{notice.message}<small>{notice.type==='comment'?'New comment':'Notification'} · {new Date(notice.created_at).toLocaleString()}</small></p>
        </Link><button onClick={()=>setNoticeRead(notice.id,!Boolean(notice.read_at))}>{notice.read_at?'Mark unread':'Mark read'}</button></div>) : <div className="empty-notices"><b>🔔</b><p>No notifications yet.</p><small>Comments and publishing updates will appear here.</small></div>}
      </div>}
      <button className="account-trigger" onClick={() => { setMenu(!menu); setNoticesOpen(false); }}>
        <span className="social-avatar">{viewer?.avatar_url?<img src={viewer.avatar_url} alt=""/>:initial}</span><b>{viewer?.name || 'Account'}</b><em>⌄</em>
      </button>
      {menu && <div className="account-menu" onClick={() => setMenu(false)}>
        <div><span className="social-avatar">{viewer?.avatar_url?<img src={viewer.avatar_url} alt=""/>:initial}</span><p><b>{viewer?.name || 'Guest reader'}</b><small>{viewer ? 'View your profile' : 'Sign in to personalize'}</small></p></div>
        <Link href={viewer ? '/profile' : '/account'}>◎ Profile</Link>
        <Link href={viewer ? '/library' : '/account'}>♧ Saved posts</Link>
        {viewer && <Link href="/">✎ Create from timeline</Link>}
        {viewer&&(viewer.role==='admin'||viewer.role==='editor')&&<Link href="/admin">▦ Editorial workspace</Link>}
        <hr />
        {viewer ? <button onClick={logout}>↗ Sign out</button> : <Link href="/account">→ Sign in</Link>}
      </div>}
    </div>
  </header>;
}
