<?php
declare(strict_types=1);require dirname(__DIR__).'/bootstrap.php';
if($_SERVER['REQUEST_METHOD']==='GET'){
 $q=$pdo->query('SELECT c.id,c.name,c.slug,c.parent_id,parent.name parent_name,(SELECT COUNT(*) FROM posts p WHERE p.category_id=c.id OR p.category_id IN (SELECT child.id FROM categories child WHERE child.parent_id=c.id)) post_count FROM categories c LEFT JOIN categories parent ON parent.id=c.parent_id ORDER BY COALESCE(parent.name,c.name),c.parent_id IS NOT NULL,c.name');
 exit(json_encode(['data'=>$q->fetchAll()]));
}
requireAdmin($pdo,$config);
if($_SERVER['REQUEST_METHOD']==='POST'){
 $d=input();$name=trim($d['name']??'');if(!$name){http_response_code(422);exit(json_encode(['error'=>'Name required.']));}
 $parent=(int)($d['parent_id']??0)?:null;
 if($parent!==null){$check=$pdo->prepare('SELECT id FROM categories WHERE id=? AND parent_id IS NULL');$check->execute([$parent]);if(!$check->fetchColumn()){http_response_code(422);exit(json_encode(['error'=>'Choose an existing top-level parent category.']));}}
 $q=$pdo->prepare('INSERT INTO categories(name,slug,parent_id) VALUES(?,?,?)');
 try{$q->execute([$name,slugify($name),$parent]);http_response_code(201);exit(json_encode(['ok'=>true]));}catch(PDOException $e){http_response_code(409);exit(json_encode(['error'=>'Category already exists.']));}
}
if($_SERVER['REQUEST_METHOD']==='DELETE'){
 $id=(int)($_GET['id']??0);$pdo->beginTransaction();try{$clear=$pdo->prepare('UPDATE categories SET parent_id=NULL WHERE parent_id=?');$clear->execute([$id]);$q=$pdo->prepare('DELETE FROM categories WHERE id=?');$q->execute([$id]);$pdo->commit();}catch(Throwable $e){$pdo->rollBack();throw $e;}
 exit(json_encode(['ok'=>true]));
}
http_response_code(405);echo json_encode(['error'=>'Method not allowed.']);
