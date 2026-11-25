import {categories,categoryMatches,categoryPath} from './categories';
import {posts as editorialPosts} from './posts';
import type {MetadataRoute} from 'next';
import {absoluteUrl,locales,localePath} from '../lib/i18n/locales';
import {getPublishedPosts,postPath} from '../lib/i18n/posts';

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const posts=await getPublishedPosts();
 const groupKey=(post:typeof posts[number])=>post.translation_key?'group:'+post.translation_key:'slug:'+post.slug;
 const groups=new Map<string,typeof posts>();
 for(const post of posts){
  const key=groupKey(post),values=groups.get(key)||[];
  values.push(post);groups.set(key,values);
 }
 return [
  // Editorial aliases under /en/article/ canonicalize to these original URLs.
  ...editorialPosts.map(post=>({url:absoluteUrl(`/article/${post.slug}/`)})),
  ...locales.map(lang=>({url:absoluteUrl(localePath(lang)),alternates:{languages:{
   ...Object.fromEntries(locales.map(locale=>[locale,absoluteUrl(localePath(locale))])),
   'x-default':absoluteUrl('/'),
  }}})),
  ...locales.flatMap(lang=>categories.filter(category=>posts.some(post=>post.language===lang&&categoryMatches(category,post.category_name))).map(category=>({
   url:absoluteUrl(categoryPath(lang,category)),
   lastModified:new Date(Math.max(...posts.filter(post=>post.language===lang&&categoryMatches(category,post.category_name)).map(post=>new Date(post.updated_at||post.published_at).getTime()))),
  }))),
  ...posts.map(post=>{
   const translations=groups.get(groupKey(post))||[post];
   const fallback=translations.find(item=>item.language==='en')||translations[0];
   return {
    url:absoluteUrl(postPath(post)),
    ...(post.updated_at||post.published_at?{lastModified:new Date(post.updated_at||post.published_at)}:{}),
    alternates:{languages:{
     ...Object.fromEntries(translations.map(item=>[item.language,absoluteUrl(postPath(item))])),
     'x-default':absoluteUrl(postPath(fallback)),
    }},
   };
  }),
 ];
}
