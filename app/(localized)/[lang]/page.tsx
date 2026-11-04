import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {absoluteUrl,dictionary,isLocale,locales,localePath,ogLocales} from '../../../lib/i18n/locales';
import {getPublishedPosts,jsonLd,postPath} from '../../../lib/i18n/posts';
import {SocialFeed} from '../../social-feed';
export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata>{const {lang}=await params;if(!isLocale(lang))notFound();const t=dictionary(lang);return {title:`REZAN — ${t.title}`,description:t.description,alternates:{canonical:localePath(lang),languages:{...Object.fromEntries(locales.map(locale=>[locale,absoluteUrl(localePath(locale))])),'x-default':absoluteUrl('/')}},openGraph:{type:'website',url:localePath(lang),locale:ogLocales[lang],title:`REZAN — ${t.title}`,description:t.description},twitter:{card:'summary',title:`REZAN — ${t.title}`,description:t.description}};}
export default async function LanguageHome({params}:{params:Promise<{lang:string}>}){const {lang}=await params;if(!isLocale(lang))notFound();const t=dictionary(lang);const posts=(await getPublishedPosts()).filter(post=>post.language===lang);const schema={'@context':'https://schema.org','@type':'CollectionPage',name:t.title,description:t.description,inLanguage:lang,url:absoluteUrl(localePath(lang)),mainEntity:{'@type':'ItemList',itemListElement:posts.map((post,index)=>({'@type':'ListItem',position:index+1,url:absoluteUrl(postPath(post)),name:post.title}))}};return <><h1 className="sr-only">{t.title}</h1><SocialFeed locale={lang} initialPosts={posts}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(schema)}}/></>;}

export function generateStaticParams(){return locales.map(lang=>({lang}));}
