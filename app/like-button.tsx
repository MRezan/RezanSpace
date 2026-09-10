'use client';
import {useEffect,useState} from 'react';
const API=process.env.NEXT_PUBLIC_API_URL||'http://rezan.space';
type Reaction='like'|'dislike'|null;

export function LikeButton({slug,initialCount=0,compact=false}:{slug:string;initialCount?:number;compact?:boolean}){
  const [reaction,setReaction]=useState<Reaction>(null),[busy,setBusy]=useState(false);
  function sync(data:{reaction?:Reaction;likes?:number;dislikes?:number}){const nextLikes=Number(data.likes??initialCount),nextDislikes=Number(data.dislikes||0);setReaction(data.reaction||null);window.dispatchEvent(new CustomEvent('rezantech:engagement',{detail:{slug,likes:nextLikes,dislikes:nextDislikes}}))}
  useEffect(()=>{const token=localStorage.getItem('rezantech_session');fetch(`${API}/api/likes.php?slug=${encodeURIComponent(slug)}`,{headers:token?{Authorization:`Bearer ${token}`}:{}}).then(response=>response.ok?response.json():null).then(data=>data&&sync(data)).catch(()=>null)},[slug]);
  async function choose(value:'like'|'dislike'){const token=localStorage.getItem('rezantech_session');if(!token){location.href='/account';return}setBusy(true);try{const response=await fetch(`${API}/api/likes.php`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({slug,reaction:value})});if(response.ok)sync(await response.json())}finally{setBusy(false)}}
  return <div className={`reaction-buttons ${compact?'compact':''}`} aria-label="Story reactions">
    <button type="button" className={`like-story ${reaction==='like'?'liked':''}`} onClick={()=>choose('like')} disabled={busy} aria-pressed={reaction==='like'} aria-label={reaction==='like'?'Remove like':'Like story'}><span className="like-icon" aria-hidden="true"/>{!compact&&<em>Like</em>}</button>
    <button type="button" className={`dislike-story ${reaction==='dislike'?'disliked':''}`} onClick={()=>choose('dislike')} disabled={busy} aria-pressed={reaction==='dislike'} aria-label={reaction==='dislike'?'Remove dislike':'Dislike story'}><span className="like-icon dislike-icon" aria-hidden="true"/>{!compact&&<em>Dislike</em>}</button>
  </div>;
}
