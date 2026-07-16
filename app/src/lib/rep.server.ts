// Server-only reputation helpers shared by annotations + comments.
import type { ViewerMeta } from "./types";
import { db } from "./db.server";
import { isModerator } from "./reputation";

export async function loadViewerMeta(userId: number): Promise<ViewerMeta> {
  const row = await db()
    .prepare("SELECT likes_received, dislikes_received, banned FROM users WHERE id = ?")
    .bind(userId)
    .first<{ likes_received: number; dislikes_received: number; banned: number }>();
  const reputation = (row?.likes_received ?? 0) - (row?.dislikes_received ?? 0);
  return { userId, reputation, isModerator: isModerator(reputation), banned: (row?.banned ?? 0) === 1 };
}

export async function authorReputation(userId: number): Promise<number> {
  const row = await db()
    .prepare("SELECT likes_received, dislikes_received FROM users WHERE id = ?")
    .bind(userId)
    .first<{ likes_received: number; dislikes_received: number }>();
  return (row?.likes_received ?? 0) - (row?.dislikes_received ?? 0);
}

// Ban a user: their technique tags disappear everywhere.
export async function banUser(userId: number): Promise<void> {
  const database = db();
  await database.prepare("UPDATE users SET banned = 1 WHERE id = ?").bind(userId).run();
  const rows = await database
    .prepare("SELECT id, song_id FROM song_annotations WHERE author_id = ?")
    .bind(userId)
    .all<{ id: number; song_id: number }>();
  const stmts = [];
  for (const r of rows.results ?? []) {
    stmts.push(database.prepare("DELETE FROM annotation_tags WHERE annotation_id = ?").bind(r.id));
    stmts.push(database.prepare("DELETE FROM annotation_votes WHERE song_id = ?").bind(r.song_id));
    stmts.push(database.prepare("DELETE FROM song_annotations WHERE id = ?").bind(r.id));
  }
  if (stmts.length) await database.batch(stmts);
}
