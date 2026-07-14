import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

/**
 * Operator password hashing (plan §1.7 — hashed credentials only, NFR-008 intent).
 * Node's built-in scrypt (N=16384, r=8, p=1 defaults) — no external dependency.
 * Stored format: `scrypt:<salt b64url>:<hash b64url>`.
 */

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split(":");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  if (salt.length === 0 || expected.length === 0) return false;
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(derived, expected);
}

/**
 * A syntactically valid hash of a random throwaway string. Login verifies against
 * it when the email is unknown so response timing does not reveal which operator
 * emails exist. Not a credential.
 */
export const DUMMY_PASSWORD_HASH =
  "scrypt:GFem2Zb7_-Ev8EhfLJvInA:h-X5zyp-BkHLQvTxWHSepduGH-GJilsip0X7-GZsVlN6Df7OYViSr1fjDImKka0U8c9V6LcMxTGpGmHBlDMCSQ";
