<?php
declare(strict_types=1);
require_once __DIR__.'/languages.php';

function multilingualSitemapDocuments(string $site,array $rows,int $maxUrls=45000,int $maxBytes=40000000):array
{
    $site=rtrim($site,'/');
    $escape=fn(string $value):string=>htmlspecialchars($value,ENT_XML1|ENT_QUOTES,'UTF-8');
    $homes=[];foreach(supportedLanguages() as $language)$homes[$language]=$site.'/'.$language.'/';
    $entries=[];foreach($homes as $url)$entries[]=['url'=>$url,'alternates'=>$homes+['x-default'=>$site.'/']];
    $groups=[];foreach($rows as $row){$key=!empty($row['translation_key'])?'group:'.$row['translation_key']:'slug:'.$row['slug'];$groups[$key][$row['language']]=$site.localizedPostPath($row);}
    foreach($rows as $row){$key=!empty($row['translation_key'])?'group:'.$row['translation_key']:'slug:'.$row['slug'];$entries[]=['url'=>$site.localizedPostPath($row),'modified'=>$row['updated_at'],'alternates'=>$groups[$key]];}
    foreach(['small-models-big-moment','browser-becomes-operating-system','passkeys-finally-ready','quiet-luxury-gadgets','four-day-week-data','open-source-ai-stack'] as $slug)$entries[]=['url'=>$site.'/en/article/'.$slug.'/','alternates'=>[]];
    $header="<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n";
    $documents=[];$xml=$header;$count=0;$bytes=strlen($header.'</urlset>');
    foreach($entries as $entry){
        $item='<url><loc>'.$escape($entry['url']).'</loc>';
        if(!empty($entry['modified']))$item.='<lastmod>'.date(DATE_ATOM,strtotime($entry['modified'])).'</lastmod>';
        foreach($entry['alternates'] as $language=>$url)$item.='<xhtml:link rel="alternate" hreflang="'.$escape($language).'" href="'.$escape($url).'"/>';
        $item.="</url>\n";
        if(strlen($header.$item.'</urlset>')>$maxBytes)throw new RuntimeException('Sitemap entry exceeds document limit');
        if($count&&($count>=$maxUrls||($bytes+strlen($item))>$maxBytes)){$documents[]=$xml.'</urlset>';$xml=$header;$count=0;$bytes=strlen($header.'</urlset>');}
        $xml.=$item;$count++;$bytes+=strlen($item);
    }
    $documents[]=$xml.'</urlset>';return $documents;
}

function sitemapIndexXml(string $site,int $count):string
{
    $escape=fn(string $value):string=>htmlspecialchars($value,ENT_XML1|ENT_QUOTES,'UTF-8');
    $xml='<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    for($index=0;$index<$count;$index++)$xml.='<sitemap><loc>'.$escape(rtrim($site,'/').'/sitemap-pages/'.$index.'.xml').'</loc></sitemap>';
    return $xml.'</sitemapindex>';
}

function multilingualSitemapXml(string $site,array $rows):string
{
    $documents=multilingualSitemapDocuments($site,$rows);
    return count($documents)===1?$documents[0]:sitemapIndexXml($site,count($documents));
}

function refreshSitemap(PDO $pdo,array $config):bool
{
    $site=rtrim((string)($config['site_url']??'https://rezan.space'),'/');
    $rows=$pdo->query("SELECT slug,language,translation_key,COALESCE(updated_at,published_at,created_at) updated_at FROM posts WHERE status='published' ORDER BY published_at DESC,id DESC")->fetchAll();
    $documents=multilingualSitemapDocuments($site,$rows);
    $root=dirname(__DIR__,2);$sourceTree=is_file($root.'/package.json')&&is_dir($root.'/app');
    $targets=$sourceTree?[$root.'/public/sitemap.xml']:[dirname(__DIR__).'/sitemap.xml'];
    if($sourceTree&&is_dir($root.'/out'))$targets[]=$root.'/out/sitemap.xml';
    foreach($targets as $target){
        if(count($documents)>1){
            $folder=dirname($target).'/sitemap-pages';if(!is_dir($folder)&&!mkdir($folder,0755,true))return false;
            foreach($documents as $index=>$xml){$file=$folder.'/'.$index.'.xml';if(file_put_contents($file.'.tmp',$xml,LOCK_EX)===false||!rename($file.'.tmp',$file))return false;}
        }
        $xml=count($documents)===1?$documents[0]:sitemapIndexXml($site,count($documents));
        $temp=$target.'.tmp';if(file_put_contents($temp,$xml,LOCK_EX)===false||!rename($temp,$target))return false;
    }
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
