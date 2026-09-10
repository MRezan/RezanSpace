import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Comments } from '../../article/comments';
import { FollowButton } from '../../follow-button';
import { LikeButton } from '../../like-button';
import { SaveButton } from '../../save-button';
import { ShareButton } from '../../share-button';
import { LivePostBody, LivePostHeader } from '../live-post-text';

export const dynamic = 'force-static';
export const dynamicParams = false;

const API = process.env.NEXT_PUBLIC_API_URL || 'http://rezan.space';
const BUILD_API = process.env.REZAN_BUILD_API_URL || API;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://rezan.space';
type Related = { id:number;slug:string;title:string;excerpt:string;image_url:string;author:string;published_at:string;category_name:string;like_count:number;comment_count:number };
type Post = Related & { content:string; related:Related[]; updated_at?:string };

function deployAssetUrl(value:string) {
  return value.replace(/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i,API);
}

function deployPostAssets(post:Post):Post {
  return {...post,image_url:deployAssetUrl(post.image_url||''),related:(post.related||[]).map(item=>({...item,image_url:deployAssetUrl(item.image_url||'')}))};
}

function seoDescription(value:string) {
  const text=value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  if(text.length<=160)return text;
  const shortened=text.slice(0,157).replace(/\s+\S*$/,'').replace(/[,:;\s]+$/,'');
  return `${shortened}…`;
}

async function getPost(slug:string):Promise<Post|null> {
  try {
    const response = await fetch(`${BUILD_API}/api/posts.php?slug=${encodeURIComponent(slug)}`, { cache:'no-store' });
    return response.ok ? deployPostAssets(await response.json()) : null;
  } catch { return null; }
}

export async function generateStaticParams() {
  try {
    const first=await fetch(`${BUILD_API}/api/posts.php?page=1&limit=25`,{cache:'no-store'}).then(response=>response.json());
    const pageCount=Math.max(1,Math.ceil(Number(first.pagination?.total||0)/25));
    const remaining=pageCount>1?await Promise.all(Array.from({length:pageCount-1},(_,index)=>index+2).map(page=>fetch(`${BUILD_API}/api/posts.php?page=${page}&limit=25`,{cache:'no-store'}).then(response=>response.json()))):[];
    return [first,...remaining].flatMap(page=>page.data||[]).map((post:{slug:string})=>({slug:post.slug}));
  } catch { return []; }
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
  const {slug}=await params;
  const post=await getPost(slug);
  if(!post)return {};
  const canonical=`/post/${post.slug}/`;
  const description=seoDescription(post.excerpt);
  const publicImage=post.image_url&&!/localhost|127\.0\.0\.1/.test(post.image_url)?post.image_url:undefined;
  return {
    title:post.title,
    description,
    keywords:[post.category_name,`${post.category_name} stories`,post.author,'independent writing','REZAN'],
    alternates:{canonical},
    authors:[{name:post.author,url:`${SITE}/author/?name=${encodeURIComponent(post.author)}`}],
    openGraph:{type:'article',url:canonical,title:post.title,description,publishedTime:post.published_at,modifiedTime:post.updated_at||post.published_at,section:post.category_name,authors:[post.author],images:publicImage?[{url:publicImage,alt:post.title}]:undefined},
    twitter:{card:'summary_large_image',title:post.title,description,images:publicImage?[publicImage]:undefined},
    robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}},
  };
}

export default async function PostPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const post=await getPost(slug);
  if(!post)notFound();
  const related=post.related||[];
  const contentText=post.content.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const readMinutes=Math.max(1,Math.ceil(contentText.split(' ').filter(Boolean).length/220));
  const canonicalUrl=`${SITE}/post/${post.slug}/`;
  const publicImage=post.image_url&&!/localhost|127\.0\.0\.1/.test(post.image_url)?post.image_url:undefined;
  const schema={
    '@context':'https://schema.org','@type':'BlogPosting',headline:post.title,description:seoDescription(post.excerpt),
    datePublished:post.published_at,dateModified:post.updated_at||post.published_at,mainEntityOfPage:{'@type':'WebPage','@id':canonicalUrl},
    author:{'@type':'Person',name:post.author,url:`${SITE}/author/?name=${encodeURIComponent(post.author)}`},
    publisher:{'@type':'Organization',name:'REZAN',url:SITE},articleSection:post.category_name,
    image:publicImage?[publicImage]:undefined,wordCount:contentText.split(' ').filter(Boolean).length,inLanguage:'en',isAccessibleForFree:true,
  };
  const breadcrumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'Home',item:SITE},
    {'@type':'ListItem',position:2,name:post.category_name,item:`${SITE}/search/?q=${encodeURIComponent(post.category_name)}`},
    {'@type':'ListItem',position:3,name:post.title,item:canonicalUrl},
  ]};
  return <main className="db-story social-story seo-story">
    <nav className="story-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><Link href={`/search/?q=${encodeURIComponent(post.category_name)}`}>{post.category_name}</Link><span>›</span><em>{post.title}</em></nav>
    <div className="story-shell"><article className="story-article">
      <header className="story-header"><Link className="story-topic" href={`/search/?q=${encodeURIComponent(post.category_name)}`}>{post.category_name}</Link>
      <LivePostHeader slug={slug} initial={{title:post.title,excerpt:post.excerpt,content:post.content}}/>
      <div className="story-author"><Link href={`/author/?name=${encodeURIComponent(post.author)}`} aria-label={`View ${post.author}'s profile`}><span>{post.author[0]}</span></Link><div><Link href={`/author/?name=${encodeURIComponent(post.author)}`}><b>{post.author}</b></Link><small><time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}</time><i aria-hidden="true">•</i>{readMinutes} min read</small></div><FollowButton author={post.author}/></div></header>
      <div className="story-social"><LikeButton slug={slug}/><a className="comment-action" href="#discussion"><i className="comment-icon"/>Discuss</a><SaveButton slug={slug}/><ShareButton title={post.title}/></div>
      {post.image_url&&<img className="story-cover" src={post.image_url} alt={post.title}/>} 
      <LivePostBody slug={slug} initial={{title:post.title,excerpt:post.excerpt,content:post.content}}/>
      {related.length>0&&<RelatedStories stories={related} author={post.author}/>} 
      <div id="discussion"><Comments slug={slug}/></div>
    </article><aside><Link href="/">← Back to your feed</Link><h3>Explore this topic</h3><p>Find more reporting and community perspectives about <b>{post.category_name}</b>.</p><Link className="story-aside-link" href={`/search/?q=${encodeURIComponent(post.category_name)}`}>More in {post.category_name} →</Link><h3>More from the writer</h3><Link className="story-aside-link" href={`/author/?name=${encodeURIComponent(post.author)}`}>View {post.author}’s profile →</Link><h3>Keep exploring</h3><Link className="story-aside-link" href="/discover">Discover trending stories →</Link></aside></div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbs)}}/>
  </main>;
}

function RelatedStories({stories,author}:{stories:Related[];author:string}) {
  return <section className="related-stories"><header><div><span>KEEP READING</span><h2>More stories you may like</h2></div><Link href="/discover">Explore all →</Link></header><div>{stories.map(story=><article key={story.slug}><Link className="related-image" href={`/post/${story.slug}`}>{story.image_url?<img src={story.image_url} alt={story.title}/>:<span>{story.title[0]}</span>}</Link><div><small>{story.author===author?'MORE FROM THIS WRITER':story.category_name}</small><Link href={`/post/${story.slug}`}><h3>{story.title}</h3><p>{story.excerpt}</p></Link><footer><Link href={`/author/?name=${encodeURIComponent(story.author)}`}>{story.author}</Link><span>{story.like_count||0} likes · {story.comment_count||0} comments</span></footer></div></article>)}</div></section>;
}
