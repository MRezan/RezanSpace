<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$ok=refreshSitemap($pdo,$config);
fwrite($ok?STDOUT:STDERR,$ok?"Sitemap refreshed.\n":"Sitemap refresh failed.\n");
exit($ok?0:1);
