#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PACKAGE_DIR="$PROJECT_ROOT/deployment/infinityfree-htdocs"
NODE_BIN=${NODE_BIN:-node}

cd "$PROJECT_ROOT"
php backend/scripts/refresh-sitemap.php
"$NODE_BIN" ./node_modules/next/dist/bin/next build --webpack

if [ -d "$PACKAGE_DIR" ]; then
  find "$PACKAGE_DIR" -mindepth 1 -delete
else
  mkdir -p "$PACKAGE_DIR"
fi

cp -R out/. "$PACKAGE_DIR/"
cp -R backend/api "$PACKAGE_DIR/api"
cp -R backend/lib "$PACKAGE_DIR/lib"
cp -R backend/uploads "$PACKAGE_DIR/uploads"
cp backend/bootstrap.php "$PACKAGE_DIR/bootstrap.php"
cp backend/.htaccess "$PACKAGE_DIR/.htaccess"
cp backend/config.production.example.php "$PACKAGE_DIR/config.php.example"

printf '%s\n' \
  'REZAN InfinityFree package' \
  '' \
  'Upload these files into the domain htdocs directory.' \
  'Keep the existing production config.php; do not replace it with config.php.example.' \
  'If this is a new installation, copy config.php.example to config.php and add the rotated database password.' \
  'For InfinityFree API automation, open /api-publisher.html in a browser and remove it after the import.' \
  > "$PACKAGE_DIR/UPLOAD-INSTRUCTIONS.txt"

printf 'Package ready: %s\n' "$PACKAGE_DIR"
