import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { db } from "../db.server";
import { requireUser } from "../session.server";

// Song ids the viewer has liked — used to light up hearts and to keep already
// liked songs out of future feeds.
export const getLikedIds = createServerFn({ method: "GET" }).handler(
  async (): Promise<number[]> => {
    const user = await requireUser();
    const res = await db()
      .prepare("SELECT song_id FROM song_likes WHERE user_id = ?")
      .bind(user.id)
      .all<{ song_id: number }>();
    return (res.results ?? []).map((r) => r.song_id);
  },
);

export const likeSong = createServerFn({ method: "POST" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const song = await db()
      .prepare("SELECT id FROM songs WHERE id = ?")
      .bind(data.songId)
      .first();
    if (!song) return { ok: false, error: "Unknown song" };
    await db()
      .prepare("INSERT OR IGNORE INTO song_likes (user_id, song_id) VALUES (?, ?)")
      .bind(user.id, data.songId)
      .run();
    return { ok: true };
  });

export const unlikeSong = createServerFn({ method: "POST" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await requireUser();
    await db()
      .prepare("DELETE FROM song_likes WHERE user_id = ? AND song_id = ?")
      .bind(user.id, data.songId)
      .run();
    return { ok: true };
  });
