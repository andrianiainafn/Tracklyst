#!/usr/bin/env bash
# Redéploie le site sur le VPS : envoi du code, build, redémarrage PM2.
# Usage : ./deploy.sh            (depuis tracklyst-web/web-tracklyst)
#         APK_URL=<lien EAS> ./deploy.sh   (met aussi à jour l'APK téléchargeable)
set -euo pipefail

HOST="${HOST:-ubuntu@51.79.207.57}"
SITE_URL="${SITE_URL:-https://tracklyst.51-79-207-57.sslip.io}"

rsync -az --delete --exclude node_modules --exclude .next --exclude .git --exclude '*.apk' ./ "$HOST:~/tracklyst-web/"

ssh "$HOST" "set -e
  export PATH=\$HOME/.npm-global/bin:\$PATH
  cd ~/tracklyst-web
  pnpm install --frozen-lockfile
  NEXT_PUBLIC_SITE_URL=$SITE_URL NEXT_TELEMETRY_DISABLED=1 pnpm build
  # Le dossier standalone ne contient pas les fichiers statiques : on les copie.
  cp -r public .next/standalone/
  cp -r .next/static .next/standalone/.next/
  pm2 startOrReload ecosystem.config.cjs --update-env
  pm2 save
  if [ -n '${APK_URL:-}' ]; then
    sudo curl -fsSL -o /var/www/tracklyst/tracklyst.apk.new '${APK_URL:-}'
    sudo mv /var/www/tracklyst/tracklyst.apk.new /var/www/tracklyst/tracklyst.apk
  fi"

echo "En ligne : $SITE_URL"
