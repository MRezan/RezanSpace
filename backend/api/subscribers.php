<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit(json_encode(['error'=>'Method not allowed.']));}
$email=filter_var(input()['email']??'',FILTER_VALIDATE_EMAIL);if(!$email){http_response_code(422);exit(json_encode(['error'=>'Valid email required.']));}
$q=$pdo->prepare('INSERT IGNORE INTO subscribers(email) VALUES(?)');$q->execute([$email]);http_response_code(201);echo json_encode(['ok'=>true]);
