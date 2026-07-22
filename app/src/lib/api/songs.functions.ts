import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { MySong, SearchSong, SongDetail, SongPlayer, SongStat } from "../types";
import { db } from "../db.server";
import { loadUserSongs } from "../queries.server";
import { getSessionUser, requireUser } from "../session.server";

function hueFromText(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

interface SearchRow {
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
}

export const searchSongs = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      q: z.string().trim().default(""),
      limit: z.number().int().min(1).max(100).default(60),
    }),
  )
  .handler(async ({ data }): Promise<SearchSong[]> => {
    const viewer = await getSessionUser();
    const like = `%${data.q.replace(/[%_]/g, "")}%`;
    const res = await db()
      .prepare(
        `SELECT s.id, s.title, s.artist, s.genre, s.year, s.hue, s.artwork_url, s.preview_url,
                (SELECT COUNT(DISTINCT user_id) FROM user_songs WHERE song_id = s.id) AS players,
                (SELECT AVG(difficulty) FROM user_songs WHERE song_id = s.id) AS avg_diff,
                EXISTS(SELECT 1 FROM user_songs WHERE song_id = s.id AND user_id = ?) AS in_lib
         FROM songs s
         WHERE (? = '' OR s.title LIKE ? OR s.artist LIKE ? OR s.genre LIKE ?)
         ORDER BY players DESC, s.title ASC
         LIMIT ?`,
      )
      .bind(viewer?.id ?? 0, data.q, like, like, like, data.limit)
      .all<SearchRow>();
    return (res.results ?? []).map((r) => ({
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
      inLibrary: r.in_lib === 1,
    }));
  });

export const getSongDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<SongDetail | null> => {
    const viewer = await getSessionUser();
    const database = db();
    const songRow = await database
      .prepare(
        `SELECT s.id, s.title, s.artist, s.genre, s.year, s.hue, s.artwork_url, s.preview_url,
                (SELECT COUNT(DISTINCT user_id) FROM user_songs WHERE song_id = s.id) AS players,
                (SELECT AVG(difficulty) FROM user_songs WHERE song_id = s.id) AS avg_diff
         FROM songs s WHERE s.id = ?`,
      )
      .bind(data.songId)
      .first<{
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
      }>();
    if (!songRow) return null;

    const song: SongStat = {
      id: songRow.id,
      title: songRow.title,
      artist: songRow.artist,
      genre: songRow.genre,
      year: songRow.year,
      hue: songRow.hue,
      artworkUrl: songRow.artwork_url ?? "",
      previewUrl: songRow.preview_url ?? "",
      players: songRow.players,
      avgDifficulty: songRow.avg_diff,
    };

    const playersRes = await database
      .prepare(
        `SELECT u.username, u.display_name, u.avatar_hue, us.difficulty, us.note,
                i.id AS inst_id, i.name AS inst_name, i.slug AS inst_slug, i.emoji AS inst_emoji
         FROM user_songs us
         JOIN users u ON u.id = us.user_id
         JOIN instruments i ON i.id = us.instrument_id
         WHERE us.song_id = ?
         ORDER BY us.difficulty ASC, u.display_name ASC
         LIMIT 60`,
      )
      .bind(data.songId)
      .all<{
        username: string;
        display_name: string;
        avatar_hue: number;
        difficulty: number;
        note: string;
        inst_id: number;
        inst_name: string;
        inst_slug: string;
        inst_emoji: string;
      }>();
    const players: SongPlayer[] = (playersRes.results ?? []).map((r) => ({
      username: r.username,
      displayName: r.display_name,
      avatarHue: r.avatar_hue,
      difficulty: r.difficulty,
      note: r.note,
      instrument: { id: r.inst_id, name: r.inst_name, slug: r.inst_slug, emoji: r.inst_emoji },
    }));

    const byInstRes = await database
      .prepare(
        `SELECT i.id, i.name, i.slug, i.emoji,
                AVG(us.difficulty) AS avg_diff, COUNT(DISTINCT us.user_id) AS players
         FROM user_songs us JOIN instruments i ON i.id = us.instrument_id
         WHERE us.song_id = ?
         GROUP BY i.id ORDER BY players DESC`,
      )
      .bind(data.songId)
      .all<{
        id: number;
        name: string;
        slug: string;
        emoji: string;
        avg_diff: number;
        players: number;
      }>();
    const byInstrument = (byInstRes.results ?? []).map((r) => ({
      instrument: { id: r.id, name: r.name, slug: r.slug, emoji: r.emoji },
      avgDifficulty: r.avg_diff,
      players: r.players,
    }));

    let mine: MySong[] = [];
    if (viewer) {
      const allMine = await loadUserSongs(viewer.id);
      mine = allMine.filter((m) => m.song.id === data.songId);
    }

    const likeCount = await database
      .prepare("SELECT COUNT(*) AS n FROM song_likes WHERE song_id = ?")
      .bind(data.songId)
      .first<{ n: number }>();
    const likedRow = viewer
      ? await database
          .prepare("SELECT 1 AS x FROM song_likes WHERE song_id = ? AND user_id = ?")
          .bind(data.songId, viewer.id)
          .first<{ x: number }>()
      : null;

    const ratingAgg = await database
      .prepare("SELECT AVG(rating) AS avg, COUNT(*) AS n FROM song_ratings WHERE song_id = ?")
      .bind(data.songId)
      .first<{ avg: number | null; n: number }>();
    const myRatingRow = viewer
      ? await database
          .prepare("SELECT rating FROM song_ratings WHERE song_id = ? AND user_id = ?")
          .bind(data.songId, viewer.id)
          .first<{ rating: number }>()
      : null;

    return {
      song,
      players,
      byInstrument,
      mine,
      likes: likeCount?.n ?? 0,
      likedByMe: !!likedRow,
      ratingAvg: ratingAgg?.avg ?? null,
      ratingCount: ratingAgg?.n ?? 0,
      myRating: myRatingRow?.rating ?? 0,
    };
  });

const addSchema = z.object({
  songId: z.number().int().positive(),
  instrumentId: z.number().int().positive(),
  difficulty: z.number().int().min(1).max(5),
  note: z.string().trim().max(200).default(""),
});

export const addUserSong = createServerFn({ method: "POST" })
  .inputValidator(addSchema)
  .handler(async ({ data }) => {
    const user = await requireUser();
    const database = db();
    const song = await database.prepare("SELECT id FROM songs WHERE id = ?").bind(data.songId).first();
    const inst = await database
      .prepare("SELECT id FROM instruments WHERE id = ?")
      .bind(data.instrumentId)
      .first();
    if (!song || !inst) return { ok: false as const, error: "Unknown song or instrument" };
    await database
      .prepare(
        `INSERT INTO user_songs (user_id, song_id, instrument_id, difficulty, note)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, song_id, instrument_id)
         DO UPDATE SET difficulty = excluded.difficulty, note = excluded.note`,
      )
      .bind(user.id, data.songId, data.instrumentId, data.difficulty, data.note)
      .run();
    return { ok: true as const };
  });

export const removeUserSong = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userSongId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await db()
      .prepare("DELETE FROM user_songs WHERE id = ? AND user_id = ?")
      .bind(data.userSongId, user.id)
      .run();
    return { ok: true as const };
  });

export const addCustomSong = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().trim().min(1, "Add a song title").max(120),
      artist: z.string().trim().min(1, "Add an artist").max(120),
      genre: z.string().trim().max(40).default(""),
      year: z.number().int().min(1000).max(2100).nullable().default(null),
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
        `INSERT OR IGNORE INTO songs (title, artist, genre, year, hue, added_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(data.title, data.artist, data.genre, data.year, hue, user.id)
      .run();
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

export const listMySongs = createServerFn({ method: "GET" }).handler(async (): Promise<MySong[]> => {
  const user = await requireUser();
  return loadUserSongs(user.id);
});
