import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { catalogKey } from "../itunes";
import { db } from "../db.server";
import { getSessionUser, requireUser } from "../session.server";

function hueFromText(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

export interface TrackAnnotation {
  songId: number | null;
  players: number;
  avgDifficulty: number | null;
  inLibrary: boolean;
}

/**
 * Annotate catalog search hits (matched by title+artist) with our own community
 * data — player count, difficulty, and whether it's already in your library.
 * D1-only: the actual catalog search runs client-side (see src/lib/itunes.ts),
 * because Apple rate-limits the shared Worker egress IP.
 */
export const annotateCatalog = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      tracks: z
        .array(z.object({ title: z.string().max(200), artist: z.string().max(200) }))
        .max(30),
    }),
  )
  .handler(async ({ data }): Promise<Record<string, TrackAnnotation>> => {
    const out: Record<string, TrackAnnotation> = {};
    if (data.tracks.length === 0) return out;
    const viewer = await getSessionUser();
    const database = db();

    const titles = [...new Set(data.tracks.map((t) => t.title.toLowerCase()))];
    const placeholders = titles.map(() => "?").join(",");
    const dbRows = await database
      .prepare(
        `SELECT s.id, s.title, s.artist,
                (SELECT COUNT(DISTINCT user_id) FROM user_songs WHERE song_id = s.id) AS players,
                (SELECT AVG(difficulty) FROM user_songs WHERE song_id = s.id) AS avg_diff
         FROM songs s WHERE lower(s.title) IN (${placeholders})`,
      )
      .bind(...titles)
      .all<{ id: number; title: string; artist: string; players: number; avg_diff: number | null }>();

    const dbByKey = new Map<string, { id: number; players: number; avgDiff: number | null }>();
    for (const r of dbRows.results ?? []) {
      dbByKey.set(catalogKey(r.title, r.artist), { id: r.id, players: r.players, avgDiff: r.avg_diff });
    }

    let librarySet = new Set<number>();
    if (viewer) {
      const lib = await database
        .prepare("SELECT song_id FROM user_songs WHERE user_id = ?")
        .bind(viewer.id)
        .all<{ song_id: number }>();
      librarySet = new Set((lib.results ?? []).map((r) => r.song_id));
    }

    for (const t of data.tracks) {
      const match = dbByKey.get(catalogKey(t.title, t.artist));
      out[catalogKey(t.title, t.artist)] = {
        songId: match?.id ?? null,
        players: match?.players ?? 0,
        avgDifficulty: match?.avgDiff ?? null,
        inLibrary: match ? librarySet.has(match.id) : false,
      };
    }
    return out;
  });

// Add a catalog track to the current user's library (creates/enriches the song
// row, then upserts the user_song with instrument + difficulty).
export const addCatalogSong = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      externalId: z.string().max(40).default(""),
      title: z.string().trim().min(1).max(160),
      artist: z.string().trim().min(1).max(160),
      genre: z.string().trim().max(60).default(""),
      year: z.number().int().min(1000).max(2100).nullable().default(null),
      artworkUrl: z.string().trim().max(400).default(""),
      previewUrl: z.string().trim().max(400).default(""),
      instrumentId: z.number().int().positive(),
      difficulty: z.number().int().min(1).max(5),
      note: z.string().trim().max(200).default(""),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true; songId: number } | { ok: false; error: string }> => {
    const user = await requireUser();
    const database = db();
    const inst = await database
      .prepare("SELECT id FROM instruments WHERE id = ?")
      .bind(data.instrumentId)
      .first();
    if (!inst) return { ok: false, error: "Unknown instrument" };

    const hue = hueFromText(`${data.title} ${data.artist}`);
    await database
      .prepare(
        `INSERT OR IGNORE INTO songs (title, artist, genre, year, hue, artwork_url, preview_url, external_id, added_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        data.title,
        data.artist,
        data.genre,
        data.year,
        hue,
        data.artworkUrl,
        data.previewUrl,
        data.externalId,
        user.id,
      )
      .run();
    // Backfill artwork/preview on a pre-existing (e.g. seeded) row that had none.
    if (data.artworkUrl) {
      await database
        .prepare(
          `UPDATE songs SET artwork_url = ?, preview_url = ?, external_id = ?
           WHERE title = ? AND artist = ? AND (artwork_url = '' OR artwork_url IS NULL)`,
        )
        .bind(data.artworkUrl, data.previewUrl, data.externalId, data.title, data.artist)
        .run();
    }

    const songRow = await database
      .prepare("SELECT id FROM songs WHERE title = ? AND artist = ?")
      .bind(data.title, data.artist)
      .first<{ id: number }>();
    if (!songRow) return { ok: false, error: "Could not save the song" };

    await database
      .prepare(
        `INSERT INTO user_songs (user_id, song_id, instrument_id, difficulty, note)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, song_id, instrument_id)
         DO UPDATE SET difficulty = excluded.difficulty, note = excluded.note`,
      )
      .bind(user.id, songRow.id, data.instrumentId, data.difficulty, data.note)
      .run();
    return { ok: true, songId: songRow.id };
  });
