// Cookie-based sessions for SoundProfile's own accounts (app-local auth — this
// is a type:"website" build, no Higgsfield sign-in). Server-only.
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

import type { SessionUser } from "./types";
import { db } from "./db.server";

const COOKIE = "sp_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface UserRow {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  avatar_hue: number;
  avatar_url: string;
}

function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    avatarHue: row.avatar_hue,
    avatarUrl: row.avatar_url ?? "",
  };
}

export async function createSession(userId: number): Promise<void> {
  const token = randomToken();
  const expires = new Date(Date.now() + MAX_AGE_SEC * 1000).toISOString();
  await db()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expires)
    .run();
  setCookie(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const row = await db()
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.email, u.avatar_hue, u.avatar_url
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .bind(token)
    .first<UserRow>();
  return row ? toSessionUser(row) : null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function destroySession(): Promise<void> {
  const token = getCookie(COOKIE);
  if (token) {
    await db().prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  deleteCookie(COOKIE, { path: "/" });
}
