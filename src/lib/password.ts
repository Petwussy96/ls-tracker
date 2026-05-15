// Password hashing + session creation helpers.
//
// We use Node's built-in scrypt — secure, no native bindings (works fine on
// Vercel serverless), and no extra dependency.
//
// For "logging in" we sidestep Auth.js's Credentials provider (which would
// force JWT sessions) and instead create a Session row directly via the
// same Prisma adapter Auth.js uses. The session cookie name matches what
// Auth.js v5 expects, so reading sessions via `auth()` keeps working.

import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { prisma } from "./db";

const scrypt = promisify(scryptCallback);

const SCRYPT_KEY_LEN = 64;
const SCRYPT_SALT_BYTES = 16;
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

import { MIN_PASSWORD_LEN } from "./passwordConstants";
export { MIN_PASSWORD_LEN };

export function isStrongEnough(password: string): boolean {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LEN;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES).toString("hex");
  const derived = (await scrypt(password, salt, SCRYPT_KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const derived = (await scrypt(password, salt, SCRYPT_KEY_LEN)) as Buffer;
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

// Auth.js v5 picks the cookie name based on whether the site URL is https.
// In production (https on Vercel) the secure prefix is used.
function sessionCookieName(): string {
  const url = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  return url.startsWith("https://") ? "__Secure-authjs.session-token" : "authjs.session-token";
}

/** Create a Session row + set the auth cookie. Mirrors the PrismaAdapter shape. */
export async function createUserSession(userId: string): Promise<void> {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.session.create({
    data: { sessionToken, userId, expires },
  });

  cookies().set(sessionCookieName(), sessionToken, {
    httpOnly: true,
    secure: sessionCookieName().startsWith("__Secure-"),
    sameSite: "strict",
    expires,
    path: "/",
  });
}
