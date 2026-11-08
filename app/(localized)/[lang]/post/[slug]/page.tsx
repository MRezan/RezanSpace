import {notFound} from 'next/navigation';
import {isLocale} from '../../../../../lib/i18n/locales';
import {getPublishedPosts} from '../../../../../lib/i18n/posts';
import {articleMetadata} from '../../../../../lib/article-presentation';
import {ArticleReader} from '../../../../article-reader';
export const dynamicParams=false;
type Params=Promise<{lang:string;slug:string}>;
export async function generateStaticParams(){return (await getPublishedPosts()).map(post=>({lang:post.language,slug:post.slug}));}
async function findPost(params:Params){
 const {lang,slug}=await params;if(!isLocale(lang))notFound();
 const posts=await getPublishedPosts();const post=posts.find(item=>item.language===lang&&item.slug===slug);
 if(!post)notFound();return {post,posts};
}
export async function generateMetadata({params}:{params:Params}){const {post,posts}=await findPost(params);return articleMetadata(post,posts);}
export default async function LanguagePost({params}:{params:Params}){return <ArticleReader {...await findPost(params)}/>;}
