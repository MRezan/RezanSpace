-- Apply once to an existing database before deploying the multilingual backend.
-- Existing posts are treated as English. Correct any other authored language before rebuilding.
ALTER TABLE posts
  ADD COLUMN image_alt VARCHAR(180) NOT NULL DEFAULT '',
  ADD COLUMN language VARCHAR(5) NOT NULL DEFAULT 'en',
  ADD COLUMN translation_key VARCHAR(100) NULL,
  ADD INDEX idx_language_status_date (language,status,published_at),
  ADD UNIQUE KEY unique_translation_language (translation_key,language);
