USE rezantech;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) NOT NULL DEFAULT '' AFTER excerpt;
CREATE TABLE IF NOT EXISTS post_likes(user_id BIGINT UNSIGNED NOT NULL,post_slug VARCHAR(180) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,post_slug),CONSTRAINT fk_like_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS post_dislikes(user_id BIGINT UNSIGNED NOT NULL,post_slug VARCHAR(180) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,post_slug),CONSTRAINT fk_dislike_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
DROP PROCEDURE IF EXISTS seed_social_posts;
DELIMITER //
CREATE PROCEDURE seed_social_posts()
BEGIN
 DECLARE i INT DEFAULT 1; DECLARE cat INT; DECLARE cname VARCHAR(80);
 WHILE i<=50 DO
  SET cat=((i-1)%5)+1; SELECT categories.id,categories.name INTO cat,cname FROM categories WHERE categories.id=cat LIMIT 1;
  INSERT IGNORE INTO posts(category_id,slug,title,excerpt,image_url,content,author,status,published_at) VALUES(cat,CONCAT('technology-dispatch-',LPAD(i,2,'0')),CONCAT(cname,': ',ELT(((i-1)%10)+1,'the next practical breakthrough','what builders need to know','a clearer view of what comes next','five changes worth watching','the quiet shift already underway','inside the new digital economy','how better tools change our work','the design decisions that matter','a field guide for curious people','why this moment feels different')),CONCAT('A concise, useful briefing on ',LOWER(cname),'—with context for readers, builders and technology leaders.'),CONCAT('https://picsum.photos/seed/rezantech-',i,'/1200/720'),CONCAT('Technology changes quickly, but the most useful ideas deserve careful attention. This dispatch explores the people, products and decisions shaping ',LOWER(cname),'.\n\nWe look beyond the headline to understand what is genuinely new, what remains uncertain and what thoughtful builders should do next.'),ELT(((i-1)%5)+1,'Maya Chen','Jon Bell','Nadia Rahman','Alex Moreno','Sara Kim'),'published',DATE_SUB(NOW(),INTERVAL i*6 HOUR));
  SET i=i+1;
 END WHILE;
END//
DELIMITER ;
CALL seed_social_posts(); DROP PROCEDURE seed_social_posts;
