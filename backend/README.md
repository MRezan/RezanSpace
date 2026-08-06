# REZAN local API

1. Import `database.sql`, then `auth-migration.sql` and `comments-migration.sql` into MySQL.
2. Copy `config.example.php` to `config.php` and update the credentials/token.
3. Serve this folder with Apache/PHP (XAMPP works) as `http://localhost/rezantech-api`.
4. Allow the Firebase origin in `frontend_origin` when connecting a deployed frontend to a reachable backend.

Never commit `config.php`. For a public production backend, add proper user accounts, HTTPS, rate limiting and managed secrets.

User passwords are stored with PHP's password hashing API. Login tokens are stored only as SHA-256 hashes and remain valid until the user explicitly signs out. Community posts are created as drafts for editorial review. Comment deletion is limited to the comment owner or an editor/admin.
