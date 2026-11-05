import Link from 'next/link';
import Image from 'next/image';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {categories,categoryMatches,categoryPath,categorySlug} from '../../../../categories';
import {absoluteUrl,dictionary,isLocale,locales,localePath,ogLocales,topicLabel} from '../../../../../lib/i18n/locales';
import {getPublishedPosts,jsonLd,postPath} from '../../../../../lib/i18n/posts';

type Params=Promise<{lang:string;category:string}>;
export const dynamicParams=false;
export function generateStaticParams(){return locales.flatMap(lang=>categories.map(category=>({lang,category:categorySlug(category)})));}
async function data(params:Params){
 const {lang,category:slug}=await params;if(!isLocale(lang))notFound();
 const category=categories.find(name=>categorySlug(name)===slug);if(!category)notFound();
 const all=await getPublishedPosts();
 const posts=all.filter(post=>post.language===lang&&categoryMatches(category,post.category_name));
 const languages=locales.filter(locale=>all.some(post=>post.language===locale&&categoryMatches(category,post.category_name)));
 return {lang,category,posts,languages};
}
export async function generateMetadata({params}:{params:Params}):Promise<Metadata>{
 const {lang,category,posts,languages}=await data(params);const t=dictionary(lang);const title=`${topicLabel(lang,category)} — ${t.title}`;const url=categoryPath(lang,category);
 return {title,description:t.description,alternates:{canonical:url,languages:Object.fromEntries(languages.map(locale=>[locale,absoluteUrl(categoryPath(locale,category))]))},robots:{index:posts.length>0,follow:true},openGraph:{type:'website',title,description:t.description,url,locale:ogLocales[lang]},twitter:{card:'summary',title,description:t.description}};
}
export default async function CategoryPage({params}:{params:Params}){
 const {lang,category,posts}=await data(params);const t=dictionary(lang);const title=topicLabel(lang,category);const url=absoluteUrl(categoryPath(lang,category));
 const schema={'@context':'https://schema.org','@type':'CollectionPage',name:title,inLanguage:lang,url,mainEntity:{'@type':'ItemList',itemListElement:posts.map((post,index)=>({'@type':'ListItem',position:index+1,name:post.title,url:absoluteUrl(postPath(post))}))}};
 const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:t.home,item:absoluteUrl(localePath(lang))},{'@type':'ListItem',position:2,name:title,item:url}]};
 return <main className="language-main category-page"><nav className="category-breadcrumb" aria-label={t.home}><Link href={localePath(lang)}>{t.home}</Link><span>/</span><span>{title}</span></nav><header className="language-intro"><span className="kicker">{t.allTopics}</span><h1>{title}</h1><p>{t.description}</p></header><nav className="category-links" aria-label={t.allTopics}>{categories.map(name=><Link key={name} href={categoryPath(lang,name)} aria-current={name===category?'page':undefined}>{topicLabel(lang,name)}</Link>)}</nav>{posts.length?<section className="language-grid">{posts.map(post=><article className="language-card" key={post.slug}>{post.image_url&&<Link href={postPath(post)}><Image src={post.image_url} alt={post.image_alt||post.title} width={640} height={360} loading="lazy"/></Link>}<div><small>{topicLabel(lang,post.category_name)}</small><h2><Link href={postPath(post)}>{post.title}</Link></h2><p>{post.excerpt}</p><footer><span>{post.author}</span><time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString(lang,{dateStyle:'medium',timeZone:'UTC'})}</time></footer><Link className="language-read" href={postPath(post)}>{t.read} →</Link></div></article>)}</section>:<section className="language-empty"><h2>{t.empty}</h2><p>{t.emptyHint}</p></section>}<script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(schema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(breadcrumb)}}/></main>;
}
