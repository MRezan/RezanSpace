UPDATE notifications
SET link = CONCAT('/post/', SUBSTRING(link, 10), '/#discussion')
WHERE type = 'comment' AND link LIKE '/article/%';
