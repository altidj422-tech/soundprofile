import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SessionUser } from "../types";
import { db } from "../db.server";
import { hashPassword, verifyPassword } from "../password.server";
import { createSession, destroySession, getSessionUser } from "../session.server";

export type AuthResult = { ok: true; user: SessionUser } | { ok: false; error: string };

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be 20 characters or fewer")
  .regex(/^[a-z0-9_]+$/, "Use only lowercase letters, numbers, and underscores");

interface UserRow {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  avatar_hue: number;
  avatar_url: string;
  password_hash: string;
  password_salt: string;
  is_seed: number;
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

export const signup = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().trim().toLowerCase().email("Enter a valid email"),
      username: usernameSchema,
      displayName: z.string().trim().min(1, "Add a display name").max(40),
      password: z.string().min(6, "Password must be at least 6 characters").max(200),
    }),
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    const database = db();
    const existing = await database
      .prepare("SELECT id, email, username FROM users WHERE email = ? OR username = ?")
      .bind(data.email, data.username)
      .first<{ id: number; email: string | null; username: string }>();
    if (existing) {
      if (existing.email === data.email)
        return { ok: false, error: "That email is already registered" };
      return { ok: false, error: "That username is taken" };
    }

    const { hash, salt } = await hashPassword(data.password);
    const hue = Math.floor(Math.random() * 360);
    const inserted = await database
      .prepare(
        `INSERT INTO users (email, username, display_name, avatar_hue, password_hash, password_salt, is_seed)
         VALUES (?, ?, ?, ?, ?, ?, 0) RETURNING id, username, display_name, email, avatar_hue, avatar_url`,
      )
      .bind(data.email, data.username, data.displayName, hue, hash, salt)
      .first<UserRow>();
    if (!inserted) return { ok: false, error: "Could not create the account, try again" };

    await createSession(inserted.id);
    return { ok: true, user: toSessionUser(inserted) };
  });

export const login = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      identifier: z.string().trim().min(1, "Enter your email or username"),
      password: z.string().min(1, "Enter your password"),
    }),
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    const id = data.identifier.toLowerCase();
    const row = await db()
      .prepare(
        `SELECT id, username, display_name, email, avatar_hue, avatar_url, password_hash, password_salt, is_seed
         FROM users WHERE (email = ? OR username = ?) AND is_seed = 0`,
      )
      .bind(id, id)
      .first<UserRow>();
    if (!row) return { ok: false, error: "No account found with those details" };
    const ok = await verifyPassword(data.password, row.password_hash, row.password_salt);
    if (!ok) return { ok: false, error: "Incorrect password" };
    await createSession(row.id);
    return { ok: true, user: toSessionUser(row) };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  await destroySession();
  return { ok: true as const };
});

// Current signed-in user + whether they still need onboarding (no instruments).
export const getMe = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ user: SessionUser | null; needsOnboarding: boolean }> => {
    const user = await getSessionUser();
    if (!user) return { user: null, needsOnboarding: false };
    const row = await db()
      .prepare("SELECT COUNT(*) AS n FROM user_instruments WHERE user_id = ?")
      .bind(user.id)
      .first<{ n: number }>();
    return { user, needsOnboarding: (row?.n ?? 0) === 0 };
  },
);
