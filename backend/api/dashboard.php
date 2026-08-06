<?php
declare(strict_types=1);require dirname(__DIR__).'/bootstrap.php';$admin=requireStaff($pdo,$config);$owner=isOwner($admin,$config);
$stats=['posts'=>(int)$pdo->query('SELECT COUNT(*) FROM posts')->fetchColumn(),'published'=>(int)$pdo->query("SELECT COUNT(*) FROM posts WHERE status='published'")->fetchColumn(),'drafts'=>(int)$pdo->query("SELECT COUNT(*) FROM posts WHERE status='draft'")->fetchColumn(),'categories'=>(int)$pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn()];
if($owner){$stats['subscribers']=(int)$pdo->query('SELECT COUNT(*) FROM subscribers')->fetchColumn();$stats['users']=(int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();}
$recent=$pdo->query('SELECT p.id,p.title,p.status,p.created_at,c.name category_name FROM posts p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.created_at DESC LIMIT 5')->fetchAll();
$categoryStats=$pdo->query('SELECT c.name,COUNT(p.id) total FROM categories c LEFT JOIN posts p ON p.category_id=c.id GROUP BY c.id ORDER BY total DESC')->fetchAll();
echo json_encode(['admin'=>['name'=>$admin['name'],'email'=>$admin['email'],'role'=>$owner?'owner':'editor'],'permissions'=>['stories'=>true,'publish'=>true,'users'=>$owner,'categories'=>$owner,'subscribers'=>$owner],'stats'=>$stats,'recent'=>$recent,'categories'=>$categoryStats]);
