-- Apply the ALTER once on an existing installation; the seed statements can be rerun.
ALTER TABLE categories ADD COLUMN parent_id INT UNSIGNED NULL,
 ADD INDEX idx_category_parent(parent_id),
 ADD CONSTRAINT fk_category_parent FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL;
INSERT IGNORE INTO categories(name,slug) VALUES
 ('Tech How-to & Troubleshooting','tech-how-to-troubleshooting'),
 ('Food & Recipes','food-recipes'),
 ('DIY, Crafts & Hobbies','diy-crafts-hobbies'),
 ('Sports','sports'),('Entertainment','entertainment'),('Travel Planning','travel-planning');
UPDATE categories child JOIN categories parent ON parent.slug='technology' SET child.parent_id=parent.id WHERE child.slug='tech-how-to-troubleshooting';
UPDATE categories child JOIN categories parent ON parent.slug='culture' SET child.parent_id=parent.id WHERE child.slug='entertainment';
UPDATE categories child JOIN categories parent ON parent.slug='travel' SET child.parent_id=parent.id WHERE child.slug='travel-planning';
