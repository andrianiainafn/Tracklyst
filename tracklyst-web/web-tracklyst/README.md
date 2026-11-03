# Tracklyst Web

Version web mobile first de Tracklyst (Next.js 16, Tailwind 4). Même projet Supabase que l'app mobile : mêmes comptes, mêmes données.

## Développement

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Variables dans `.env.local` (non commité) :

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clé anon publique>
```

Les variables `NEXT_PUBLIC_*` sont intégrées **au moment du build** : elles doivent exister quand on lance `pnpm build`.

## En production

- Site : https://tracklyst.51-79-207-57.sslip.io (VPS OVH `51.79.207.57`).
- Le site tourne avec PM2 sous l'utilisateur `ubuntu` (`pm2 status`, `pm2 logs tracklyst-web`, port local 3021, relancé au démarrage via `pm2-ubuntu`). Caddy fournit le HTTPS et sert l'APK depuis `/var/www/tracklyst/tracklyst.apk` (bloc `tracklyst.51-79-207-57.sslip.io` dans `/etc/caddy/Caddyfile`).
- Redéployer : `./deploy.sh`. Avec un nouvel APK : `APK_URL=<lien EAS> ./deploy.sh`.
- Passer à un vrai domaine : enregistrement A vers `51.79.207.57`, remplacer le nom du bloc dans le Caddyfile (`sudo systemctl reload caddy`), puis `SITE_URL=https://<domaine> ./deploy.sh`.

## Déploiement manuel

`next.config.ts` produit un serveur Node autonome (`output: "standalone"`).

```bash
pnpm install --frozen-lockfile
pnpm build

# Le dossier standalone ne contient pas les fichiers statiques : on les copie.
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Lancement (Node 20+), derrière le reverse proxy (Nginx, Caddy…) en HTTPS.
cd .next/standalone
PORT=3000 HOSTNAME=0.0.0.0 node server.js
```

Seul le dossier `.next/standalone` est à copier sur le serveur. Pour le garder en marche : `pm2 start server.js --name tracklyst-web` ou un service systemd.

**HTTPS obligatoire** : l'installation sur l'écran d'accueil (PWA) ne fonctionne qu'en HTTPS.

## Pages

- `/` : page de présentation publique, avec le bouton de téléchargement de l'APK Android.
- `/login` puis `/dashboard` : l'application web.

## Publier l'APK Android

Les boutons « Télécharger » pointent par défaut vers `/tracklyst.apk`, servi par notre serveur. À chaque nouvelle version :

```bash
# APK du dernier build EAS production (lien « Install » sur expo.dev)
curl -L -o .next/standalone/public/tracklyst.apk "<lien de l'APK>"
```

Le fichier est ignoré par git (`/public/*.apk`). Pour héberger l'APK ailleurs, définir l'URL complète **avant** `pnpm build` :

```
NEXT_PUBLIC_ANDROID_APK_URL=https://exemple.com/tracklyst.apk
NEXT_PUBLIC_SITE_URL=https://tracklyst.exemple.com   # aperçus de partage (Open Graph)
```

Côté Nginx, servir l'APK avec le bon type : `types { application/vnd.android.package-archive apk; }`.

## Installer sur le téléphone (PWA)

- **Android (Chrome)** : menu ⋮ → « Installer l'application ».
- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».
