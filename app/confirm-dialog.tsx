'use client';

import {ReactNode,useCallback,useEffect,useRef,useState} from 'react';

type DialogOptions={
  title:string;
  message:string;
  confirmLabel?:string;
  tone?:'danger'|'primary';
};

export function useConfirmDialog(){
  const [options,setOptions]=useState<DialogOptions|null>(null);
  const resolver=useRef<((answer:boolean)=>void)|null>(null);
  const confirmAction=useCallback((next:DialogOptions)=>new Promise<boolean>(resolve=>{resolver.current=resolve;setOptions(next)}),[]);
  const close=useCallback((answer:boolean)=>{resolver.current?.(answer);resolver.current=null;setOptions(null)},[]);
  useEffect(()=>{if(!options)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')close(false)};window.addEventListener('keydown',escape);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',escape)}},[options,close]);
  const confirmationDialog:ReactNode=options?<div className="confirm-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close(false)}}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message"><button className="confirm-close" aria-label="Close dialog" onClick={()=>close(false)}>×</button><span className={`confirm-symbol ${options.tone||'danger'}`} aria-hidden="true">{options.tone==='primary'?'✓':'!'}</span><h2 id="confirm-title">{options.title}</h2><p id="confirm-message">{options.message}</p><footer><button className="confirm-cancel" autoFocus onClick={()=>close(false)}>Cancel</button><button className={`confirm-submit ${options.tone||'danger'}`} onClick={()=>close(true)}>{options.confirmLabel||'Confirm'}</button></footer></section></div>:null;
  return {confirmAction,confirmationDialog};
}
