<?php
declare(strict_types=1);
require_once __DIR__.'/lib/languages.php';
$configFile=__DIR__.'/config.php';
if(!file_exists($configFile)){http_response_code(500);exit(json_encode(['error'=>'Copy config.example.php to config.php and configure MySQL.']));}
$config=require $configFile;
header('Content-Type: application/json; charset=utf-8');
$allowedOrigins=$config['frontend_origins']??[$config['frontend_origin']??''];
if(!is_array($allowedOrigins))$allowedOrigins=[$allowedOrigins];
$requestOrigin=(string)($_SERVER['HTTP_ORIGIN']??'');
if($requestOrigin!==''&&in_array($requestOrigin,$allowedOrigins,true)){
 header('Access-Control-Allow-Origin: '.$requestOrigin);
 header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Rezan-Automation-Key');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS'){http_response_code(204);exit;}
try{$pdo=new PDO("mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",$config['db_user'],$config['db_pass'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);}catch(PDOException $e){http_response_code(503);exit(json_encode(['error'=>'Database unavailable.']));}
function input():array{return json_decode(file_get_contents('php://input'),true)?:$_POST;}
function structureLooseRichText(string $html):string{
 if(preg_match('#<(p|div|h[1-6]|ul|ol|li|blockquote)\b#i',$html))return $html;
 $lines=preg_split('/\R/',trim($html))?:[];$result='';$list=[];
 $flushList=function()use(&$result,&$list){if($list){$result.='<ul>'.implode('',array_map(fn($item)=>'<li>'.$item.'</li>',$list)).'</ul>';$list=[];}};
 foreach($lines as $line){$line=trim($line);if($line===''){$flushList();continue;}
  if(preg_match('/^(?:[-*•])\s+(.+)$/u',$line,$match)){$list[]=$match[1];continue;}
  $flushList();
  if(preg_match('/^\d+\.\s+(.+)$/u',$line,$match)){$result.='<h3>'.$match[1].'</h3>';continue;}
  $plain=trim(strip_tags($line));$length=mb_strlen($plain);$words=preg_split('/\s+/u',$plain)?:[];$wordCount=count($words);
  $sectionLabel=(bool)preg_match('/^(introduction|overview|summary|conclusion|final thoughts|key takeaways|references)$/iu',$plain);
  $stopWords=['a','an','the','and','or','but','for','to','of','in','on','with','is','are','vs','by','from'];$significant=0;$capitalized=0;
  foreach($words as $word){$clean=trim($word,"()[]{}:;,.!?—–-\"");if($clean===''||in_array(mb_strtolower($clean),$stopWords,true))continue;$significant++;if(preg_match('/^[\p{Lu}\d]/u',$clean))$capitalized++;}
  $titleCased=$wordCount>=2&&$wordCount<=12&&$significant>0&&($capitalized/$significant)>=.75&&!preg_match('/[.!,:;]$/u',$plain);
  if(($length<=110&&str_ends_with($plain,'?'))||$sectionLabel||$titleCased){$result.='<h2>'.$line.'</h2>';continue;}
  $result.='<p>'.$line.'</p>';
 }
 $flushList();return $result;
}
function sanitizeRichText(string $html):string{
 $html=preg_replace('#<(script|style|iframe|object|embed)[^>]*>.*?</\1>#is','',$html)??'';
 if(trim(strip_tags($html))==='')return '';
 $html=structureLooseRichText($html);
 $doc=new DOMDocument('1.0','UTF-8');
 libxml_use_internal_errors(true);
 $doc->loadHTML('<?xml encoding="utf-8" ?><div id="rich-root">'.$html.'</div>',LIBXML_HTML_NOIMPLIED|LIBXML_HTML_NODEFDTD);
 libxml_clear_errors();
 $allowed=['div','p','br','strong','b','em','i','u','mark','ul','ol','li','h2','h3','blockquote','a'];
 $nodes=[];foreach($doc->getElementsByTagName('*') as $node)$nodes[]=$node;
 foreach(array_reverse($nodes) as $node){
  if($node->getAttribute('id')==='rich-root')continue;
  $tag=strtolower($node->nodeName);
  if($tag==='h1'){$replacement=$doc->createElement('h2');while($node->firstChild)$replacement->appendChild($node->firstChild);$node->parentNode?->replaceChild($replacement,$node);continue;}
  if($tag==='div'){$replacement=$doc->createElement('p');while($node->firstChild)$replacement->appendChild($node->firstChild);$node->parentNode?->replaceChild($replacement,$node);continue;}
  if($tag==='span'&&str_contains(strtolower($node->getAttribute('style')),'background')){$replacement=$doc->createElement('mark');while($node->firstChild)$replacement->appendChild($node->firstChild);$node->parentNode?->replaceChild($replacement,$node);continue;}
  if($tag==='a'){$href=trim($node->getAttribute('href'));while($node->attributes?->length)$node->removeAttributeNode($node->attributes->item(0));if(filter_var($href,FILTER_VALIDATE_URL)&&preg_match('#^https?://#i',$href)){$node->setAttribute('href',$href);$node->setAttribute('target','_blank');$node->setAttribute('rel','noopener noreferrer');continue;}while($node->firstChild)$node->parentNode?->insertBefore($node->firstChild,$node);$node->parentNode?->removeChild($node);continue;}
  if(!in_array($tag,$allowed,true)){while($node->firstChild)$node->parentNode?->insertBefore($node->firstChild,$node);$node->parentNode?->removeChild($node);continue;}
  while($node->attributes?->length)$node->removeAttributeNode($node->attributes->item(0));
 }
 $root=$doc->getElementById('rich-root');$clean='';if($root)foreach($root->childNodes as $child)$clean.=$doc->saveHTML($child);
 return trim($clean);
}
function isOwner(array $user,array $config):bool{$adminEmail=strtolower((string)($config['admin_email']??''));return $adminEmail!==''&&strtolower((string)($user['email']??''))===$adminEmail&&($user['role']??'')==='admin';}
function requireAdmin(PDO $pdo,array $config):array{$user=currentUser($pdo);if(!$user||!isOwner($user,$config)){http_response_code(403);exit(json_encode(['error'=>'Owner access is required.']));}return $user;}
function requireStaff(PDO $pdo,array $config):array{$user=currentUser($pdo);if(!$user||(!isOwner($user,$config)&&($user['role']??'')!=='editor')){http_response_code(403);exit(json_encode(['error'=>'Editorial access is required.']));}return $user;}
function slugify(string $value):string{return trim(preg_replace('/[^\p{L}\p{N}]+/u','-',mb_strtolower($value,'UTF-8')),'-');}
function bearerToken():string{
 $header=(string)($_SERVER['HTTP_AUTHORIZATION']??$_SERVER['REDIRECT_HTTP_AUTHORIZATION']??'');
 if($header===''&&function_exists('getallheaders')){
  $headers=getallheaders();
  $header=(string)($headers['Authorization']??$headers['authorization']??'');
 }
 return stripos($header,'Bearer ')===0?trim(substr($header,7)):'';
}
function currentUser(PDO $pdo):array|false{$token=bearerToken();if(!$token)return false;$q=$pdo->prepare('SELECT u.id,u.name,u.email,u.bio,u.website,u.avatar_url,u.profession,u.address,u.interests,u.role,u.created_at FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND (s.expires_at IS NULL OR s.expires_at>NOW()) LIMIT 1');$q->execute([hash('sha256',$token)]);return $q->fetch();}
function requireUser(PDO $pdo):array{$user=currentUser($pdo);if(!$user){http_response_code(401);exit(json_encode(['error'=>'Please sign in to continue.']));}return $user;}
require_once __DIR__.'/lib/site-publish.php';
