import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Instrument, Recommendation, SongStat } from "../types";
import { db } from "../db.server";
import { requireUser } from "../session.server";

interface SongMeta {
  id: number;
  title: string;
  artist: string;
  genre: string;
  year: number | null;
  hue: number;
  artwork_url: string;
  preview_url: string;
}

/**
 * Collaborative-filtering recommendations. For each other musician we measure
 * how much their repertoire + instruments overlap with yours (a blended
 * Jaccard similarity), then score every song you don't yet play by the summed
 * similarity of the musicians who play it. Songs favoured by people with taste
 * like yours float to the top. Cold-start (no songs yet) falls back to
 * instrument-matched popularity.
 */
export const getRecommendations = createServerFn({ method: "GET" })
  .inputValidator(z.object({ limit: z.number().int().min(1).max(60).default(30) }).default({ limit: 30 }))
  .handler(async ({ data }): Promise<Recommendation[]> => {
    const me = await requireUser();
    const database = db();

    const [songsRes, instRes, userSongsRes, userInstRes, dismissedRes] = await Promise.all([
      database
        .prepare("SELECT id, title, artist, genre, year, hue, artwork_url, preview_url FROM songs")
        .all<SongMeta>(),
      database.prepare("SELECT id, name, slug, emoji FROM instruments").all<Instrument>(),
      database
        .prepare("SELECT user_id, song_id, instrument_id, difficulty FROM user_songs")
        .all<{ user_id: number; song_id: number; instrument_id: number; difficulty: number }>(),
      database
        .prepare("SELECT user_id, instrument_id FROM user_instruments")
        .all<{ user_id: number; instrument_id: number }>(),
      database.prepare("SELECT song_id FROM dismissed WHERE user_id = ?").bind(me.id).all<{ song_id: number }>(),
    ]);

    const songMeta = new Map<number, SongMeta>();
    for (const s of songsRes.results ?? []) songMeta.set(s.id, s);
    const instMeta = new Map<number, Instrument>();
    for (const i of instRes.results ?? []) instMeta.set(i.id, i);

    const perUserSongs = new Map<number, Set<number>>();
    const songPlayers = new Map<number, Set<number>>();
    const songInsts = new Map<number, Set<number>>();
    const songDiffSum = new Map<number, number>();
    const songDiffCount = new Map<number, number>();
    for (const r of userSongsRes.results ?? []) {
      if (!perUserSongs.has(r.user_id)) perUserSongs.set(r.user_id, new Set());
      perUserSongs.get(r.user_id)!.add(r.song_id);
      if (!songPlayers.has(r.song_id)) songPlayers.set(r.song_id, new Set());
      songPlayers.get(r.song_id)!.add(r.user_id);
      if (!songInsts.has(r.song_id)) songInsts.set(r.song_id, new Set());
      songInsts.get(r.song_id)!.add(r.instrument_id);
      songDiffSum.set(r.song_id, (songDiffSum.get(r.song_id) ?? 0) + r.difficulty);
      songDiffCount.set(r.song_id, (songDiffCount.get(r.song_id) ?? 0) + 1);
    }

    const perUserInsts = new Map<number, Set<number>>();
    for (const r of userInstRes.results ?? []) {
      if (!perUserInsts.has(r.user_id)) perUserInsts.set(r.user_id, new Set());
      perUserInsts.get(r.user_id)!.add(r.instrument_id);
    }

    const mySongs = perUserSongs.get(me.id) ?? new Set<number>();
    const myInsts = perUserInsts.get(me.id) ?? new Set<number>();
    const dismissed = new Set<number>((dismissedRes.results ?? []).map((d) => d.song_id));

    const jaccard = (a: Set<number>, b: Set<number>): number => {
      if (a.size === 0 || b.size === 0) return 0;
      let inter = 0;
      for (const x of a) if (b.has(x)) inter++;
      const union = a.size + b.size - inter;
      return union === 0 ? 0 : inter / union;
    };

    // similarity of every other user to me
    const sim = new Map<number, number>();
    let anySimilarity = false;
    for (const uid of perUserSongs.keys()) {
      if (uid === me.id) continue;
      const jSongs = jaccard(mySongs, perUserSongs.get(uid) ?? new Set());
      const jInst = jaccard(myInsts, perUserInsts.get(uid) ?? new Set());
      const s = 0.72 * jSongs + 0.28 * jInst;
      if (s > 0) {
        sim.set(uid, s);
        anySimilarity = true;
      }
    }
    // include users who only share instruments (no songs)
    for (const uid of perUserInsts.keys()) {
      if (uid === me.id || sim.has(uid)) continue;
      const jInst = jaccard(myInsts, perUserInsts.get(uid) ?? new Set());
      const s = 0.28 * jInst;
      if (s > 0) {
        sim.set(uid, s);
        anySimilarity = true;
      }
    }

    const buildStat = (id: number): SongStat => {
      const m = songMeta.get(id)!;
      const cnt = songDiffCount.get(id) ?? 0;
      return {
        id,
        title: m.title,
        artist: m.artist,
        genre: m.genre,
        year: m.year,
        hue: m.hue,
        artworkUrl: m.artwork_url ?? "",
        previewUrl: m.preview_url ?? "",
        players: songPlayers.get(id)?.size ?? 0,
        avgDifficulty: cnt > 0 ? (songDiffSum.get(id) ?? 0) / cnt : null,
      };
    };

    const matchingInstrumentsFor = (id: number): Instrument[] => {
      const set = songInsts.get(id);
      if (!set) return [];
      const out: Instrument[] = [];
      for (const iid of set) if (myInsts.has(iid) && instMeta.has(iid)) out.push(instMeta.get(iid)!);
      return out;
    };

    type Scored = { id: number; score: number; sharedWith: number };
    const scored: Scored[] = [];

    for (const [id, players] of songPlayers) {
      if (mySongs.has(id) || dismissed.has(id) || !songMeta.has(id)) continue;
      let score = 0;
      let sharedWith = 0;
      for (const uid of players) {
        const s = sim.get(uid);
        if (s && s > 0) {
          score += s;
          sharedWith++;
        }
      }
      // slight popularity nudge so ties resolve toward proven songs
      const popularity = 0.04 * Math.log(1 + players.size);
      // instrument-fit nudge (helps cold start feel personal)
      const instFit = matchingInstrumentsFor(id).length > 0 ? 0.06 : 0;

      if (anySimilarity && score <= 0 && instFit === 0) continue; // keep the feed relevant
      scored.push({ id, score: score + popularity + instFit, sharedWith });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (songPlayers.get(b.id)?.size ?? 0) - (songPlayers.get(a.id)?.size ?? 0);
    });

    const top = scored.slice(0, data.limit);
    return top.map(({ id, score, sharedWith }): Recommendation => {
      const matchingInstruments = matchingInstrumentsFor(id);
      let reason: string;
      if (sharedWith > 0) {
        reason =
          sharedWith === 1
            ? "1 musician with your taste plays this"
            : `${sharedWith} musicians with your taste play this`;
      } else if (matchingInstruments.length > 0) {
        reason = `A go-to for ${matchingInstruments[0].name} players`;
      } else {
        reason = "Rising in the community";
      }
      return { song: buildStat(id), reason, score, sharedWith, matchingInstruments };
    });
  });

export const dismissSong = createServerFn({ method: "POST" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await db()
      .prepare("INSERT OR IGNORE INTO dismissed (user_id, song_id) VALUES (?, ?)")
      .bind(user.id, data.songId)
      .run();
    return { ok: true as const };
  });
