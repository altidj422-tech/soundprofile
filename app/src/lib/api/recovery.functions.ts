import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { db } from "../db.server";
import { hashPassword, verifyPassword } from "../password.server";
import { requireUser } from "../session.server";

// Unambiguous alphabet (no I/L/O/0/1) for a readable recovery code.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let s = "";
  for (let i = 0; i < 16; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s; // 16 chars, ~78 bits
}

function displayCode(norm: string): string {
  return norm.match(/.{1,4}/g)!.join("-"); // XXXX-XXXX-XXXX-XXXX
}

function normalizeInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const getRecoveryStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ hasCode: boolean }> => {
    const user = await requireUser();
    const row = await db()
      .prepare("SELECT recovery_hash FROM users WHERE id = ?")
      .bind(user.id)
      .first<{ recovery_hash: string }>();
    return { hasCode: !!row?.recovery_hash };
  },
);

// Generate (or regenerate) a recovery code — returns the plaintext ONCE. We
// store only its hash, so it can't be recovered later.
export const generateRecoveryCode = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true; code: string }> => {
    const user = await requireUser();
    const norm = randomCode();
    const { hash, salt } = await hashPassword(norm);
    await db()
      .prepare("UPDATE users SET recovery_hash = ?, recovery_salt = ? WHERE id = ?")
      .bind(hash, salt, user.id)
      .run();
    return { ok: true, code: displayCode(norm) };
  },
);

export const resetPasswordWithCode = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      username: z.string().trim().toLowerCase().min(1).max(60),
      code: z.string().trim().min(1).max(40),
      newPassword: z.string().min(6, "Password must be at least 6 characters").max(200),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const database = db();
    const idf = data.username;
    const row = await database
      .prepare(
        "SELECT id, recovery_hash, recovery_salt FROM users WHERE (username = ? OR email = ?) AND is_seed = 0",
      )
      .bind(idf, idf)
      .first<{ id: number; recovery_hash: string; recovery_salt: string }>();

    const generic = "That username or recovery code isn't right.";
    if (!row || !row.recovery_hash) return { ok: false, error: generic };

    const ok = await verifyPassword(normalizeInput(data.code), row.recovery_hash, row.recovery_salt);
    if (!ok) return { ok: false, error: generic };

    const { hash, salt } = await hashPassword(data.newPassword);
    await database.batch([
      // set new password + burn the recovery code (single use)
      database
        .prepare(
          "UPDATE users SET password_hash = ?, password_salt = ?, recovery_hash = '', recovery_salt = '' WHERE id = ?",
        )
        .bind(hash, salt, row.id),
      // sign out everywhere
      database.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.id),
    ]);
    return { ok: true };
  });
