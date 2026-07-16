import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { FriendStatus, ProfileSummary } from "../types";
import { db } from "../db.server";
import { requireUser } from "../session.server";

interface SummaryRow {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  avatar_hue: number;
  avatar_url: string;
  is_seed: number;
  song_count: number;
  instrument_count: number;
}

const SUMMARY_SELECT = `
  SELECT u.id, u.username, u.display_name, u.bio, u.avatar_hue, u.avatar_url, u.is_seed,
         (SELECT COUNT(DISTINCT song_id) FROM user_songs WHERE user_id = u.id) AS song_count,
         (SELECT COUNT(*) FROM user_instruments WHERE user_id = u.id) AS instrument_count
  FROM users u`;

function toSummary(row: SummaryRow, status: FriendStatus): ProfileSummary {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarHue: row.avatar_hue,
    avatarUrl: row.avatar_url ?? "",
    isSeed: row.is_seed === 1,
    songCount: row.song_count ?? 0,
    instrumentCount: row.instrument_count ?? 0,
    friendStatus: status,
  };
}

// Escape LIKE wildcards so a literal "%" or "_" in the query doesn't match all.
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

interface EdgeRow {
  user_id: number;
  friend_id: number;
  status: string;
}

// Classify the viewer's relationship to `otherId` from the loaded edges.
function statusFrom(edges: EdgeRow[], meId: number, otherId: number): FriendStatus {
  if (otherId === meId) return "me";
  for (const e of edges) {
    const between =
      (e.user_id === meId && e.friend_id === otherId) ||
      (e.user_id === otherId && e.friend_id === meId);
    if (between && e.status === "accepted") return "friends";
  }
  for (const e of edges) {
    if (e.status !== "pending") continue;
    if (e.user_id === meId && e.friend_id === otherId) return "outgoing";
    if (e.user_id === otherId && e.friend_id === meId) return "incoming";
  }
  return "none";
}

async function loadEdges(meId: number): Promise<EdgeRow[]> {
  const res = await db()
    .prepare(
      "SELECT user_id, friend_id, status FROM friendships WHERE user_id = ? OR friend_id = ?",
    )
    .bind(meId, meId)
    .all<EdgeRow>();
  return res.results ?? [];
}

// Find musicians by username or display name (excluding yourself), tagged with
// your current friendship state so the UI can show the right action.
export const searchProfiles = createServerFn({ method: "GET" })
  .inputValidator(z.object({ q: z.string().trim().max(60) }))
  .handler(async ({ data }): Promise<ProfileSummary[]> => {
    const me = await requireUser();
    const q = data.q.trim();
    if (q.length < 2) return [];

    const pattern = likePattern(q);
    const [rowsRes, edges] = await Promise.all([
      db()
        .prepare(
          `${SUMMARY_SELECT}
           WHERE u.id != ?
             AND (u.username LIKE ? ESCAPE '\\' OR u.display_name LIKE ? ESCAPE '\\')
           ORDER BY u.is_seed ASC, u.display_name
           LIMIT 24`,
        )
        .bind(me.id, pattern, pattern)
        .all<SummaryRow>(),
      loadEdges(me.id),
    ]);

    return (rowsRes.results ?? []).map((r) => toSummary(r, statusFrom(edges, me.id, r.id)));
  });

async function hydrate(
  ids: number[],
  status: (id: number) => FriendStatus,
): Promise<ProfileSummary[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(", ");
  const res = await db()
    .prepare(`${SUMMARY_SELECT} WHERE u.id IN (${placeholders})`)
    .bind(...ids)
    .all<SummaryRow>();
  const byId = new Map<number, SummaryRow>();
  for (const r of res.results ?? []) byId.set(r.id, r);
  // Preserve the caller's id order (most-recent-first from the edge query).
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is SummaryRow => r != null)
    .map((r) => toSummary(r, status(r.id)));
}

// Everything the Friends page needs: accepted friends, requests waiting on you,
// and requests you've sent that are still pending.
export const getFriendsData = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    friends: ProfileSummary[];
    incoming: ProfileSummary[];
    outgoing: ProfileSummary[];
  }> => {
    const me = await requireUser();
    // Newest first.
    const res = await db()
      .prepare(
        `SELECT user_id, friend_id, status FROM friendships
         WHERE user_id = ? OR friend_id = ?
         ORDER BY created_at DESC`,
      )
      .bind(me.id, me.id)
      .all<EdgeRow>();
    const edges = res.results ?? [];

    const friendIds: number[] = [];
    const incomingIds: number[] = [];
    const outgoingIds: number[] = [];
    for (const e of edges) {
      const other = e.user_id === me.id ? e.friend_id : e.user_id;
      if (e.status === "accepted") friendIds.push(other);
      else if (e.friend_id === me.id) incomingIds.push(e.user_id);
      else if (e.user_id === me.id) outgoingIds.push(e.friend_id);
    }

    const [friends, incoming, outgoing] = await Promise.all([
      hydrate(friendIds, () => "friends"),
      hydrate(incomingIds, () => "incoming"),
      hydrate(outgoingIds, () => "outgoing"),
    ]);
    return { friends, incoming, outgoing };
  },
);

// Send a friend request. If they already requested you, this accepts it.
export const sendFriendRequest = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: boolean; status: FriendStatus; error?: string }> => {
    const me = await requireUser();
    if (data.userId === me.id) return { ok: false, status: "me", error: "That's you" };

    const target = await db()
      .prepare("SELECT id FROM users WHERE id = ?")
      .bind(data.userId)
      .first<{ id: number }>();
    if (!target) return { ok: false, status: "none", error: "Musician not found" };

    const edges = await loadEdges(me.id);
    const current = statusFrom(edges, me.id, data.userId);
    if (current === "friends") return { ok: true, status: "friends" };
    if (current === "outgoing") return { ok: true, status: "outgoing" };

    if (current === "incoming") {
      // They already asked — accept instead of creating a second edge.
      await db()
        .prepare("UPDATE friendships SET status = 'accepted' WHERE user_id = ? AND friend_id = ?")
        .bind(data.userId, me.id)
        .run();
      return { ok: true, status: "friends" };
    }

    await db()
      .prepare(
        "INSERT OR IGNORE INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')",
      )
      .bind(me.id, data.userId)
      .run();
    return { ok: true, status: "outgoing" };
  });

// Accept a pending request that `userId` sent you.
export const acceptFriendRequest = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: boolean; status: FriendStatus }> => {
    const me = await requireUser();
    const res = await db()
      .prepare(
        "UPDATE friendships SET status = 'accepted' WHERE user_id = ? AND friend_id = ? AND status = 'pending'",
      )
      .bind(data.userId, me.id)
      .run();
    const changed = res.meta?.changes ?? 0;
    return { ok: true, status: changed > 0 ? "friends" : "none" };
  });

// Unfriend, cancel a request you sent, or decline one sent to you — removes
// every edge between you and `userId`.
export const removeFriend = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: boolean; status: FriendStatus }> => {
    const me = await requireUser();
    await db()
      .prepare(
        "DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
      )
      .bind(me.id, data.userId, data.userId, me.id)
      .run();
    return { ok: true, status: "none" };
  });
