'use client';

import {useEffect,useState} from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'http://rezan.space';
type TextState={title:string;excerpt:string;content:string};

function displayContent(content:string){
 // A citation label followed by a link is supporting content, not a heading.
 return content.replace(/<h([23])[^>]*>([\s\S]*?<a\b[\s\S]*?<\/a>[\s\S]*?)<\/h\1>/gi,(_match,_level,inner)=>
  `<p class="reference-entry">${inner}</p>`
 );
}

function useLivePost(slug:string,initial:TextState){
 const [post,setPost]=useState(initial);
 useEffect(()=>{const controller=new AbortController();fetch(`${API}/api/posts.php?slug=${encodeURIComponent(slug)}&fresh=${Date.now()}`,{cache:'no-store',signal:controller.signal}).then(response=>response.ok?response.json():null).then(data=>data&&setPost({title:data.title,excerpt:data.excerpt,content:data.content})).catch(error=>{if(error.name!=='AbortError')return});return()=>controller.abort()},[slug]);
 return post;
}

export function LivePostHeader({slug,initial}:{slug:string;initial:TextState}){
 const post=useLivePost(slug,initial);
 const contentText=post.content.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const summary=post.excerpt.replace(/\s+/g,' ').trim();
 const summaryStem=summary.replace(/(?:\.\.\.|…)+$/,'').trim();
 // Automatically generated excerpts repeat the opening of the article. Only
 // render a lead when the writer supplied a genuinely distinct introduction.
 const showSummary=summary.length>0&&summary.length<=360&&summaryStem.length>0&&!contentText.toLocaleLowerCase().startsWith(summaryStem.toLocaleLowerCase());
 return <><h1>{post.title}</h1>{showSummary&&<p className="lead">{summary}</p>}</>;
}

export function LivePostBody({slug,initial}:{slug:string;initial:TextState}){const post=useLivePost(slug,initial);return <div className="db-body" dangerouslySetInnerHTML={{__html:displayContent(post.content)}}/>}
