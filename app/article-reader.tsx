import Image from 'next/image';
import Link from 'next/link';
import {articleCopy} from '../lib/i18n/article';
import {absoluteUrl,dictionary,languageNames,localePath,topicLabel} from '../lib/i18n/locales';
import {jsonLd,postPath,translationsFor,type LocalizedPost} from '../lib/i18n/post-links';
import {articleSummary,prepareArticleContent,readingStats,relatedArticles} from '../lib/article-presentation';
import {uiText} from '../lib/i18n/ui';
import {categoryPath} from './categories';
import {Comments} from './(legacy)/article/comments';
import {LikeButton} from './like-button';
import {SaveButton} from './save-button';
import {ShareButton} from './share-button';

export function ArticleReader({post,posts}:{post:LocalizedPost;posts:LocalizedPost[]}){
 const lang=post.language,t=dictionary(lang),copy=articleCopy(lang);
 const {html,toc}=prepareArticleContent(post.content),stats=readingStats(post);
 const translations=translationsFor(post,posts),related=relatedArticles(post,posts);
 const url=absoluteUrl(postPath(post)),authorUrl='/author/?name='+encodeURIComponent(post.author),category=categoryPath(lang,post.category_name);
 const formatDate=(date:string)=>new Date(date).toLocaleDateString(lang,{dateStyle:'long',timeZone:'UTC'});
 const updated=post.updated_at&&Date.parse(post.updated_at)>Date.parse(post.published_at)?post.updated_at:undefined;
 const breadcrumb={'@type':'BreadcrumbList','@id':url+'#breadcrumbs',itemListElement:[
  {'@type':'ListItem',position:1,name:t.home,item:absoluteUrl(localePath(lang))},
  {'@type':'ListItem',position:2,name:topicLabel(lang,post.category_name),item:absoluteUrl(category)},
  {'@type':'ListItem',position:3,name:post.title,item:url},
 ]};
 const schema={'@context':'https://schema.org','@graph':[
  {'@type':'WebPage','@id':url,url,name:post.title,description:articleSummary(post),inLanguage:lang,breadcrumb:{'@id':url+'#breadcrumbs'},mainEntity:{'@id':url+'#article'},relatedLink:related.map(item=>absoluteUrl(postPath(item)))},
  {'@type':'BlogPosting','@id':url+'#article',headline:post.title,description:articleSummary(post),inLanguage:lang,datePublished:post.published_at,dateModified:post.updated_at||post.published_at,mainEntityOfPage:{'@id':url},author:{'@type':post.author==='REZAN AI Editorial'?'Organization':'Person',name:post.author,url:absoluteUrl(authorUrl)},publisher:{'@type':'Organization',name:'REZAN',url:absoluteUrl('/'),logo:{'@type':'ImageObject',url:absoluteUrl('/favicon.svg')}},image:post.image_url?[post.image_url]:undefined,articleSection:post.category_name,wordCount:stats.wordCount,isAccessibleForFree:true},
  breadcrumb,
 ]};
 return <main className="reader-page">
  <div className="reader-container">
   <nav className="reader-breadcrumbs" aria-label={copy.breadcrumb}><Link href={localePath(lang)}>{t.home}</Link><span aria-hidden="true">/</span><Link href={category}>{topicLabel(lang,post.category_name)}</Link><span aria-hidden="true">/</span><span aria-current="page">{post.title}</span></nav>
   <div className="reader-layout">
    <article className="reader-article" aria-labelledby="reader-title">
     <header className="reader-header">
      <Link className="reader-topic" href={category}><span aria-hidden="true"/>{topicLabel(lang,post.category_name)}</Link>
      <h1 id="reader-title">{post.title}</h1>
      {post.excerpt&&<p className="reader-lead">{post.excerpt}</p>}
      <div className="reader-byline"><Link href={authorUrl} className="reader-avatar" aria-label={post.author}>{Array.from(post.author)[0]}</Link><div><Link href={authorUrl} className="reader-author">{post.author}</Link><p><span>{t.published} <time dateTime={post.published_at}>{formatDate(post.published_at)}</time></span><span className="reader-duration">{new Intl.NumberFormat(lang).format(stats.minutes)} {copy.minRead}</span></p>{updated&&<small>{copy.updated} <time dateTime={updated}>{formatDate(updated)}</time></small>}</div><SaveButton slug={post.slug} compact/></div>
      {translations.length>1&&<details className="reader-languages"><summary>{t.languages}<span>{languageNames[lang]}</span></summary><nav aria-label={t.languages}>{translations.map(item=><Link key={item.slug} href={postPath(item)} hrefLang={item.language} lang={item.language} aria-current={item.language===lang?'page':undefined}>{languageNames[item.language]}</Link>)}</nav></details>}
      {toc.length>0&&<details className="reader-inline-toc"><summary>{copy.contents}</summary><nav aria-label={copy.contents}><ol>{toc.map(item=><li key={item.id}><a href={'#'+item.id}>{item.label}</a></li>)}</ol></nav></details>}
     </header>
     {post.image_url&&<figure className="reader-figure"><Image src={post.image_url} alt={post.image_alt||post.title} width={1200} height={675} sizes="(max-width: 740px) 100vw, (max-width: 1100px) 85vw, 780px" priority/>{post.image_alt&&<figcaption>{post.image_alt}</figcaption>}</figure>}
     <div className="reader-content" dangerouslySetInnerHTML={{__html:html}}/>
     <div className="reader-actions story-social"><LikeButton slug={post.slug} showDislike={false}/><a className="comment-action" href="#discussion"><i className="comment-icon" aria-hidden="true"/>{uiText(lang,'Comment')}</a><ShareButton title={post.title} url={postPath(post)}/></div>
     <div id="discussion" className="reader-discussion"><Comments slug={post.slug}/></div>
    </article>
    <aside className="reader-sidebar">
     {toc.length>0&&<nav className="reader-toc" aria-label={copy.contents}><h2>{copy.contents}</h2><ol>{toc.map(item=><li key={item.id} className={item.level===3?'reader-toc-sub':undefined}><a href={'#'+item.id}>{item.label}</a></li>)}</ol></nav>}
     <section className="reader-explore"><span className="reader-explore-icon" aria-hidden="true">↗</span><h2>{copy.topic}</h2><p>{topicLabel(lang,post.category_name)}</p><Link href={category}>{t.more}<span aria-hidden="true"> →</span></Link></section>
     <Link className="reader-writer" href={authorUrl}><span className="reader-avatar" aria-hidden="true">{Array.from(post.author)[0]}</span><span><small>{copy.author}</small><strong>{post.author}</strong></span><span aria-hidden="true">↗</span></Link>
     <Link className="reader-back" href={localePath(lang)}><span aria-hidden="true">← </span>{copy.back}</Link>
    </aside>
   </div>
   {related.length>0&&<section className="reader-related" aria-labelledby="reader-more"><header><div><span>{copy.explore}</span><h2 id="reader-more">{t.more}</h2></div><Link href={category}>{topicLabel(lang,post.category_name)} <span aria-hidden="true">→</span></Link></header><div className="reader-card-grid">{related.map(item=><article className="reader-card" key={item.slug}><Link href={postPath(item)} className="reader-card-cover" aria-label={item.title} tabIndex={-1}>{item.image_url?<Image src={item.image_url} alt={item.image_alt||item.title} width={480} height={300} sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 360px"/>:<span className="reader-card-art" aria-hidden="true"><i/>{topicLabel(lang,item.category_name).slice(0,1)}</span>}</Link><div className="reader-card-body"><Link className="reader-card-topic" href={categoryPath(lang,item.category_name)}>{topicLabel(lang,item.category_name)}</Link><h3><Link href={postPath(item)}>{item.title}</Link></h3><p>{item.excerpt}</p><footer><Link href={'/author/?name='+encodeURIComponent(item.author)}>{item.author}</Link><time dateTime={item.published_at}>{new Date(item.published_at).toLocaleDateString(lang,{dateStyle:'medium',timeZone:'UTC'})}</time></footer></div></article>)}</div></section>}
  </div>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(schema)}}/>
 </main>;
}
