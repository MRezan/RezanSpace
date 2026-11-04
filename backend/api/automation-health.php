<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
require dirname(__DIR__).'/lib/automation-auth.php';
requireAutomationKey($config);
if(($_SERVER['REQUEST_METHOD']??'')!=='GET'){http_response_code(405);exit(json_encode(['error'=>'Use GET.']));}
try{$pdo->query('SELECT language,translation_key,image_alt FROM posts LIMIT 0');}catch(PDOException){http_response_code(503);exit(json_encode(['error'=>'Apply the multilingual database migration first.']));}
echo json_encode(['ok'=>true,'multilingual'=>true,'languages'=>supportedLanguages(),'media_upload'=>true]);
