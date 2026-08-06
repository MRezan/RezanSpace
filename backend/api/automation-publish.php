<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';

function automationError(int $status,string $message,array $details=[]):never{
 http_response_code($status);
 exit(json_encode(['error'=>$message]+$details));
}
function automationHeader():string{
 $key=trim((string)($_SERVER['HTTP_X_REZAN_AUTOMATION_KEY']??$_SERVER['REDIRECT_HTTP_X_REZAN_AUTOMATION_KEY']??''));
 if($key===''&&function_exists('getallheaders')){
  $headers=getallheaders();
  $key=trim((string)($headers['X-Rezan-Automation-Key']??$headers['x-rezan-automation-key']??''));
 }
 return $key!==''?$key:bearerToken();
}
function automationText(mixed $value,int $max):string{return mb_substr(trim((string)$value),0,$max);}
function automationImageUrl(mixed $value):string{
 $url=trim((string)$value);
 if($url==='')return '';
 if(mb_strlen($url)>500||!filter_var($url,FILTER_VALIDATE_URL)||!preg_match('#^https://#i',$url))automationError(422,'image_url must be an HTTPS URL no longer than 500 characters.');
 return $url;
}
function automationDate(mixed $value,string $status):?string{
 if($status!=='published')return null;
 if(trim((string)$value)==='')return date('Y-m-d H:i:s');
 try{return (new DateTimeImmutable((string)$value))->format('Y-m-d H:i:s');}catch(Throwable){automationError(422,'published_at must be a valid date and time.');}
}

if(($_SERVER['REQUEST_METHOD']??'')!=='POST')automationError(405,'Method not allowed. Use POST.');
$configuredKey=trim((string)($config['automation_api_key']??''));
if(strlen($configuredKey)<32||str_starts_with($configuredKey,'PASTE_'))automationError(503,'The automation publishing API is not configured.');
$providedKey=automationHeader();
if($providedKey===''||!hash_equals($configuredKey,$providedKey))automationError(401,'Invalid automation API key.');

$data=input();
$categories=$data['categories']??[];
$posts=$data['posts']??[];
if(!is_array($categories)||!is_array($posts))automationError(422,'categories and posts must be arrays.');
if(count($categories)>100||count($posts)>100)automationError(422,'A request may contain at most 100 categories and 100 posts.');
if(!$categories&&!$posts)automationError(422,'Provide at least one category or post.');
$createMissing=(bool)($data['create_missing_categories']??true);
$conflict=(string)($data['on_conflict']??'skip');
if(!in_array($conflict,['skip','error','update'],true))automationError(422,'on_conflict must be skip, error, or update.');

$createdCategories=[];$existingCategories=[];$createdPosts=[];$updatedPosts=[];$skippedPosts=[];
try{
 $pdo->beginTransaction();
 $ensureCategory=function(mixed $item)use($pdo,&$createdCategories,&$existingCategories):array{
  $name=automationText(is_array($item)?($item['name']??''):$item,80);
  if($name==='')automationError(422,'Every category requires a name.');
  $requestedSlug=is_array($item)?automationText($item['slug']??'',90):'';
  $categorySlug=slugify($requestedSlug!==''?$requestedSlug:$name);
  if($categorySlug==='')automationError(422,"The category '{$name}' needs a valid slug.");
  $find=$pdo->prepare('SELECT id,name,slug FROM categories WHERE name=? OR slug=? LIMIT 1');$find->execute([$name,$categorySlug]);$found=$find->fetch();
  if($found){$existingCategories[$found['name']]=$found;return $found;}
  $insert=$pdo->prepare('INSERT INTO categories (name,slug) VALUES (?,?)');$insert->execute([$name,$categorySlug]);
  $created=['id'=>(int)$pdo->lastInsertId(),'name'=>$name,'slug'=>$categorySlug];$createdCategories[]=$created;return $created;
 };
 foreach($categories as $category)$ensureCategory($category);
 foreach($posts as $index=>$post){
  if(!is_array($post))automationError(422,"Post at index {$index} must be an object.");
  $title=automationText($post['title']??'',240);$excerpt=automationText(strip_tags((string)($post['excerpt']??'')),1000);$author=automationText($post['author']??'',120);
  $content=sanitizeRichText((string)($post['content']??''));
  if($title===''||$excerpt===''||$content===''||$author==='')automationError(422,"Post at index {$index} requires title, excerpt, content, and author.");
  $slug=slugify(automationText($post['slug']??$title,180));if($slug==='')automationError(422,"Post at index {$index} needs a valid slug.");
  $categoryName=automationText($post['category']??'',80);$categoryId=null;
  if($categoryName!==''){
   $findCategory=$pdo->prepare('SELECT id,name,slug FROM categories WHERE name=? OR slug=? LIMIT 1');$findCategory->execute([$categoryName,slugify($categoryName)]);$category=$findCategory->fetch();
   if(!$category){if(!$createMissing)automationError(422,"Category '{$categoryName}' does not exist.");$category=$ensureCategory($categoryName);}
   $categoryId=(int)$category['id'];
  }
  $status=(string)($post['status']??'published');if(!in_array($status,['draft','published'],true))automationError(422,"Post '{$slug}' status must be draft or published.");
  $imageUrl=automationImageUrl($post['image_url']??'');$publishedAt=automationDate($post['published_at']??null,$status);
  $existing=$pdo->prepare('SELECT id FROM posts WHERE slug=? LIMIT 1');$existing->execute([$slug]);$existingId=$existing->fetchColumn();
  if($existingId){
   if($conflict==='error')automationError(409,"Post slug '{$slug}' already exists.");
   if($conflict==='skip'){$skippedPosts[]=['id'=>(int)$existingId,'slug'=>$slug];continue;}
   $update=$pdo->prepare('UPDATE posts SET category_id=?,user_id=NULL,title=?,excerpt=?,image_url=?,content=?,author=?,status=?,published_at=? WHERE id=?');
   $update->execute([$categoryId,$title,$excerpt,$imageUrl,$content,$author,$status,$publishedAt,$existingId]);$updatedPosts[]=['id'=>(int)$existingId,'slug'=>$slug];continue;
  }
  $insert=$pdo->prepare('INSERT INTO posts (category_id,user_id,slug,title,excerpt,image_url,content,author,status,published_at) VALUES (?,NULL,?,?,?,?,?,?,?,?)');
  $insert->execute([$categoryId,$slug,$title,$excerpt,$imageUrl,$content,$author,$status,$publishedAt]);$createdPosts[]=['id'=>(int)$pdo->lastInsertId(),'slug'=>$slug];
 }
 $pdo->commit();
}catch(PDOException $error){if($pdo->inTransaction())$pdo->rollBack();automationError($error->getCode()==='23000'?409:500,'The publishing request could not be completed.');}
catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}

$refresh=($createdPosts||$updatedPosts)?publishedContentChanged($pdo,$config,(string)(($createdPosts[0]??$updatedPosts[0])['slug'])):['sitemap_updated'=>false,'deployment_queued'=>false];
http_response_code($createdPosts||$createdCategories?201:200);
echo json_encode(['ok'=>true,'categories'=>['created'=>$createdCategories,'existing'=>array_values($existingCategories)],'posts'=>['created'=>$createdPosts,'updated'=>$updatedPosts,'skipped'=>$skippedPosts],'counts'=>['categories_created'=>count($createdCategories),'posts_created'=>count($createdPosts),'posts_updated'=>count($updatedPosts),'posts_skipped'=>count($skippedPosts)]]+$refresh);
