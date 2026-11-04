<?php
declare(strict_types=1);
require_once __DIR__.'/languages.php';

function multilingualSitemapXml(string $site,array $rows):string
{
    $site=rtrim($site,'/');
    $escape=fn(string $value):string=>htmlspecialchars($value,ENT_XML1|ENT_QUOTES,'UTF-8');
    $homes=[];foreach(supportedLanguages() as $language)$homes[$language]=$site.'/'.$language.'/';
    $entries=[['url'=>$site.'/','alternates'=>[]]];
    foreach($homes as $language=>$url)$entries[]=['url'=>$url,'alternates'=>$homes+['x-default'=>$site.'/']];
    foreach($rows as $row){
        $alternates=[];
        foreach($rows as $other){if($row['slug']===$other['slug']||(!empty($row['translation_key'])&&$row['translation_key']===$other['translation_key']))$alternates[$other['language']]=$site.localizedPostPath($other);}
        $entries[]=['url'=>$site.localizedPostPath($row),'modified'=>$row['updated_at'],'alternates'=>$alternates];
    }
    foreach(['small-models-big-moment','browser-becomes-operating-system','passkeys-finally-ready','quiet-luxury-gadgets','four-day-week-data','open-source-ai-stack'] as $slug)$entries[]=['url'=>$site.'/en/article/'.$slug.'/','alternates'=>[]];
    $xml="<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n";
    foreach($entries as $entry){
        $xml.='  <url><loc>'.$escape($entry['url']).'</loc>';
        if(!empty($entry['modified']))$xml.='<lastmod>'.date(DATE_ATOM,strtotime($entry['modified'])).'</lastmod>';
        foreach($entry['alternates'] as $language=>$url)$xml.='<xhtml:link rel="alternate" hreflang="'.$escape($language).'" href="'.$escape($url).'"/>';
        $xml.="</url>\n";
    }
    $xml.="</urlset>\n";
    return $xml;
}

function refreshSitemap(PDO $pdo,array $config):bool
{
    $site=rtrim((string)($config['site_url']??'http://rezan.space'),'/');
    $rows=$pdo->query("SELECT slug,language,translation_key,COALESCE(updated_at,published_at,created_at) updated_at FROM posts WHERE status='published' ORDER BY published_at DESC,id DESC")->fetchAll();
    $xml=multilingualSitemapXml($site,$rows);
    $root=dirname(__DIR__,2);$sourceTree=is_file($root.'/package.json')&&is_dir($root.'/app');
    $targets=$sourceTree?[$root.'/public/sitemap.xml']:[dirname(__DIR__).'/sitemap.xml'];
    if($sourceTree&&is_dir($root.'/out'))$targets[]=$root.'/out/sitemap.xml';
    foreach($targets as $target){$temp=$target.'.tmp';if(file_put_contents($temp,$xml,LOCK_EX)===false)return false;if(!rename($temp,$target))return false;}
    return true;
}

function requestStaticDeploy(array $config,string $slug):bool
{
    $url=trim((string)($config['deploy_webhook_url']??''));if($url==='')return false;
    $payload=json_encode(['event'=>'post_published','slug'=>$slug,'site_url'=>$config['site_url']??'http://rezan.space']);
    $headers="Content-Type: application/json\r\n";$secret=trim((string)($config['deploy_webhook_secret']??''));if($secret!=='')$headers.="Authorization: Bearer {$secret}\r\n";
    $context=stream_context_create(['http'=>['method'=>'POST','header'=>$headers,'content'=>$payload,'timeout'=>3,'ignore_errors'=>true]]);
    return @file_get_contents($url,false,$context)!==false;
}

function publishedContentChanged(PDO $pdo,array $config,string $slug):array
{
    $sitemap=refreshSitemap($pdo,$config);$deployment=requestStaticDeploy($config,$slug);
    return ['sitemap_updated'=>$sitemap,'deployment_queued'=>$deployment];
}
