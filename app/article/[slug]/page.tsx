import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { posts } from '../../posts';
import { Comments } from '../comments';
import { FollowButton } from '../../follow-button';
import { LikeButton } from '../../like-button';
import { SaveButton } from '../../save-button';
import { ShareButton } from '../../share-button';

const SITE=process.env.NEXT_PUBLIC_SITE_URL||'https://rezantech.web.app';
export function generateStaticParams(){return posts.map(({slug})=>({slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const p=posts.find(x=>x.slug===slug);if(!p)return {};return{title:p.title,description:p.excerpt,alternates:{canonical:`/article/${p.slug}`},authors:[{name:p.author,url:`${SITE}/author/?name=${encodeURIComponent(p.author)}`}],openGraph:{type:'article',url:`/article/${p.slug}`,title:p.title,description:p.excerpt,publishedTime:'2026-08-02',section:p.category,authors:[p.author]},twitter:{card:'summary_large_image',title:p.title,description:p.excerpt}}}

export default async function Article({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;const p=posts.find(x=>x.slug===slug);if(!p)notFound();
  const related=posts.filter(x=>x.slug!==p.slug).sort((a,b)=>Number(b.category===p.category)-Number(a.category===p.category)).slice(0,4);
  const schema={"@context":"https://schema.org","@type":"BlogPosting",headline:p.title,description:p.excerpt,author:{"@type":"Person",name:p.author,url:`${SITE}/author/?name=${encodeURIComponent(p.author)}`},publisher:{"@type":"Organization",name:"RezanTech",url:SITE},datePublished:"2026-08-02",dateModified:"2026-08-02",articleSection:p.category,mainEntityOfPage:`${SITE}/article/${p.slug}`};
  const breadcrumbs={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:SITE},{"@type":"ListItem",position:2,name:p.category,item:`${SITE}/search/?q=${encodeURIComponent(p.category)}`},{"@type":"ListItem",position:3,name:p.title,item:`${SITE}/article/${p.slug}`}]};
  return <main className="db-story social-story seo-story editorial-story">
    <nav className="story-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><Link href={`/search/?q=${encodeURIComponent(p.category)}`}>{p.category}</Link><span>›</span><em>{p.title}</em></nav>
    <div className="story-shell"><article>
      <Link className="story-topic" href={`/search/?q=${encodeURIComponent(p.category)}`}>{p.category}</Link>
      <h1>{p.title}</h1><p className="lead">{p.excerpt}</p>
      <div className="story-author"><Link href={`/author/?name=${encodeURIComponent(p.author)}`}><span>{p.author[0]}</span></Link><div><Link href={`/author/?name=${encodeURIComponent(p.author)}`}><b>{p.author}</b></Link><small>{p.date} · {p.readTime}</small></div><FollowButton author={p.author}/></div>
      <div className="story-social"><LikeButton slug={p.slug}/><a className="comment-action" href="#discussion"><i className="comment-icon"/>Discuss</a><SaveButton slug={p.slug}/><ShareButton url={`/article/${p.slug}`} title={p.title}/></div>
      <div className={`article-art editorial-cover ${p.accent}`} role="img" aria-label={`${p.category} illustration`}><b>REZAN / {p.category.toUpperCase()}</b><i/></div>
      <div className="db-body">{p.content.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
      <section className="related-stories"><header><div><span>KEEP READING</span><h2>More stories you may like</h2></div><Link href="/discover">Explore all →</Link></header><div>{related.map(item=><article key={item.slug}><Link className={`related-image editorial-related-art ${item.accent}`} href={`/article/${item.slug}`}><span>{item.category[0]}</span></Link><div><small>{item.author===p.author?'MORE FROM THIS WRITER':item.category}</small><Link href={`/article/${item.slug}`}><h3>{item.title}</h3><p>{item.excerpt}</p></Link><footer><Link href={`/author/?name=${encodeURIComponent(item.author)}`}>{item.author}</Link><span>{item.readTime}</span></footer></div></article>)}</div></section>
      <div id="discussion"><Comments slug={p.slug}/></div>
    </article><aside><Link href="/">← Back to your feed</Link><h3>Explore this topic</h3><p>Find more reporting and community perspectives about <b>{p.category}</b>.</p><Link className="story-aside-link" href={`/search/?q=${encodeURIComponent(p.category)}`}>More in {p.category} →</Link><h3>More from the writer</h3><Link className="story-aside-link" href={`/author/?name=${encodeURIComponent(p.author)}`}>View {p.author}’s profile →</Link><h3>Keep exploring</h3><Link className="story-aside-link" href="/discover">Discover trending stories →</Link></aside></div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbs)}}/>
  </main>;
}
