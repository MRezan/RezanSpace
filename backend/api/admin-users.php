<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
requireAdmin($pdo,$config);

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = input();
    $userId = (int)($data['id'] ?? 0);
    $role = (string)($data['role'] ?? '');
    if (!$userId || !in_array($role, ['user','editor'], true)) {
        http_response_code(422);
        exit(json_encode(['error'=>'Choose a valid user and role.']));
    }
    $query = $pdo->prepare('SELECT id,email FROM users WHERE id=? LIMIT 1');
    $query->execute([$userId]);
    $target = $query->fetch();
    if (!$target) {
        http_response_code(404);
        exit(json_encode(['error'=>'User not found.']));
    }
    if (strtolower((string)$target['email']) === strtolower((string)($config['admin_email'] ?? ''))) {
        http_response_code(422);
        exit(json_encode(['error'=>'The owner role cannot be changed.']));
    }
    $update = $pdo->prepare('UPDATE users SET role=? WHERE id=?');
    $update->execute([$role,$userId]);
    exit(json_encode(['ok'=>true,'role'=>$role]));
}

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

$adminEmail = strtolower((string)($config['admin_email'] ?? ''));
$users = $query->fetchAll();
foreach ($users as &$user) {
    $user['is_owner'] = strtolower((string)$user['email']) === $adminEmail;
}
unset($user);

exit(json_encode(['data'=>$users,'pagination'=>[
    'page'=>$page,
    'limit'=>$limit,
    'total'=>$total,
    'pages'=>(int)ceil($total/$limit),
]]));
