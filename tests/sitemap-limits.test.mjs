import assert from 'node:assert/strict';
import test from 'node:test';
import {sitemapDocuments,sitemapIndex} from '../lib/sitemap-xml.mjs';
test('large sitemaps split without losing any article URLs',()=>{
 const entries=Array.from({length:50001},(_,i)=>({url:`https://example.com/en/post/${i}/`}));const documents=sitemapDocuments(entries);
 assert.equal(documents.length,6);assert.equal(documents.reduce((sum,xml)=>sum+(xml.match(/<url>/g)||[]).length,0),50001);
 for(const xml of documents){assert.ok((xml.match(/<url>/g)||[]).length<=10000);assert.ok(Buffer.byteLength(xml)<=8000000);}
 assert.ok(sitemapIndex('https://example.com',2).includes('https://example.com/sitemap-pages/1.xml'));
});
test('byte limits, XML escaping and real language alternatives are preserved',()=>{
 const entry={url:'https://example.com/story/?a=1&b=2',lastModified:'2026-11-05',alternates:{languages:{bn:'https://example.com/bn/story/'}}};
 const documents=sitemapDocuments(Array.from({length:10},()=>entry),45000,1000);
 assert.ok(documents.length>1);for(const xml of documents){assert.ok(Buffer.byteLength(xml)<=1000);assert.ok(xml.includes('&amp;b=2'));assert.ok(xml.includes('hreflang="bn"'));}
});
