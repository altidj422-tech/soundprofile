import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Comment } from "../types";
import { db } from "../db.server";
import { loadViewerMeta } from "../rep.server";
import { getSessionUser, requireUser } from "../session.server";

export const getComments = createServerFn({ method: "GET" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<Comment[]> => {
    const viewer = await getSessionUser();
    const viewerMeta = viewer ? await loadViewerMeta(viewer.id) : null;
    const res = await db()
      .prepare(
        `SELECT c.id, c.body, c.created_at, c.user_id,
                u.username, u.display_name, u.avatar_hue, u.likes_received, u.dislikes_received
         FROM comments c JOIN users u ON u.id = c.user_id
         WHERE c.song_id = ? AND u.banned = 0
         ORDER BY c.created_at DESC
         LIMIT 100`,
      )
      .bind(data.songId)
      .all<{
        id: number;
        body: string;
        created_at: string;
        user_id: number;
        username: string;
        display_name: string;
        avatar_hue: number;
        likes_received: number;
        dislikes_received: number;
      }>();
    return (res.results ?? []).map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarHue: r.avatar_hue,
      reputation: r.likes_received - r.dislikes_received,
      body: r.body,
      createdAt: r.created_at,
      canDelete: !!viewer && (viewer.id === r.user_id || !!viewerMeta?.isModerator),
    }));
  });

export const addComment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ songId: z.number().int().positive(), body: z.string().trim().min(1).max(1000) }))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const meta = await loadViewerMeta(user.id);
    if (meta.banned) return { ok: false, error: "Your account is restricted." };
    await db()
      .prepare("INSERT INTO comments (song_id, user_id, body) VALUES (?, ?, ?)")
      .bind(data.songId, user.id, data.body)
      .run();
    return { ok: true };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ commentId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const meta = await loadViewerMeta(user.id);
    const database = db();
    const row = await database
      .prepare("SELECT user_id FROM comments WHERE id = ?")
      .bind(data.commentId)
      .first<{ user_id: number }>();
    if (!row) return { ok: true };
    if (row.user_id !== user.id && !meta.isModerator) return { ok: false, error: "Not allowed." };
    await database.prepare("DELETE FROM comments WHERE id = ?").bind(data.commentId).run();
    return { ok: true };
  });
