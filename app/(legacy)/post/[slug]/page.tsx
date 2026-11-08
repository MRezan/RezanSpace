import {notFound} from 'next/navigation';
import {getPublishedPosts} from '../../../../lib/i18n/posts';
import {articleMetadata} from '../../../../lib/article-presentation';
import {ArticleReader} from '../../../article-reader';
export const dynamic='force-static';
export const dynamicParams=false;
type Params=Promise<{slug:string}>;
export async function generateStaticParams(){return (await getPublishedPosts()).map(post=>({slug:post.slug}));}
async function findPost(params:Params){const {slug}=await params;const posts=await getPublishedPosts();const post=posts.find(item=>item.slug===slug);if(!post)notFound();return {post,posts};}
export async function generateMetadata({params}:{params:Params}){const {post,posts}=await findPost(params);return articleMetadata(post,posts);}
export default async function PostPage({params}:{params:Params}){return <ArticleReader {...await findPost(params)}/>;}
