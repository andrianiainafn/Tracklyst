/**
 * Chiffrement de bout en bout — cœur commun (copie identique côté web :
 * tracklyst-web/web-tracklyst/src/lib/e2ee/core.ts). Ne pas modifier l'un
 * sans l'autre : les deux doivent lire ce que l'autre écrit.
 *
 *  - Textes : AES-256-GCM avec la clé du budget, format « e1:<base64(nonce|chiffré)> ».
 *  - Clé du budget : 32 octets aléatoires, « emballée » pour chaque membre avec
 *    sa clé publique X25519 (boîte scellée : clé éphémère + HKDF-SHA256 + AES-GCM).
 *  - Clé privée de l'utilisateur : chiffrée par scrypt(code secret) et, en double,
 *    par scrypt(clé de secours). Le serveur ne voit jamais le code ni la clé privée.
 */
import { gcm } from "@noble/ciphers/aes";
import { x25519 } from "@noble/curves/ed25519";
import { hkdf } from "@noble/hashes/hkdf";
import { scryptAsync } from "@noble/hashes/scrypt";
import { sha256 } from "@noble/hashes/sha2";

export type RandomBytes = (length: number) => Uint8Array;

export const TEXT_PREFIX = "e1:";
const KEY_PREFIX = "k1:";
/** Affiché quand un texte chiffré ne peut pas être lu (clé absente). */
export const LOCKED_TEXT = "Texte chiffré";

const SCRYPT_LOG_N = 14; // 16 Mo, ~1 s sur téléphone
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// ─── Base64 (sans dépendre de Buffer / atob) ─────────────────────────────────
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function toB64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? B64[n & 63] : "=";
  }
  return out;
}

export function fromB64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let j = 0;
  for (const ch of clean) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new Error("base64 invalide");
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[j++] = (buffer >> bits) & 255;
    }
  }
  return out;
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

// UTF-8 sans TextEncoder/TextDecoder (absents de certains moteurs mobiles).
export function utf8ToBytes(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}

function utf8Decode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let c: number;
    if (b < 0x80) c = b;
    else if (b < 0xe0) c = ((b & 31) << 6) | (bytes[i++] & 63);
    else if (b < 0xf0) c = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else c = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    out += String.fromCodePoint(c);
  }
  return out;
}

export const isEncrypted = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith(TEXT_PREFIX);

export function createE2ee(random: RandomBytes) {
  const seal = (key: Uint8Array, plain: Uint8Array) => {
    const nonce = random(12);
    return concat(nonce, gcm(key, nonce).encrypt(plain));
  };
  const open = (key: Uint8Array, sealed: Uint8Array) => gcm(key, sealed.slice(0, 12)).decrypt(sealed.slice(12));

  const deriveKek = async (secret: string, salt: Uint8Array, logN: number) =>
    scryptAsync(utf8ToBytes(typeof secret.normalize === "function" ? secret.normalize("NFKC") : secret), salt, { N: 2 ** logN, r: 8, p: 1, dkLen: 32 });

  return {
    // ── Textes ────────────────────────────────────────────────────────────
    encryptText(key: Uint8Array, text: string | null | undefined): string | null {
      if (text === null || text === undefined || text === "") return text ?? null;
      if (isEncrypted(text)) return text;
      return TEXT_PREFIX + toB64(seal(key, utf8ToBytes(text)));
    },

    /** Texte en clair ; un texte non chiffré (ancienne donnée) est rendu tel quel. */
    decryptText(key: Uint8Array | null | undefined, value: string | null | undefined): string | null {
      if (value === null || value === undefined) return null;
      if (!isEncrypted(value)) return value;
      if (!key) return LOCKED_TEXT;
      try {
        return utf8Decode(open(key, fromB64(value.slice(TEXT_PREFIX.length))));
      } catch {
        return LOCKED_TEXT;
      }
    },

    // ── Clés de budget ────────────────────────────────────────────────────
    newBudgetKey: () => random(32),

    /** Boîte scellée : seule la clé privée correspondant à `publicKeyB64` l'ouvre. */
    wrapBudgetKey(budgetKey: Uint8Array, publicKeyB64: string): string {
      const recipient = fromB64(publicKeyB64);
      const ephemeral = random(32);
      const ephemeralPub = x25519.getPublicKey(ephemeral);
      const shared = x25519.getSharedSecret(ephemeral, recipient);
      const k = hkdf(sha256, shared, concat(ephemeralPub, recipient), "tracklyst-budget-key-v1", 32);
      return KEY_PREFIX + toB64(concat(ephemeralPub, seal(k, budgetKey)));
    },

    unwrapBudgetKey(wrapped: string, privateKey: Uint8Array): Uint8Array {
      const raw = fromB64(wrapped.slice(KEY_PREFIX.length));
      const ephemeralPub = raw.slice(0, 32);
      const recipient = x25519.getPublicKey(privateKey);
      const shared = x25519.getSharedSecret(privateKey, ephemeralPub);
      const k = hkdf(sha256, shared, concat(ephemeralPub, recipient), "tracklyst-budget-key-v1", 32);
      return open(k, raw.slice(32));
    },

    // ── Clés de l'utilisateur ─────────────────────────────────────────────
    generateKeyPair() {
      const privateKey = random(32);
      return { privateKey, publicKey: toB64(x25519.getPublicKey(privateKey)) };
    },

    publicKeyOf: (privateKey: Uint8Array) => toB64(x25519.getPublicKey(privateKey)),

    /** Chiffre la clé privée avec un secret (code ou clé de secours). */
    async protectPrivateKey(privateKey: Uint8Array, secret: string) {
      const salt = random(16);
      const kek = await deriveKek(secret, salt, SCRYPT_LOG_N);
      return { encrypted: KEY_PREFIX + toB64(seal(kek, privateKey)), salt: `${SCRYPT_LOG_N}:${toB64(salt)}` };
    },

    /** Lève une erreur si le secret est faux (authentification GCM). */
    async unprotectPrivateKey(encrypted: string, salt: string, secret: string): Promise<Uint8Array> {
      const [logN, saltB64] = salt.split(":");
      const kek = await deriveKek(secret, fromB64(saltB64), Number(logN));
      return open(kek, fromB64(encrypted.slice(KEY_PREFIX.length)));
    },

    /** Clé de secours : 24 caractères (≈120 bits), groupés par 4. */
    newRecoveryKey(): string {
      const bytes = random(24);
      const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join("");
      return chars.match(/.{4}/g)!.join("-");
    },
  };
}

/** Saisie de la clé de secours : majuscules, sans espaces ni tirets, regroupée par 4. */
export function normalizeRecoveryKey(raw: string) {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (chars.match(/.{1,4}/g) ?? []).join("-");
}

export type E2ee = ReturnType<typeof createE2ee>;
