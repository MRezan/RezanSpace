import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const script=fileURLToPath(new URL('../scripts/verify-article-seo.mjs',import.meta.url));
const url='https://example.com/en/post/solar/';
const title='Solar & storage';
const good='<html lang="en"><head><title>Solar &amp; storage | REZAN</title><meta name="description" content="A useful explanation."><meta name="robots" content="index, follow"><link rel="canonical" href="'+url+'"></head><body><h1>Solar &amp; storage</h1><script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'BlogPosting',headline:title}]})+'</script></body></html>';
test('deployment gate reads actual exported metadata and requires canonical sitemap coverage',()=>{
 const folder=mkdtempSync(resolve(tmpdir(),'rezan-seo-gate-'));
 try{
  mkdirSync(resolve(folder,'out/en/post/solar'),{recursive:true});
  const snapshot=resolve(folder,'snapshot.json');
  writeFileSync(snapshot,JSON.stringify([{slug:'solar',language:'en',title}]));
  const cases=[
   [good,url,true],
   [good.replace('A useful explanation.',''),url,false],
   [good.replace('<h1>Solar &amp; storage</h1>',''),url,false],
   [good.replace('index, follow','noindex, follow'),url,false],
   [good.replace('BlogPosting','Organization'),url,false],
   [good,'https://example.com/old/',false],
  ];
  for(const [html,sitemap,success] of cases){
   writeFileSync(resolve(folder,'out/en/post/solar/index.html'),html);
   writeFileSync(resolve(folder,'out/sitemap.xml'),'<urlset><url><loc>'+sitemap+'</loc></url></urlset>');
   const result=spawnSync(process.execPath,[script],{cwd:folder,encoding:'utf8',env:{...process.env,REZAN_POSTS_FILE:snapshot,NEXT_PUBLIC_SITE_URL:'https://example.com'}});
   assert.equal(result.status===0,success,result.stderr);
  }
 }finally{rmSync(folder,{recursive:true,force:true});}
});
