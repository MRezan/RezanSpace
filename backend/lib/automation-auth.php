<?php
declare(strict_types=1);
function requireAutomationKey(array $config):void{
 $expected=trim((string)($config['automation_api_key']??''));
 $provided=trim((string)($_SERVER['HTTP_X_REZAN_AUTOMATION_KEY']??$_SERVER['REDIRECT_HTTP_X_REZAN_AUTOMATION_KEY']??''));
 if($provided===''&&function_exists('getallheaders')){foreach(getallheaders() as $name=>$value){if(strtolower($name)==='x-rezan-automation-key')$provided=trim($value);}}
 if(strlen($expected)<32||str_starts_with($expected,'PASTE_')){http_response_code(503);exit(json_encode(['error'=>'Automation publishing is not configured.']));}
 if($provided===''||!hash_equals($expected,$provided)){http_response_code(401);exit(json_encode(['error'=>'Invalid automation API key.']));}
}
