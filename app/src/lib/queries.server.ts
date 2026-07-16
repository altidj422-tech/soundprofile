// Shared server-only D1 loaders used by multiple server-function modules.
import type { MySong, UserInstrument } from "./types";
import { db } from "./db.server";

interface UserSongRow {
  user_song_id: number;
  difficulty: number;
  note: string;
  song_id: number;
  title: string;
  artist: string;
  genre: string;
  year: number | null;
  hue: number;
  inst_id: number;
  inst_name: string;
  inst_slug: string;
  inst_emoji: string;
  players: number;
  avg_diff: number | null;
}

export async function loadUserSongs(userId: number): Promise<MySong[]> {
  const res = await db()
    .prepare(
      `SELECT us.id AS user_song_id, us.difficulty, us.note,
              s.id AS song_id, s.title, s.artist, s.genre, s.year, s.hue,
              i.id AS inst_id, i.name AS inst_name, i.slug AS inst_slug, i.emoji AS inst_emoji,
              (SELECT COUNT(DISTINCT user_id) FROM user_songs WHERE song_id = s.id) AS players,
              (SELECT AVG(difficulty) FROM user_songs WHERE song_id = s.id) AS avg_diff
       FROM user_songs us
       JOIN songs s ON s.id = us.song_id
       JOIN instruments i ON i.id = us.instrument_id
       WHERE us.user_id = ?
       ORDER BY s.title`,
    )
    .bind(userId)
    .all<UserSongRow>();
  return (res.results ?? []).map((r) => ({
    userSongId: r.user_song_id,
    difficulty: r.difficulty,
    note: r.note,
    song: {
      id: r.song_id,
      title: r.title,
      artist: r.artist,
      genre: r.genre,
      year: r.year,
      hue: r.hue,
      players: r.players,
      avgDifficulty: r.avg_diff,
    },
    instrument: { id: r.inst_id, name: r.inst_name, slug: r.inst_slug, emoji: r.inst_emoji },
  }));
}

export async function loadUserInstruments(userId: number): Promise<UserInstrument[]> {
  const res = await db()
    .prepare(
      `SELECT i.id, i.name, i.slug, i.emoji, ui.skill
       FROM user_instruments ui JOIN instruments i ON i.id = ui.instrument_id
       WHERE ui.user_id = ? ORDER BY ui.skill DESC, i.name`,
    )
    .bind(userId)
    .all<UserInstrument>();
  return res.results ?? [];
}
