import type {MetadataRoute} from 'next';

export const dynamic='force-static';

export default function robots():MetadataRoute.Robots {
  const base=process.env.NEXT_PUBLIC_SITE_URL||'https://rezantech.web.app';
  return {
    rules:{userAgent:'*',allow:'/',disallow:['/admin','/account','/profile','/library','/create','/story']},
    sitemap:`${base}/sitemap.xml`,
  };
}
