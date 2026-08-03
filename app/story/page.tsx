'use client';

import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-static';

export default function StoryRedirect() {
  return <Suspense fallback={<main className="feed-loading">Opening story…</main>}><Redirect /></Suspense>;
}

function Redirect() {
  const router = useRouter();
  const slug = useSearchParams().get('slug') || '';
  useEffect(() => {
    if (slug) router.replace(`/post/${encodeURIComponent(slug)}`);
  }, [router, slug]);
  return <main className="feed-loading">{slug ? 'Opening story…' : <><p>This story link is incomplete.</p><Link href="/discover">Discover stories</Link></>}</main>;
}
