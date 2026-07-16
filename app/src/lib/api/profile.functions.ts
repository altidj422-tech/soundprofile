import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Instrument, ProfilePublic } from "../types";
import { db } from "../db.server";
import { friendCountOf, loadViewerRelations } from "../friends.server";
import { loadUserInstruments, loadUserSongs } from "../queries.server";
import { getSessionUser, requireUser } from "../session.server";

export const getInstruments = createServerFn({ method: "GET" }).handler(
  async (): Promise<Instrument[]> => {
    const res = await db()
      .prepare("SELECT id, name, slug, emoji FROM instruments ORDER BY id")
      .all<Instrument>();
    return res.results ?? [];
  },
);

interface ProfileUserRow {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  avatar_hue: number;
  avatar_url: string;
  is_seed: number;
}

const PROFILE_COLUMNS = "id, username, display_name, bio, avatar_hue, avatar_url, is_seed";

async function buildProfile(row: ProfileUserRow, viewerId: number | null): Promise<ProfilePublic> {
  const [songs, instruments, friendCount, relations] = await Promise.all([
    loadUserSongs(row.id),
    loadUserInstruments(row.id),
    friendCountOf(row.id),
    viewerId != null ? loadViewerRelations(viewerId) : Promise.resolve(null),
  ]);
  const distinctSongs = new Set(songs.map((s) => s.song.id));
  const avg = songs.length > 0 ? songs.reduce((a, s) => a + s.difficulty, 0) / songs.length : null;
  return {
    user: {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      bio: row.bio,
      avatarHue: row.avatar_hue,
      avatarUrl: row.avatar_url ?? "",
      isSeed: row.is_seed === 1,
    },
    instruments,
    songs,
    stats: {
      songCount: distinctSongs.size,
      instrumentCount: instruments.length,
      avgDifficulty: avg,
      friendCount,
    },
    isMe: viewerId === row.id,
    friendStatus: relations ? relations.statusFor(row.id) : "none",
  };
}

export const getMyProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProfilePublic> => {
    const user = await requireUser();
    const row = await db()
      .prepare(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ?`)
      .bind(user.id)
      .first<ProfileUserRow>();
    if (!row) throw new Error("NOT_FOUND");
    return buildProfile(row, user.id);
  },
);

export const getUserProfile = createServerFn({ method: "GET" })
  .inputValidator(z.object({ username: z.string().trim().toLowerCase() }))
  .handler(async ({ data }): Promise<ProfilePublic | null> => {
    const viewer = await getSessionUser();
    const row = await db()
      .prepare(`SELECT ${PROFILE_COLUMNS} FROM users WHERE username = ?`)
      .bind(data.username)
      .first<ProfileUserRow>();
    if (!row) return null;
    return buildProfile(row, viewer?.id ?? null);
  });

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      displayName: z.string().trim().min(1, "Add a display name").max(40),
      bio: z.string().trim().max(280).default(""),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    await db()
      .prepare("UPDATE users SET display_name = ?, bio = ? WHERE id = ?")
      .bind(data.displayName, data.bio, user.id)
      .run();
    return { ok: true as const };
  });

// Max stored photo payload. The client resizes to a small square before upload,
// so a real photo lands well under this; the cap guards the D1 row either way.
const MAX_AVATAR_CHARS = 700_000; // ~500 KB of base64

const avatarSchema = z
  .string()
  .max(MAX_AVATAR_CHARS, "That image is too large — pick a smaller one")
  .refine(
    (v) => v === "" || /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
    "Unsupported image format",
  );

// Set (or clear, with "") the signed-in user's profile photo. Stored as a small
// client-resized data URL — no object storage needed.
export const setAvatarPhoto = createServerFn({ method: "POST" })
  .inputValidator(z.object({ dataUrl: avatarSchema }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await db()
      .prepare("UPDATE users SET avatar_url = ? WHERE id = ?")
      .bind(data.dataUrl, user.id)
      .run();
    return { ok: true as const };
  });

export const setMyInstruments = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      items: z
        .array(
          z.object({
            instrumentId: z.number().int().positive(),
            skill: z.number().int().min(1).max(4),
          }),
        )
        .max(13),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const database = db();
    const statements = [
      database.prepare("DELETE FROM user_instruments WHERE user_id = ?").bind(user.id),
      ...data.items.map((it) =>
        database
          .prepare(
            "INSERT OR REPLACE INTO user_instruments (user_id, instrument_id, skill) VALUES (?, ?, ?)",
          )
          .bind(user.id, it.instrumentId, it.skill),
      ),
    ];
    await database.batch(statements);
    return { ok: true as const, count: data.items.length };
  });
