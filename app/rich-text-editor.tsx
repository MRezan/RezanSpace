'use client';

import {ClipboardEvent,useEffect,useRef,useState} from 'react';

type Props={name:string;placeholder:string;className?:string;initialValue?:string};

export function RichTextEditor({name,placeholder,className='',initialValue=''}:Props){
  const editor=useRef<HTMLDivElement>(null);
  const linkInput=useRef<HTMLInputElement>(null);
  const selectedRange=useRef<Range|null>(null);
  const [html,setHtml]=useState(initialValue);
  const [linkOpen,setLinkOpen]=useState(false);
  const [linkUrl,setLinkUrl]=useState('');
  const [linkError,setLinkError]=useState('');
  const [linkAdded,setLinkAdded]=useState(false);
  const [selectionMessage,setSelectionMessage]=useState('');

  useEffect(()=>{
    if(!editor.current)return;
    editor.current.innerHTML=initialValue;
    setHtml(initialValue);
  },[initialValue]);

  function format(command:string,value?:string){
    editor.current?.focus();
    document.execCommand(command,false,value);
    setHtml(editor.current?.innerHTML||'');
  }

  function openLinkPanel(){
    const selection=window.getSelection();
    selectedRange.current=selection?.rangeCount&&!selection.isCollapsed?selection.getRangeAt(0).cloneRange():null;
    if(!selectedRange.current){setSelectionMessage('Select some text first, then click Link.');setLinkOpen(false);return}
    setSelectionMessage('');setLinkError('');
    setLinkUrl('');setLinkAdded(false);setLinkOpen(true);
    window.setTimeout(()=>linkInput.current?.focus(),0);
  }

  function addLink(){
    if(!selectedRange.current){setLinkError('Select the text you want to link first.');return}
    let url:string;
    try{const parsed=new URL(linkUrl.trim());if(!['http:','https:'].includes(parsed.protocol))throw new Error();url=parsed.toString()}catch{setLinkError('Enter a complete http:// or https:// address.');return}
    const range=selectedRange.current;
    if(!range.startContainer.isConnected||!range.endContainer.isConnected){setLinkError('The selected text is no longer available. Select it and try again.');return}
    const anchor=document.createElement('a');anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';
    try{anchor.appendChild(range.extractContents());range.insertNode(anchor)}catch{setLinkError('That selection cannot be linked. Select a single piece of text and try again.');return}
    const selection=window.getSelection();editor.current?.focus();if(selection){selection.removeAllRanges();const after=document.createRange();after.setStartAfter(anchor);after.collapse(true);selection.addRange(after)}
    setHtml(editor.current?.innerHTML||'');
    selectedRange.current=null;setLinkAdded(true);setLinkError('');
  }

  function closeLinkPanel(){selectedRange.current=null;setLinkOpen(false);setLinkUrl('');setLinkError('');setLinkAdded(false);editor.current?.focus()}

  function handlePaste(event:ClipboardEvent<HTMLDivElement>){
    const text=event.clipboardData.getData('text/plain');
    const urlPattern=/https?:\/\/[^\s<]+/gi;
    if(!urlPattern.test(text))return;
    event.preventDefault();urlPattern.lastIndex=0;
    const selection=window.getSelection();if(!selection?.rangeCount)return;
    const range=selection.getRangeAt(0);range.deleteContents();
    const fragment=document.createDocumentFragment();let cursor=0;
    for(const match of text.matchAll(urlPattern)){const index=match.index??0;if(index>cursor)fragment.append(document.createTextNode(text.slice(cursor,index)));const anchor=document.createElement('a');anchor.href=match[0];anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent=match[0];fragment.append(anchor);cursor=index+match[0].length}
    if(cursor<text.length)fragment.append(document.createTextNode(text.slice(cursor)));
    const tail=document.createTextNode('');fragment.append(tail);range.insertNode(fragment);const after=document.createRange();after.setStartAfter(tail);after.collapse(true);selection.removeAllRanges();selection.addRange(after);setHtml(editor.current?.innerHTML||'');
  }

  return <div className={`rich-editor ${className}`}>
    <div className="rich-toolbar" role="toolbar" aria-label="Text formatting">
      <button type="button" aria-label="Heading" title="Heading" onMouseDown={event=>event.preventDefault()} onClick={()=>format('formatBlock','h2')}>H2</button>
      <button type="button" aria-label="Paragraph" title="Paragraph" onMouseDown={event=>event.preventDefault()} onClick={()=>format('formatBlock','p')}>¶</button>
      <button type="button" aria-label="Bold" title="Bold" onMouseDown={event=>event.preventDefault()} onClick={()=>format('bold')}><b>B</b></button>
      <button type="button" aria-label="Italic" title="Italic" onMouseDown={event=>event.preventDefault()} onClick={()=>format('italic')}><i>I</i></button>
      <button type="button" aria-label="Underline" title="Underline" onMouseDown={event=>event.preventDefault()} onClick={()=>format('underline')}><u>U</u></button>
      <button type="button" aria-label="Highlight" title="Highlight" onMouseDown={event=>event.preventDefault()} onClick={()=>format('hiliteColor','#fff1a8')}>Highlight</button>
      <button type="button" aria-label="Bulleted list" title="Bulleted list" onMouseDown={event=>event.preventDefault()} onClick={()=>format('insertUnorderedList')}>• List</button>
      <button type="button" aria-label="Numbered list" title="Numbered list" onMouseDown={event=>event.preventDefault()} onClick={()=>format('insertOrderedList')}>1. List</button>
      <button type="button" aria-label="Quotation" title="Quotation" onMouseDown={event=>event.preventDefault()} onClick={()=>format('formatBlock','blockquote')}>❝</button>
      <button type="button" aria-label="Add external link" title="Add external link" aria-expanded={linkOpen} onMouseDown={event=>event.preventDefault()} onClick={openLinkPanel}>↗ Link</button>
      <button type="button" aria-label="Clear formatting" title="Clear formatting" onMouseDown={event=>event.preventDefault()} onClick={()=>format('removeFormat')}>Clear</button>
    </div>
    {selectionMessage&&<div className="rich-selection-message" role="status"><span>↖</span><p><b>Select text first</b>{selectionMessage}</p><button type="button" aria-label="Dismiss message" onClick={()=>setSelectionMessage('')}>×</button></div>}
    {linkOpen&&<div className={`rich-link-panel ${linkAdded?'link-added':''}`} role="dialog" aria-label="Add external link">{linkAdded?<div className="rich-link-success" role="status"><i>✓</i><div><b>Link added</b><span>The selected text will open this external page.</span><a href={linkUrl} target="_blank" rel="noopener noreferrer">{linkUrl}</a></div><button type="button" onClick={closeLinkPanel}>Done</button></div>:<><header><span>↗</span><div><b>Add external link</b><small>Selected text will open in a new tab</small></div><button type="button" aria-label="Close link panel" onClick={closeLinkPanel}>×</button></header><label><span>Web address</span><input ref={linkInput} type="url" inputMode="url" value={linkUrl} onChange={event=>{setLinkUrl(event.target.value);setLinkError('')}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();addLink()}if(event.key==='Escape')closeLinkPanel()}} placeholder="https://example.com/article" aria-invalid={Boolean(linkError)} aria-describedby={linkError?'rich-link-error':undefined}/></label>{linkError&&<p id="rich-link-error" role="alert">{linkError}</p>}<footer><button type="button" onClick={closeLinkPanel}>Cancel</button><button type="button" disabled={!selectedRange.current||!linkUrl.trim()} onClick={addLink}>Add link</button></footer></>}</div>}
    <div ref={editor} className="rich-editor-area" contentEditable suppressContentEditableWarning data-placeholder={placeholder} role="textbox" aria-multiline="true" onPaste={handlePaste} onInput={event=>setHtml(event.currentTarget.innerHTML)}/>
    <input type="hidden" name={name} value={html}/>
  </div>;
}
