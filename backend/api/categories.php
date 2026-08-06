<?php
declare(strict_types=1);require dirname(__DIR__).'/bootstrap.php';
if($_SERVER['REQUEST_METHOD']==='GET'){$q=$pdo->query('SELECT c.id,c.name,c.slug,COUNT(p.id) post_count FROM categories c LEFT JOIN posts p ON p.category_id=c.id GROUP BY c.id ORDER BY c.name');exit(json_encode(['data'=>$q->fetchAll()]));}
requireAdmin($pdo,$config);
if($_SERVER['REQUEST_METHOD']==='POST'){$d=input();$name=trim($d['name']??'');if(!$name){http_response_code(422);exit(json_encode(['error'=>'Name required.']));}$q=$pdo->prepare('INSERT INTO categories(name,slug) VALUES(?,?)');try{$q->execute([$name,slugify($name)]);http_response_code(201);exit(json_encode(['ok'=>true]));}catch(PDOException $e){http_response_code(409);exit(json_encode(['error'=>'Category already exists.']));}}
if($_SERVER['REQUEST_METHOD']==='DELETE'){$q=$pdo->prepare('DELETE FROM categories WHERE id=?');$q->execute([(int)($_GET['id']??0)]);exit(json_encode(['ok'=>true]));}
http_response_code(405);echo json_encode(['error'=>'Method not allowed.']);
