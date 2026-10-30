import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for portal accounts.
 *
 * scrypt is deliberately used through Node's native crypto module so the
 * credential store has no external runtime dependency. The encoded value keeps
 * the cost parameters next to the salt and digest, allowing them to be raised
 * later without invalidating existing accounts.
 */

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

type ScryptOptions = {
  N: number;
  r: number;
  p: number;
  maxmem: number;
};

function deriveKey(
  password: string,
  salt: string,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = await deriveKey(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEMORY,
  });
  return [
    "scrypt",
    "v1",
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt,
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const [scheme, version, n, r, p, salt, digest] = encoded.split("$");
    if (scheme !== "scrypt" || version !== "v1" || !salt || !digest) return false;

    const expected = Buffer.from(digest, "base64url");
    if (expected.length < 32) return false;

    const derived = await deriveKey(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAX_MEMORY,
    });

    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * A valid scrypt record used to equalise work when an email has no account.
 * Login rejects either way; this simply avoids an obvious timing distinction.
 */
export const DUMMY_PASSWORD_HASH =
  "scrypt$v1$16384$8$1$YWljdGUtc3VyYWtzaGEtZHVtbXk$Zv3eHofhWiwgqPGDUd8O5Z8XrLtVJDMxPzTGPu8xGQU";
