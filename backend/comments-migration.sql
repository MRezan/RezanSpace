USE rezantech;
ALTER TABLE user_sessions MODIFY expires_at DATETIME NULL;
UPDATE user_sessions SET expires_at=NULL;
CREATE TABLE IF NOT EXISTS comments (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 post_slug VARCHAR(180) NOT NULL,
 user_id BIGINT UNSIGNED NOT NULL,
 body TEXT NOT NULL,
 status ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_post_comments(post_slug,status,created_at),
 CONSTRAINT fk_comment_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
