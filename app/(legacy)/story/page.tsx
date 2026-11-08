'use client';

import Link from 'next/link';
import {StorySkeleton} from '../../story-skeleton';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-static';

export default function StoryRedirect() {
  return <Suspense fallback={<StorySkeleton/>}><Redirect /></Suspense>;
}

function Redirect() {
  const router = useRouter();
  const slug = useSearchParams().get('slug') || '';
  useEffect(() => {
    if (slug) router.replace(`/post/${encodeURIComponent(slug)}`);
  }, [router, slug]);
  return slug?<StorySkeleton/>:<main className="feed-loading"><p>This story link is incomplete.</p><Link href="/discover">Discover stories</Link></main>;
}
