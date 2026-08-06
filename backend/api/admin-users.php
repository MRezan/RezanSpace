<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
requireAdmin($pdo,$config);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit(json_encode(['error'=>'Method not allowed.']));
}

$page = max((int)($_GET['page'] ?? 1), 1);
$limit = min(max((int)($_GET['limit'] ?? 20), 5), 100);
$offset = ($page - 1) * $limit;
$search = trim((string)($_GET['q'] ?? ''));
$where = '';
$params = [];
if ($search !== '') {
    $where = 'WHERE u.name LIKE ? OR u.email LIKE ? OR u.role LIKE ?';
    $term = '%'.$search.'%';
    $params = [$term,$term,$term];
}

$count = $pdo->prepare("SELECT COUNT(*) FROM users u $where");
$count->execute($params);
$total = (int)$count->fetchColumn();

$query = $pdo->prepare(
    "SELECT u.id,u.name,u.email,u.role,u.avatar_url,u.created_at,
            (SELECT COUNT(*) FROM posts p WHERE p.user_id=u.id AND p.status='published') post_count
     FROM users u $where
     ORDER BY u.created_at DESC,u.id DESC
     LIMIT $limit OFFSET $offset"
);
$query->execute($params);

exit(json_encode(['data'=>$query->fetchAll(),'pagination'=>[
    'page'=>$page,
    'limit'=>$limit,
    'total'=>$total,
    'pages'=>(int)ceil($total/$limit),
]]));
