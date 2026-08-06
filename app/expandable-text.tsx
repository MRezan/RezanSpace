'use client';

import {useState} from 'react';

export function ExpandableText({text,limit=240,className=''}:{text:string;limit?:number;className?:string}){
  const [expanded,setExpanded]=useState(false);
  const clean=text.replace(/\s+/g,' ').trim();
  const isLong=clean.length>limit;
  const shown=isLong&&!expanded?`${clean.slice(0,limit).trimEnd()}…`:clean;
  return <div className={`expandable-text ${className}`}><p>{shown}</p>{isLong&&<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'See less':'See more'}</button>}</div>;
}
