import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { db } from "../db.server";
import { requireUser } from "../session.server";

// The viewer's own star ratings ({ songId, rating }) — used to light up the
// rater on song pages the loader hasn't already hydrated.
export const getMyRatings = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ songId: number; rating: number }[]> => {
    const user = await requireUser();
    const res = await db()
      .prepare("SELECT song_id, rating FROM song_ratings WHERE user_id = ?")
      .bind(user.id)
      .all<{ song_id: number; rating: number }>();
    return (res.results ?? []).map((r) => ({ songId: r.song_id, rating: r.rating }));
  },
);

export const rateSong = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      songId: z.number().int().positive(),
      rating: z.number().int().min(1).max(5),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const song = await db()
      .prepare("SELECT id FROM songs WHERE id = ?")
      .bind(data.songId)
      .first();
    if (!song) return { ok: false, error: "Unknown song" };
    await db()
      .prepare(
        `INSERT INTO song_ratings (user_id, song_id, rating, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, song_id)
         DO UPDATE SET rating = excluded.rating, updated_at = datetime('now')`,
      )
      .bind(user.id, data.songId, data.rating)
      .run();
    return { ok: true };
  });

export const unrateSong = createServerFn({ method: "POST" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await requireUser();
    await db()
      .prepare("DELETE FROM song_ratings WHERE user_id = ? AND song_id = ?")
      .bind(user.id, data.songId)
      .run();
    return { ok: true };
  });
