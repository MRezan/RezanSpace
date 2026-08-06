USE rezantech;
UPDATE users
SET role = 'admin'
WHERE LOWER(email) = 'asifrezan.office@gmail.com';

UPDATE users
SET role = 'user'
WHERE role = 'admin'
  AND LOWER(email) <> 'asifrezan.office@gmail.com';
