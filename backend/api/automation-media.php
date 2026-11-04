<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
require dirname(__DIR__).'/lib/automation-auth.php';
requireAutomationKey($config);
if(($_SERVER['REQUEST_METHOD']??'')!=='POST'){http_response_code(405);exit(json_encode(['error'=>'Use POST.']));}
$file=$_FILES['image']??null;
if(!$file||$file['error']!==UPLOAD_ERR_OK||$file['size']>5*1024*1024){http_response_code(422);exit(json_encode(['error'=>'A generated image smaller than 5 MB is required.']));}
$mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);$extension=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$mime]??null;
$size=@getimagesize($file['tmp_name']);
if(!$extension||!$size||$size[0]<256||$size[1]<256||$size[0]>4096||$size[1]>4096){http_response_code(422);exit(json_encode(['error'=>'A valid JPG, PNG or WebP illustration is required.']));}
$origin=rtrim((string)($config['site_url']??''),'/');
if(!str_starts_with($origin,'https://')){http_response_code(503);exit(json_encode(['error'=>'Configure a valid HTTPS site_url before automated publishing.']));}
$directory=dirname(__DIR__).'/uploads';if(!is_dir($directory)&&!mkdir($directory,0755,true)){http_response_code(500);exit(json_encode(['error'=>'Image storage unavailable.']));}
$name='ai-'.hash_file('sha256',$file['tmp_name']).'.'.$extension;$path=$directory.'/'.$name;
if(!is_file($path)&&!move_uploaded_file($file['tmp_name'],$path)){http_response_code(500);exit(json_encode(['error'=>'Image upload failed.']));}
echo json_encode(['ok'=>true,'url'=>$origin.'/uploads/'.$name,'width'=>$size[0],'height'=>$size[1]]);
