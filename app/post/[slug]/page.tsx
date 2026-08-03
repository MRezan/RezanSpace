import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Comments } from '../../article/comments';
import { FollowButton } from '../../follow-button';
import { LikeButton } from '../../like-button';
import { SaveButton } from '../../save-button';
import { ShareButton } from '../../share-button';

export const dynamic = 'force-static';
export const dynamicParams = false;

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://rezantech.web.app';
type Related = { id:number;slug:string;title:string;excerpt:string;image_url:string;author:string;published_at:string;category_name:string;like_count:number;comment_count:number };
type Post = Related & { content:string; related:Related[] };

async function getPost(slug:string):Promise<Post|null> {
  try {
    const response = await fetch(`${API}/api/posts.php?slug=${encodeURIComponent(slug)}`, { cache:'force-cache' });
    return response.ok ? response.json() : null;
  } catch { return null; }
}

export async function generateStaticParams() {
  try {
    const first=await fetch(`${API}/api/posts.php?page=1&limit=25`,{cache:'no-store'}).then(response=>response.json());
    const pageCount=Math.max(1,Math.ceil(Number(first.pagination?.total||0)/25));
    const remaining=pageCount>1?await Promise.all(Array.from({length:pageCount-1},(_,index)=>index+2).map(page=>fetch(`${API}/api/posts.php?page=${page}&limit=25`,{cache:'no-store'}).then(response=>response.json()))):[];
    return [first,...remaining].flatMap(page=>page.data||[]).map((post:{slug:string})=>({slug:post.slug}));
  } catch { return []; }
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
  const {slug}=await params;
  const post=await getPost(slug);
  if(!post)return {};
  const canonical=`/post/${post.slug}`;
  const publicImage=post.image_url&&!/localhost|127\.0\.0\.1/.test(post.image_url)?post.image_url:undefined;
  return {
    title:post.title,
    description:post.excerpt,
    alternates:{canonical},
    authors:[{name:post.author,url:`${SITE}/author/?name=${encodeURIComponent(post.author)}`}],
    openGraph:{type:'article',url:canonical,title:post.title,description:post.excerpt,publishedTime:post.published_at,section:post.category_name,authors:[post.author],images:publicImage?[{url:publicImage,alt:post.title}]:undefined},
    twitter:{card:'summary_large_image',title:post.title,description:post.excerpt,images:publicImage?[publicImage]:undefined},
  };
}

export default async function PostPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const post=await getPost(slug);
  if(!post)notFound();
  const related=post.related||[];
  const schema={
    '@context':'https://schema.org','@type':'BlogPosting',headline:post.title,description:post.excerpt,
    datePublished:post.published_at,dateModified:post.published_at,mainEntityOfPage:`${SITE}/post/${post.slug}`,
    author:{'@type':'Person',name:post.author,url:`${SITE}/author/?name=${encodeURIComponent(post.author)}`},
    publisher:{'@type':'Organization',name:'RezanTech',url:SITE},articleSection:post.category_name,
  };
  const breadcrumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'Home',item:SITE},
    {'@type':'ListItem',position:2,name:post.category_name,item:`${SITE}/search/?q=${encodeURIComponent(post.category_name)}`},
    {'@type':'ListItem',position:3,name:post.title,item:`${SITE}/post/${post.slug}`},
  ]};
  return <main className="db-story social-story seo-story">
    <nav className="story-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><Link href={`/search/?q=${encodeURIComponent(post.category_name)}`}>{post.category_name}</Link><span>›</span><em>{post.title}</em></nav>
    <div className="story-shell"><article>
      <Link className="story-topic" href={`/search/?q=${encodeURIComponent(post.category_name)}`}>{post.category_name}</Link>
      <h1>{post.title}</h1><p className="lead">{post.excerpt}</p>
      <div className="story-author"><Link href={`/author/?name=${encodeURIComponent(post.author)}`}><span>{post.author[0]}</span></Link><div><Link href={`/author/?name=${encodeURIComponent(post.author)}`}><b>{post.author}</b></Link><small>{new Date(post.published_at).toLocaleDateString()} · 6 min read</small></div><FollowButton author={post.author}/></div>
      <div className="story-social"><LikeButton slug={slug}/><a className="comment-action" href="#discussion"><i className="comment-icon"/>Discuss</a><SaveButton slug={slug}/><ShareButton title={post.title}/></div>
      {post.image_url&&<img className="story-cover" src={post.image_url} alt={post.title}/>} 
      <div className="db-body">{String(post.content).split('\n').map((paragraph,index)=>paragraph&&<p key={index}>{paragraph}</p>)}</div>
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
