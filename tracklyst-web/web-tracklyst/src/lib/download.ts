/**
 * Lien de l'APK Android. Par défaut, le fichier servi par notre serveur
 * (public/tracklyst.apk, copié au déploiement) ; sinon une URL complète.
 */
export const APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL || "/tracklyst.apk";
