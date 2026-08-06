<?php
declare(strict_types=1);

function refreshSitemap(PDO $pdo, array $config): bool
{
    $site=rtrim((string)($config['site_url']??'https://rezantech.web.app'),'/');
    $rows=$pdo->query("SELECT slug,COALESCE(updated_at,published_at,created_at) updated_at FROM posts WHERE status='published' ORDER BY published_at DESC,id DESC")->fetchAll();
    $urls=[[$site.'/',gmdate(DATE_ATOM),'daily','1.0'],[$site.'/discover/',gmdate(DATE_ATOM),'daily','0.9']];
    foreach($rows as $row){$urls[]=[$site.'/post/'.rawurlencode($row['slug']).'/',date(DATE_ATOM,strtotime($row['updated_at'])),'weekly','0.8'];}
    foreach(['small-models-big-moment','browser-becomes-operating-system','passkeys-finally-ready','quiet-luxury-gadgets','four-day-week-data','open-source-ai-stack'] as $slug){$urls[]=[$site.'/article/'.$slug,'2026-08-02T00:00:00+00:00','weekly','0.75'];}
    $xml="<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
    foreach($urls as [$url,$modified,$frequency,$priority]){$xml.="  <url><loc>".htmlspecialchars($url,ENT_XML1)."</loc><lastmod>{$modified}</lastmod><changefreq>{$frequency}</changefreq><priority>{$priority}</priority></url>\n";}
    $xml.="</urlset>\n";
    $root=dirname(__DIR__,2);$targets=[$root.'/public/sitemap.xml'];if(is_dir($root.'/out'))$targets[]=$root.'/out/sitemap.xml';
    foreach($targets as $target){$temp=$target.'.tmp';if(file_put_contents($temp,$xml,LOCK_EX)===false)return false;if(!rename($temp,$target))return false;}
    return true;
}

function requestStaticDeploy(array $config,string $slug):bool
{
    $url=trim((string)($config['deploy_webhook_url']??''));if($url==='')return false;
    $payload=json_encode(['event'=>'post_published','slug'=>$slug,'site_url'=>$config['site_url']??'https://rezantech.web.app']);
    $headers="Content-Type: application/json\r\n";$secret=trim((string)($config['deploy_webhook_secret']??''));if($secret!=='')$headers.="Authorization: Bearer {$secret}\r\n";
    $context=stream_context_create(['http'=>['method'=>'POST','header'=>$headers,'content'=>$payload,'timeout'=>3,'ignore_errors'=>true]]);
    return @file_get_contents($url,false,$context)!==false;
}

function publishedContentChanged(PDO $pdo,array $config,string $slug):array
{
    $sitemap=refreshSitemap($pdo,$config);$deployment=requestStaticDeploy($config,$slug);
    return ['sitemap_updated'=>$sitemap,'deployment_queued'=>$deployment];
}
