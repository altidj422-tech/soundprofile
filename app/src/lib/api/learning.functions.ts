import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { LearningSong } from "../types";
import { db } from "../db.server";
import { requireUser } from "../session.server";

interface LearningRow {
  id: number;
  title: string;
  artist: string;
  genre: string;
  year: number | null;
  hue: number;
  artwork_url: string;
  preview_url: string;
  players: number;
  avg_diff: number | null;
  in_lib: number;
  added_at: string;
}

// The viewer's Learning list, newest first, with community stats + whether the
// song is already in their playing set.
export const getLearning = createServerFn({ method: "GET" }).handler(
  async (): Promise<LearningSong[]> => {
    const user = await requireUser();
    const res = await db()
      .prepare(
        `SELECT s.id, s.title, s.artist, s.genre, s.year, s.hue, s.artwork_url, s.preview_url,
                l.created_at AS added_at,
                (SELECT COUNT(DISTINCT user_id) FROM user_songs WHERE song_id = s.id) AS players,
                (SELECT AVG(difficulty) FROM user_songs WHERE song_id = s.id) AS avg_diff,
                EXISTS(SELECT 1 FROM user_songs WHERE song_id = s.id AND user_id = ?) AS in_lib
         FROM learning l JOIN songs s ON s.id = l.song_id
         WHERE l.user_id = ?
         ORDER BY l.created_at DESC`,
      )
      .bind(user.id, user.id)
      .all<LearningRow>();
    return (res.results ?? []).map((r) => ({
      song: {
        id: r.id,
        title: r.title,
        artist: r.artist,
        genre: r.genre,
        year: r.year,
        hue: r.hue,
        artworkUrl: r.artwork_url ?? "",
        previewUrl: r.preview_url ?? "",
        players: r.players,
        avgDifficulty: r.avg_diff,
      },
      inLibrary: r.in_lib === 1,
      addedAt: r.added_at,
    }));
  },
);

// Just the song ids on the viewer's Learning list — used to light up the
// Learn toggle across the feed and song pages.
export const getLearningIds = createServerFn({ method: "GET" }).handler(
  async (): Promise<number[]> => {
    const user = await requireUser();
    const res = await db()
      .prepare("SELECT song_id FROM learning WHERE user_id = ?")
      .bind(user.id)
      .all<{ song_id: number }>();
    return (res.results ?? []).map((r) => r.song_id);
  },
);

export const addToLearning = createServerFn({ method: "POST" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const song = await db()
      .prepare("SELECT id FROM songs WHERE id = ?")
      .bind(data.songId)
      .first();
    if (!song) return { ok: false, error: "Unknown song" };
    await db()
      .prepare("INSERT OR IGNORE INTO learning (user_id, song_id) VALUES (?, ?)")
      .bind(user.id, data.songId)
      .run();
    return { ok: true };
  });

export const removeFromLearning = createServerFn({ method: "POST" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await requireUser();
    await db()
      .prepare("DELETE FROM learning WHERE user_id = ? AND song_id = ?")
      .bind(user.id, data.songId)
      .run();
    return { ok: true };
  });
