import {test} from 'node:test';
import assert from 'node:assert/strict';
import {metadataFailure,articleSeoFailure,verifyPublicPage} from '../automation/live-verification.mjs';
const url='https://rezan.space/pt-BR/';
const good={status:200,language:'pt-BR',canonical:url};
test('article verification blocks missing SEO, stale titles, duplicate H1s and noindex',()=>{
 const title='Solar energy explained';
 const article={title:title+' | REZAN',description:'How sunlight becomes electricity.',headings:[title],robots:'index, follow',articleSchema:true};
 assert.equal(articleSeoFailure(article,title),null);
 for(const change of [{title:'Old page'},{description:' '},{headings:[]},{headings:[title,title]},{headings:['Wrong topic']},{robots:'noindex, follow'},{robots:'none'},{articleSchema:false}]){
  assert.ok(articleSeoFailure({...article,...change},title));
 }
});
test('valid canonical alone cannot hide broken article SEO',async()=>{
 let visits=0;
 const page={goto:async()=>{visits++;return {status:()=>200}},locator:()=>({waitFor:async()=>{}}),evaluate:async()=>({...good,title:'Wrong article'})};
 await assert.rejects(verifyPublicPage(page,url,'pt-BR',{delay:0,articleTitle:'Expected article'}),/article page title/);
 assert.equal(visits,3);
});
test('canonical is parsed and matched exactly, not searched anywhere in raw HTML',()=>{
 assert.equal(metadataFailure(good,url,'pt-BR'),null);
 assert.equal(metadataFailure({...good,canonical:'/pt-BR/'},url,'pt-BR'),null);
 for(const value of [{...good,status:503},{...good,language:'en'},{...good,canonical:'https://attacker.invalid/pt-BR/'},{...good,canonical:null}])assert.ok(metadataFailure(value,url,'pt-BR'));
});
test('ordinary challenge/transient metadata absence retries and then verifies the real page',async()=>{
 let visits=0;const page={goto:async()=>{visits++;return {status:()=>200}},locator:()=>({waitFor:async()=>{if(visits===1)throw new Error('challenge')}}),evaluate:async()=>({language:'pt-BR',canonical:url})};
 await verifyPublicPage(page,url,'pt-BR',{delay:0});assert.equal(visits,2);
});
test('genuine wrong language/canonical fails after bounded attempts and names the URL',async()=>{
 let visits=0;const page={goto:async()=>{visits++;return {status:()=>200}},locator:()=>({waitFor:async()=>{}}),evaluate:async()=>({language:'en',canonical:'https://rezan.space/en/'})};
 await assert.rejects(verifyPublicPage(page,url,'pt-BR',{delay:0}),/https:\/\/rezan.space\/pt-BR\/.*language/);assert.equal(visits,3);
});
