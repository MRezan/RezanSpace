import {test} from 'node:test';
import assert from 'node:assert/strict';
import {metadataFailure,verifyPublicPage} from '../automation/live-verification.mjs';
const url='https://rezan.space/pt-BR/';
const good={status:200,language:'pt-BR',canonical:url};
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
