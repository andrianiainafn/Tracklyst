#!/bin/sh
# Publie la version web de l'app (même code que le mobile, Expo Web) sur le
# VPS : https://<site>/app, servie par Caddy depuis /var/www/tracklyst/app.
# Usage : pnpm run deploy:web
set -e
HOST="${HOST:-ubuntu@51.79.207.57}"
OUT="dist-web"

rm -rf "$OUT"
CI=1 npx expo export --platform web --output-dir "$OUT/app"

# Installation sur l'écran d'accueil (PWA) : manifeste et icônes du site.
sed -i.bak 's#<title>Tracklyst</title>#<title>Tracklyst</title>\
    <link rel="manifest" href="/manifest.webmanifest" />\
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />\
    <link rel="icon" href="/logo.svg" type="image/svg+xml" />\
    <meta name="theme-color" content="\#10B981" />\
    <meta name="apple-mobile-web-app-capable" content="yes" />#' "$OUT/app/index.html"
rm -f "$OUT/app/index.html.bak"
# Pas de zoom involontaire sur les champs (iPhone).
sed -i.bak 's#initial-scale=1, shrink-to-fit=no#initial-scale=1, viewport-fit=cover#' "$OUT/app/index.html"
rm -f "$OUT/app/index.html.bak"

ssh "$HOST" "sudo mkdir -p /var/www/tracklyst/app && sudo chown -R \$(id -un) /var/www/tracklyst/app"
rsync -az --delete "$OUT/app/" "$HOST:/var/www/tracklyst/app/"
echo "En ligne : https://tracklyst.51-79-207-57.sslip.io/app"
