CREATE DATABASE IF NOT EXISTS rezantech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rezantech;
CREATE TABLE categories (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(80) NOT NULL UNIQUE,slug VARCHAR(90) NOT NULL UNIQUE,
  parent_id INT UNSIGNED NULL,
  INDEX idx_category_parent(parent_id),
  CONSTRAINT fk_category_parent FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL);
CREATE TABLE posts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,category_id INT UNSIGNED NULL,slug VARCHAR(180) NOT NULL UNIQUE,language VARCHAR(5) NOT NULL DEFAULT 'en',image_alt VARCHAR(180) NOT NULL DEFAULT '',translation_key VARCHAR(100) NULL,INDEX idx_language_status_date(language,status,published_at),UNIQUE KEY unique_translation_language(translation_key,language),title VARCHAR(240) NOT NULL,excerpt TEXT NOT NULL,content LONGTEXT NOT NULL,author VARCHAR(120) NOT NULL,status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',published_at DATETIME NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,INDEX idx_status_date(status,published_at),FULLTEXT KEY search_posts(title,excerpt,content),CONSTRAINT fk_category FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL);
CREATE TABLE subscribers (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,email VARCHAR(190) NOT NULL UNIQUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO categories(name,slug) VALUES ('Technology','technology'),('Business','business'),('Science','science'),('Health','health'),('Culture','culture'),('Education','education'),('Lifestyle','lifestyle'),('Finance','finance'),('Travel','travel'),('Environment','environment');

-- Expanded editorial taxonomy
INSERT IGNORE INTO categories(name,slug) VALUES
 ('Tech How-to & Troubleshooting','tech-how-to-troubleshooting'),
 ('Food & Recipes','food-recipes'),
 ('DIY, Crafts & Hobbies','diy-crafts-hobbies'),
 ('Sports','sports'),('Entertainment','entertainment'),('Travel Planning','travel-planning');
UPDATE categories child JOIN categories parent ON parent.slug='technology' SET child.parent_id=parent.id WHERE child.slug='tech-how-to-troubleshooting';
UPDATE categories child JOIN categories parent ON parent.slug='culture' SET child.parent_id=parent.id WHERE child.slug='entertainment';
UPDATE categories child JOIN categories parent ON parent.slug='travel' SET child.parent_id=parent.id WHERE child.slug='travel-planning';
