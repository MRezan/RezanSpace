<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed.']));
}

$viewer = currentUser($pdo);
$name = trim((string)($_GET['name'] ?? ''));
$search = trim((string)($_GET['q'] ?? ''));

if ($name !== '') {
    $personQuery = $pdo->prepare(
        'SELECT u.id,u.name,u.bio,u.website,u.avatar_url,u.profession,u.address,u.interests,u.created_at,
                (SELECT COUNT(*) FROM posts p WHERE p.author=u.name AND p.status="published") post_count,
                (SELECT COUNT(*) FROM author_follows f WHERE f.author_name=u.name) follower_count
         FROM users u WHERE u.name=? LIMIT 1'
    );
    $personQuery->execute([$name]);
    $person = $personQuery->fetch();
    if (!$person) {
        $exists = $pdo->prepare('SELECT author FROM posts WHERE author=? AND status="published" LIMIT 1');
        $exists->execute([$name]);
        if (!$exists->fetchColumn()) { http_response_code(404); exit(json_encode(['error'=>'Writer not found.'])); }
        $count = $pdo->prepare('SELECT COUNT(*) FROM posts WHERE author=? AND status="published"');
        $count->execute([$name]);
        $followers = $pdo->prepare('SELECT COUNT(*) FROM author_follows WHERE author_name=?');
        $followers->execute([$name]);
        $person = ['id'=>null,'name'=>$name,'bio'=>'Community contributor at REZAN.','website'=>'','avatar_url'=>'','profession'=>'','address'=>'','interests'=>'','created_at'=>null,'post_count'=>(int)$count->fetchColumn(),'follower_count'=>(int)$followers->fetchColumn()];
    }
    $posts = $pdo->prepare(
        'SELECT p.id,p.slug,p.title,p.excerpt,p.image_url,p.author,p.published_at,c.name category_name,
                (SELECT COUNT(*) FROM post_likes l WHERE l.post_slug=p.slug) like_count,
                (SELECT COUNT(*) FROM comments m WHERE m.post_slug=p.slug AND m.status="visible") comment_count
         FROM posts p LEFT JOIN categories c ON c.id=p.category_id
         WHERE p.author=? AND p.status="published" ORDER BY p.published_at DESC'
    );
    $posts->execute([$name]);
    $following = false;
    if ($viewer) {
        $check = $pdo->prepare('SELECT 1 FROM author_follows WHERE user_id=? AND author_name=?');
        $check->execute([$viewer['id'],$name]);
        $following = (bool)$check->fetchColumn();
    }
    exit(json_encode(['person'=>$person,'posts'=>$posts->fetchAll(),'following'=>$following]));
}

if ($search !== '') {
    $limit = min(max((int)($_GET['limit'] ?? 20), 1), 50);
    $params = ['%'.$search.'%'];
    $viewerFilter = '';
    if ($viewer) {
        $viewerFilter = 'AND u.id<>?';
        $params[] = $viewer['id'];
    }
    $query = $pdo->prepare(
        "SELECT u.id,u.name,u.bio,u.avatar_url,
                (SELECT COUNT(*) FROM posts p WHERE p.author=u.name AND p.status='published') post_count,
                (SELECT COUNT(*) FROM author_follows f WHERE f.author_name=u.name) follower_count
         FROM users u
         WHERE u.name LIKE ? $viewerFilter
         ORDER BY CASE WHEN LOWER(u.name)=LOWER(?) THEN 0 ELSE 1 END,u.name
         LIMIT $limit"
    );
    $params[] = $search;
    $query->execute($params);
    exit(json_encode(['data'=>$query->fetchAll()]));
}

$limit = min(max((int)($_GET['limit'] ?? 5), 1), 12);
$params = [];
$exclude = '';
if ($viewer) { $exclude = 'WHERE u.id<>?'; $params[] = $viewer['id']; }
$query = $pdo->prepare(
    "SELECT u.id,u.name,u.bio,u.avatar_url,
            (SELECT COUNT(*) FROM posts p WHERE p.author=u.name AND p.status='published') post_count,
            (SELECT COUNT(*) FROM author_follows f WHERE f.author_name=u.name) follower_count
     FROM users u $exclude
     HAVING post_count>0
     ORDER BY RAND() LIMIT $limit"
);
$query->execute($params);
$people = $query->fetchAll();

if (count($people) < $limit) {
    $authors = $pdo->query(
        "SELECT p.author name,'' bio,COUNT(*) post_count,
                (SELECT COUNT(*) FROM author_follows f WHERE f.author_name=p.author) follower_count
         FROM posts p WHERE p.status='published' GROUP BY p.author ORDER BY RAND() LIMIT $limit"
    )->fetchAll();
    $known = array_column($people, 'name');
    foreach ($authors as $author) if (!in_array($author['name'], $known, true)) $people[] = $author;
}

exit(json_encode(['data'=>array_slice($people,0,$limit)]));
