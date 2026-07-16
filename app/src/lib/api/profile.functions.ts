import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Instrument, ProfilePublic } from "../types";
import { db } from "../db.server";
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
  is_seed: number;
}

async function buildProfile(row: ProfileUserRow, viewerId: number | null): Promise<ProfilePublic> {
  const [songs, instruments] = await Promise.all([
    loadUserSongs(row.id),
    loadUserInstruments(row.id),
  ]);
  const distinctSongs = new Set(songs.map((s) => s.song.id));
  const avg =
    songs.length > 0 ? songs.reduce((a, s) => a + s.difficulty, 0) / songs.length : null;
  return {
    user: {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      bio: row.bio,
      avatarHue: row.avatar_hue,
      isSeed: row.is_seed === 1,
    },
    instruments,
    songs,
    stats: {
      songCount: distinctSongs.size,
      instrumentCount: instruments.length,
      avgDifficulty: avg,
    },
    isMe: viewerId === row.id,
  };
}

export const getMyProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProfilePublic> => {
    const user = await requireUser();
    const row = await db()
      .prepare("SELECT id, username, display_name, bio, avatar_hue, is_seed FROM users WHERE id = ?")
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
      .prepare("SELECT id, username, display_name, bio, avatar_hue, is_seed FROM users WHERE username = ?")
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

export const setMyInstruments = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      items: z
        .array(z.object({ instrumentId: z.number().int().positive(), skill: z.number().int().min(1).max(4) }))
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
