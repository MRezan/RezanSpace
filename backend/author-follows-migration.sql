USE rezantech;
CREATE TABLE IF NOT EXISTS author_follows (
 user_id BIGINT UNSIGNED NOT NULL,
 author_name VARCHAR(120) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,author_name),
 CONSTRAINT fk_author_follow_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
