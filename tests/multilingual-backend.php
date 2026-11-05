<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/lib/site-publish.php';
function check(bool $condition,string $message):void{if(!$condition)throw new RuntimeException($message);}
check(count(supportedLanguages())===15,'15 supported languages');
check(postTranslationKey(null)===null,'No invented translation group');
check(postTranslationKey('solar')==='solar','Translation group validation');
$rows=[['slug'=>'solar-en','language'=>'en','translation_key'=>'solar','updated_at'=>'2026-10-01'],['slug'=>'solar-bn','language'=>'bn','translation_key'=>'solar','updated_at'=>'2026-10-01'],['slug'=>'independent-es','language'=>'es','translation_key'=>null,'updated_at'=>'2026-10-02']];
$xml=new DOMDocument();check($xml->loadXML(multilingualSitemapXml('https://example.com',$rows)),'Valid XML');
$xpath=new DOMXPath($xml);$xpath->registerNamespace('s','http://www.sitemaps.org/schemas/sitemap/0.9');$xpath->registerNamespace('x','http://www.w3.org/1999/xhtml');
check($xpath->query('//s:url')->length===24,'15 homes, six editorials and three stories');
foreach(['en','bn'] as $language){$entry="//s:url[s:loc='https://example.com/$language/post/solar-$language/']";check($xpath->query($entry.'/x:link')->length===2,'Only actual reciprocal translations');}
check($xpath->query("//s:url[s:loc='https://example.com/es/post/independent-es/']/x:link")->length===1,'Unrelated story has only itself');
check(!str_contains($xml->saveXML(),'/fr/post/'),'No nonexistent translation');
check(localizedPostPath(['language'=>'bn','slug'=>'সৌরশক্তি'])==='/bn/post/'.rawurlencode('সৌরশক্তি').'/','Native script slug');
$chunks=multilingualSitemapDocuments('https://example.com',$rows,10);
check(count($chunks)===3,'Large URL sets split at the configured limit');
foreach($chunks as $chunk){$doc=new DOMDocument();check($doc->loadXML($chunk),'Valid shard XML');check($doc->getElementsByTagName('url')->length<=10,'Shard URL limit');}
check(str_contains(sitemapIndexXml('https://example.com',3),'/sitemap-pages/2.xml'),'Root index references every shard');
echo "Multilingual backend checks passed.\n";
