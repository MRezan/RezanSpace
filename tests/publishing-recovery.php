<?php
declare(strict_types=1);
// Exercise the API with a real transaction and an already-published slug.
// Substitute only bootstrap I/O; the endpoint's publish/retry logic is unchanged.
require dirname(__DIR__).'/backend/lib/languages.php';
$pdo=new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE,PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE posts (id INTEGER PRIMARY KEY,slug TEXT,language TEXT,translation_key TEXT)');
$pdo->exec("INSERT INTO posts VALUES (1,'solar-en','en','solar')");
$config=['automation_api_key'=>str_repeat('t',32)];
$_SERVER['REQUEST_METHOD']='POST';
$_SERVER['HTTP_X_REZAN_AUTOMATION_KEY']=$config['automation_api_key'];
$refreshes=[];
function input():array{return ['on_conflict'=>'skip','posts'=>[
 ['slug'=>'solar-en','title'=>'Solar energy explained','excerpt'=>'How sunlight becomes electricity.',
  'content'=>'<p>Reviewed explanation.</p>','author'=>'Test Writer','language'=>'en','translation_key'=>'solar'],
]];}
function sanitizeRichText(string $html):string{return $html;}
function slugify(string $text):string{return $text;}
function publishedContentChanged(PDO $pdo,array $config,string $slug):array{
 global $refreshes;$refreshes[]=$slug;
 if($pdo->inTransaction())throw new RuntimeException('Refresh must happen after the transaction commits');
 return ['sitemap_updated'=>true,'deployment_queued'=>true];
}
$endpoint=file_get_contents(dirname(__DIR__).'/backend/api/automation-publish.php');
$endpoint=str_replace("require dirname(__DIR__).'/bootstrap.php';",'',substr($endpoint,5));
ob_start();eval($endpoint);$response=json_decode(ob_get_clean(),true,512,JSON_THROW_ON_ERROR);
if($refreshes!==['solar-en']||$response['sitemap_updated']!==true||$response['counts']['posts_skipped']!==1){
 throw new RuntimeException('Idempotent publication must retry sitemap/deployment after an earlier partial failure');
}
echo "Skipped-post sitemap recovery passed.\n";
