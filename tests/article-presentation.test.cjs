const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const source=fs.readFileSync('lib/article-presentation.ts','utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const output={};
vm.runInNewContext(code,{exports:output,require:()=>({}),Intl});
test('heading anchors preserve body links and unique existing anchors without absorbing following paragraphs',()=>{
 const result=output.prepareArticleContent('<h1>Overview &amp; context</h1><p>Read <a href="https://example.com">the source</a>.</p><h2 id="existing">Details</h2><h2 id="existing">Another section</h2><h3><a href="https://example.com">Citation</a></h3>');
 assert.equal(result.toc.length,3);assert.equal(result.toc[0].label,'Overview & context');
 assert.equal(result.toc[1].id,'existing');assert.notEqual(result.toc[2].id,'existing');
 assert.ok(result.html.includes('<p>Read <a href="https://example.com">the source</a>.</p>'));
 assert.ok(result.html.includes('<p class="reference-entry"><a href="https://example.com">Citation</a></p>'));
 assert.ok(!result.html.includes('<h1>'));
});
test('related stories favor the same topic, exclude the current story and respect authored language',()=>{
 const current={slug:'current',language:'bn',category_name:'Science',author:'A',published_at:'2026-10-01'};
 const other=[{...current,slug:'newer',category_name:'Business',published_at:'2026-10-04'},{...current,slug:'same-topic',published_at:'2026-10-02'},{...current,slug:'wrong-language',language:'en'},current];
 assert.equal(output.relatedArticles(current,other).map(item=>item.slug).join(','),'same-topic,newer');
});
test('reading estimates support scripts without spaces and summary metadata decodes entities',()=>{
 assert.ok(output.readingStats({language:'ja',content:'太陽光パネルは光を電気に変換します。'}).wordCount>1);
 assert.equal(output.articleSummary({excerpt:'Facts &amp; context',content:''}),'Facts & context');
 assert.ok(output.articleSummary({excerpt:'A useful explanation. '.repeat(30),content:''}).length<=170);
});
