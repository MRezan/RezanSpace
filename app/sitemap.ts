import {posts as editorialPosts} from './posts';
import type {MetadataRoute} from 'next';
import {absoluteUrl,locales,localePath} from '../lib/i18n/locales';
import {getPublishedPosts,postPath,translationsFor} from '../lib/i18n/posts';
export const dynamic='force-static';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const posts=await getPublishedPosts();return [{url:absoluteUrl('/')},...editorialPosts.map(post=>({url:absoluteUrl(`/en/article/${post.slug}/`)})),...locales.map(lang=>({url:absoluteUrl(localePath(lang)),alternates:{languages:{...Object.fromEntries(locales.map(locale=>[locale,absoluteUrl(localePath(locale))])),'x-default':absoluteUrl('/')}}})),...posts.map(post=>({url:absoluteUrl(postPath(post)),...(post.updated_at||post.published_at?{lastModified:new Date(post.updated_at||post.published_at)}:{}),alternates:{languages:Object.fromEntries(translationsFor(post,posts).map(item=>[item.language,absoluteUrl(postPath(item))]))}}))];}
