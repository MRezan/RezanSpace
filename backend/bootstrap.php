<?php
declare(strict_types=1);
$configFile=__DIR__.'/config.php';
if(!file_exists($configFile)){http_response_code(500);exit(json_encode(['error'=>'Copy config.example.php to config.php and configure MySQL.']));}
$config=require $configFile;
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: '.$config['frontend_origin']);
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS'){http_response_code(204);exit;}
try{$pdo=new PDO("mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",$config['db_user'],$config['db_pass'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);}catch(PDOException $e){http_response_code(503);exit(json_encode(['error'=>'Database unavailable.']));}
function input():array{return json_decode(file_get_contents('php://input'),true)?:$_POST;}
function requireAdmin(array $config):void{$header=$_SERVER['HTTP_AUTHORIZATION']??'';$token=str_starts_with($header,'Bearer ')?substr($header,7):'';if(!$token||!hash_equals($config['admin_token'],$token)){http_response_code(401);exit(json_encode(['error'=>'Unauthorized.']));}}
function slugify(string $value):string{return trim(preg_replace('/[^a-z0-9]+/','-',strtolower($value)),'-');}
function bearerToken():string{$header=$_SERVER['HTTP_AUTHORIZATION']??'';return str_starts_with($header,'Bearer ')?trim(substr($header,7)):'';}
function currentUser(PDO $pdo):array|false{$token=bearerToken();if(!$token)return false;$q=$pdo->prepare('SELECT u.id,u.name,u.email,u.bio,u.website,u.avatar_url,u.profession,u.address,u.interests,u.role,u.created_at FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND (s.expires_at IS NULL OR s.expires_at>NOW()) LIMIT 1');$q->execute([hash('sha256',$token)]);return $q->fetch();}
function requireUser(PDO $pdo):array{$user=currentUser($pdo);if(!$user){http_response_code(401);exit(json_encode(['error'=>'Please sign in to continue.']));}return $user;}
require_once __DIR__.'/lib/site-publish.php';
