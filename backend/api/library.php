<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
$user = requireUser($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $saved = $pdo->prepare(
        'SELECT b.post_slug, b.created_at AS saved_at,
                p.id, p.title, p.excerpt, p.image_url, p.author, p.published_at,
                c.name AS category_name,
                (SELECT COUNT(*) FROM post_likes l WHERE l.post_slug = p.slug) AS like_count,
                (SELECT COUNT(*) FROM comments cm WHERE cm.post_slug = p.slug AND cm.status = "visible") AS comment_count
         FROM bookmarks b
         LEFT JOIN posts p ON p.slug = b.post_slug
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE b.user_id = ? AND p.id IS NOT NULL
         ORDER BY b.created_at DESC'
    );
    $saved->execute([$user['id']]);

    $notices = $pdo->prepare(
        'SELECT id,type,message,link,read_at,created_at
         FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50'
    );
    $notices->execute([$user['id']]);
    exit(json_encode(['saved' => $saved->fetchAll(), 'notifications' => $notices->fetchAll()]));
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $query = $pdo->prepare('UPDATE notifications SET read_at=NOW() WHERE user_id=?');
    $query->execute([$user['id']]);
    exit(json_encode(['ok' => true]));
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed.']);
