// Server-only helpers for the friend graph. Friendship is stored as directed
// edges in `friendships` (requester → recipient) and is symmetric once accepted.
import type { FriendStatus } from "./types";
import { db } from "./db.server";

interface FriendRow {
  user_id: number;
  friend_id: number;
  status: string;
}

export interface ViewerRelations {
  /** The viewer's relationship to another user, O(1) after one load. */
  statusFor(otherId: number): FriendStatus;
}

// Load every friendship edge touching `meId` once, so a page can classify many
// other users without a query per user.
export async function loadViewerRelations(meId: number): Promise<ViewerRelations> {
  const res = await db()
    .prepare(
      "SELECT user_id, friend_id, status FROM friendships WHERE user_id = ? OR friend_id = ?",
    )
    .bind(meId, meId)
    .all<FriendRow>();
  const rows = res.results ?? [];
  return {
    statusFor(otherId: number): FriendStatus {
      if (otherId === meId) return "me";
      // An accepted edge in either direction wins.
      for (const r of rows) {
        const between =
          (r.user_id === meId && r.friend_id === otherId) ||
          (r.user_id === otherId && r.friend_id === meId);
        if (between && r.status === "accepted") return "friends";
      }
      for (const r of rows) {
        if (r.status !== "pending") continue;
        if (r.user_id === meId && r.friend_id === otherId) return "outgoing";
        if (r.user_id === otherId && r.friend_id === meId) return "incoming";
      }
      return "none";
    },
  };
}

// How many accepted friends a user has (either direction).
export async function friendCountOf(userId: number): Promise<number> {
  const row = await db()
    .prepare(
      "SELECT COUNT(*) AS n FROM friendships WHERE status = 'accepted' AND (user_id = ? OR friend_id = ?)",
    )
    .bind(userId, userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}
