import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { FeedFriend, Instrument, Recommendation, SongStat, TechniqueTag } from "../types";
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

    const [
      songsRes,
      instRes,
      userSongsRes,
      userInstRes,
      dismissedRes,
      friendshipsRes,
      likesRes,
      ratingsRes,
    ] = await Promise.all([
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
        database
          .prepare("SELECT song_id FROM dismissed WHERE user_id = ?")
          .bind(me.id)
          .all<{ song_id: number }>(),
        database
          .prepare(
            "SELECT user_id, friend_id FROM friendships WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'",
          )
          .bind(me.id, me.id)
          .all<{ user_id: number; friend_id: number }>(),
        database
          .prepare("SELECT user_id, song_id FROM song_likes")
          .all<{ user_id: number; song_id: number }>(),
        database
          .prepare("SELECT user_id, song_id, rating FROM song_ratings")
          .all<{ user_id: number; song_id: number; rating: number }>(),
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

    // Likes — a denser, lower-friction taste signal than "songs I can play".
    const perUserLikes = new Map<number, Set<number>>();
    const songLikers = new Map<number, Set<number>>();
    for (const r of likesRes.results ?? []) {
      if (!perUserLikes.has(r.user_id)) perUserLikes.set(r.user_id, new Set());
      perUserLikes.get(r.user_id)!.add(r.song_id);
      if (!songLikers.has(r.song_id)) songLikers.set(r.song_id, new Set());
      songLikers.get(r.song_id)!.add(r.user_id);
    }

    // Star ratings (1..5) — a graded quality signal. Unlike a like (a binary
    // "more like this" that removes the song from your feed), a rating says how
    // GOOD the song is. It drives a community-quality nudge in ranking below; it
    // does NOT change who-is-similar-to-me and never hides a song.
    const songRatingSum = new Map<number, number>();
    const songRatingCount = new Map<number, number>();
    let ratingTotal = 0;
    let ratingN = 0;
    for (const r of ratingsRes.results ?? []) {
      songRatingSum.set(r.song_id, (songRatingSum.get(r.song_id) ?? 0) + r.rating);
      songRatingCount.set(r.song_id, (songRatingCount.get(r.song_id) ?? 0) + 1);
      ratingTotal += r.rating;
      ratingN += 1;
    }
    const globalMeanRating = ratingN > 0 ? ratingTotal / ratingN : 3;
    const RATING_PRIOR = 4; // pretend every song carries 4 votes at the global mean
    // Bayesian ("true") average — pulls thin-sample songs toward the mean so a
    // lone 5★ can't outrank a track many people rated well. Equals the global
    // mean when a song has no ratings, making the nudge a no-op there.
    const bayesRating = (id: number): number => {
      const n = songRatingCount.get(id) ?? 0;
      if (n === 0) return globalMeanRating;
      return (RATING_PRIOR * globalMeanRating + (songRatingSum.get(id) ?? 0)) / (RATING_PRIOR + n);
    };

    const mySongs = perUserSongs.get(me.id) ?? new Set<number>();
    const myInsts = perUserInsts.get(me.id) ?? new Set<number>();
    const myLikes = perUserLikes.get(me.id) ?? new Set<number>();
    const dismissed = new Set<number>((dismissedRes.results ?? []).map((d) => d.song_id));

    // The viewer's accepted friends (either direction of the edge).
    const friendIds = new Set<number>();
    for (const f of friendshipsRes.results ?? []) {
      const other = f.user_id === me.id ? f.friend_id : f.user_id;
      if (other !== me.id) friendIds.add(other);
    }

    const jaccard = (a: Set<number>, b: Set<number>): number => {
      if (a.size === 0 || b.size === 0) return 0;
      let inter = 0;
      for (const x of a) if (b.has(x)) inter++;
      const union = a.size + b.size - inter;
      return union === 0 ? 0 : inter / union;
    };

    // Similarity of every other user to me, over three signals. "Can play" is
    // earned so it keeps the largest weight; likes are cheap but far denser,
    // which is what rescues the sparsity problem. Jaccard self-damps prolific
    // likers (a huge like set inflates the union, lowering similarity), so no
    // extra normalisation is needed.
    const sim = new Map<number, number>();
    let anySimilarity = false;
    const allUsers = new Set<number>([
      ...perUserSongs.keys(),
      ...perUserLikes.keys(),
      ...perUserInsts.keys(),
    ]);
    for (const uid of allUsers) {
      if (uid === me.id) continue;
      const jSongs = jaccard(mySongs, perUserSongs.get(uid) ?? new Set());
      const jLikes = jaccard(myLikes, perUserLikes.get(uid) ?? new Set());
      const jInst = jaccard(myInsts, perUserInsts.get(uid) ?? new Set());
      const s = 0.55 * jSongs + 0.25 * jLikes + 0.2 * jInst;
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

    // Candidates: anything someone plays OR likes (a song can surface purely on
    // likes, before anyone here can play it). Liking removes a song from your
    // future feeds — it has already done its job as a signal.
    const candidateIds = new Set<number>([
      ...songPlayers.keys(),
      ...songLikers.keys(),
      ...songRatingCount.keys(),
    ]);
    for (const id of candidateIds) {
      if (mySongs.has(id) || dismissed.has(id) || myLikes.has(id) || !songMeta.has(id)) continue;
      const players = songPlayers.get(id) ?? new Set<number>();
      const likers = songLikers.get(id) ?? new Set<number>();

      let score = 0;
      let sharedWith = 0;
      // One contribution per user — playing SUBSUMES liking, so we take the
      // stronger weight rather than summing (summing would double-count anyone
      // who both plays and likes, quietly inflating popular tracks).
      for (const uid of new Set<number>([...players, ...likers])) {
        const s = sim.get(uid);
        if (!s || s <= 0) continue;
        score += s * (players.has(uid) ? 1 : 0.6);
        sharedWith++;
      }
      // slight popularity nudge so ties resolve toward proven songs
      const popularity = 0.04 * Math.log(1 + players.size);
      // instrument-fit nudge (helps cold start feel personal)
      const instFit = matchingInstrumentsFor(id).length > 0 ? 0.06 : 0;
      // community-quality nudge: reward songs the community rates above the mean
      // and gently demote below-mean ones. Small enough to only break ties /
      // reorder — relevance (score) still decides what makes the feed at all.
      const quality = 0.08 * (bayesRating(id) - globalMeanRating);

      if (anySimilarity && score <= 0 && instFit === 0) continue; // keep the feed relevant
      scored.push({ id, score: score + popularity + instFit + quality, sharedWith });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (songPlayers.get(b.id)?.size ?? 0) - (songPlayers.get(a.id)?.size ?? 0);
    });

    const top = scored.slice(0, data.limit);
    const topIds = top.map((t) => t.id);

    // ── Enrich the visible picks (scoped to top N — cheap) ──────────────
    // Friends of the viewer who play each top song.
    const friendPlayersBySong = new Map<number, number[]>();
    const neededFriendIds = new Set<number>();
    for (const { id } of top) {
      const players = songPlayers.get(id);
      if (!players) continue;
      const fs: number[] = [];
      for (const uid of players) {
        if (friendIds.has(uid)) {
          fs.push(uid);
          neededFriendIds.add(uid);
        }
      }
      if (fs.length) friendPlayersBySong.set(id, fs);
    }

    // Hydrate identities for just the friends that appear on a top song.
    const friendInfo = new Map<
      number,
      { username: string; displayName: string; avatarHue: number; avatarUrl: string }
    >();
    if (neededFriendIds.size) {
      const ids = [...neededFriendIds];
      const ph = ids.map(() => "?").join(", ");
      const ures = await database
        .prepare(
          `SELECT id, username, display_name, avatar_hue, avatar_url FROM users WHERE id IN (${ph})`,
        )
        .bind(...ids)
        .all<{
          id: number;
          username: string;
          display_name: string;
          avatar_hue: number;
          avatar_url: string;
        }>();
      for (const u of ures.results ?? []) {
        friendInfo.set(u.id, {
          username: u.username,
          displayName: u.display_name,
          avatarHue: u.avatar_hue,
          avatarUrl: u.avatar_url ?? "",
        });
      }
    }

    // Which instrument each friend plays a given top song on (scan the rows
    // already in memory, but only keep entries for top songs + real friends).
    const friendInstBySongUser = new Map<string, number>();
    if (neededFriendIds.size) {
      for (const r of userSongsRes.results ?? []) {
        if (friendPlayersBySong.has(r.song_id) && neededFriendIds.has(r.user_id)) {
          const k = `${r.song_id}:${r.user_id}`;
          if (!friendInstBySongUser.has(k)) friendInstBySongUser.set(k, r.instrument_id);
        }
      }
    }

    // Community technique tags for the top songs (skip banned authors).
    const tagsBySong = new Map<number, TechniqueTag[]>();
    if (topIds.length) {
      const ph = topIds.map(() => "?").join(", ");
      const tres = await database
        .prepare(
          `SELECT sa.song_id AS song_id, t.id AS id, t.name AS name, t.slug AS slug
           FROM song_annotations sa
           JOIN annotation_tags atg ON atg.annotation_id = sa.id
           JOIN technique_tags t ON t.id = atg.tag_id
           JOIN users au ON au.id = sa.author_id
           WHERE sa.song_id IN (${ph}) AND au.banned = 0
           ORDER BY t.id`,
        )
        .bind(...topIds)
        .all<{ song_id: number; id: number; name: string; slug: string }>();
      for (const r of tres.results ?? []) {
        if (!tagsBySong.has(r.song_id)) tagsBySong.set(r.song_id, []);
        tagsBySong.get(r.song_id)!.push({ id: r.id, name: r.name, slug: r.slug });
      }
    }

    const buildFriends = (id: number): FeedFriend[] => {
      const fs = friendPlayersBySong.get(id);
      if (!fs) return [];
      const out: FeedFriend[] = [];
      for (const uid of fs) {
        const info = friendInfo.get(uid);
        if (!info) continue;
        const instId = friendInstBySongUser.get(`${id}:${uid}`);
        const instrument = instId != null ? (instMeta.get(instId) ?? null) : null;
        out.push({ ...info, instrument });
      }
      return out;
    };

    return top.map(({ id, score, sharedWith }): Recommendation => {
      const matchingInstruments = matchingInstrumentsFor(id);
      const friendsPlaying = buildFriends(id);
      const rc = songRatingCount.get(id) ?? 0;
      let reason: string;
      if (friendsPlaying.length > 0) {
        reason =
          friendsPlaying.length === 1
            ? `${friendsPlaying[0].displayName} plays this`
            : `${friendsPlaying.length} friends play this`;
      } else if (sharedWith > 0) {
        // sharedWith now counts people who play OR like it, so keep the wording
        // broad rather than claiming they all play it.
        reason =
          sharedWith === 1
            ? "1 musician with your taste is into this"
            : `${sharedWith} musicians with your taste are into this`;
      } else if (matchingInstruments.length > 0) {
        reason = `A go-to for ${matchingInstruments[0].name} players`;
      } else {
        reason = "Rising in the community";
      }
      return {
        song: buildStat(id),
        reason,
        score,
        sharedWith,
        matchingInstruments,
        tags: tagsBySong.get(id) ?? [],
        friendsPlaying,
        likes: songLikers.get(id)?.size ?? 0,
        ratingAvg: rc > 0 ? (songRatingSum.get(id) ?? 0) / rc : null,
        ratingCount: rc,
      };
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
