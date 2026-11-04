#!/bin/sh
# Publie une mise à jour à distance (EAS Update) sur le canal production.
# Usage : pnpm run update "Description de la correction"
set -e
MESSAGE="${*:-Mise à jour de Tracklyst}"
npx --yes eas-cli update --channel production --environment production --platform android --message "$MESSAGE"
