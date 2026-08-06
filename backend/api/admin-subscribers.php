<?php
declare(strict_types=1);require dirname(__DIR__).'/bootstrap.php';requireAdmin($pdo,$config);
if($_SERVER['REQUEST_METHOD']==='GET'){$q=$pdo->query('SELECT id,email,created_at FROM subscribers ORDER BY created_at DESC');exit(json_encode(['data'=>$q->fetchAll()]));}
if($_SERVER['REQUEST_METHOD']==='DELETE'){$q=$pdo->prepare('DELETE FROM subscribers WHERE id=?');$q->execute([(int)($_GET['id']??0)]);exit(json_encode(['ok'=>true]));}
http_response_code(405);echo json_encode(['error'=>'Method not allowed.']);
