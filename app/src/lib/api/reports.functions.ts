import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ViewerMeta } from "../types";
import { db } from "../db.server";
import { loadViewerMeta } from "../rep.server";
import { getSessionUser, requireUser } from "../session.server";

const TARGET = z.enum(["comment", "user"]);

export interface ReportItem {
  id: number;
  targetType: string;
  targetId: number;
  songId: number | null;
  reason: string;
  createdAt: string;
  reporter: string;
  snippet: string;
  targetUsername: string | null; // for 'user' reports, so the UI can link
}

// Viewer's moderation status — lets the Profile page decide whether to show the
// Moderation link without loading the whole report list.
export const getMyMeta = createServerFn({ method: "GET" }).handler(async (): Promise<ViewerMeta> => {
  const user = await getSessionUser();
  if (!user) return { userId: 0, reputation: 0, isModerator: false, banned: false };
  return loadViewerMeta(user.id);
});

export const reportContent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      targetType: TARGET,
      targetId: z.number().int().positive(),
      songId: z.number().int().positive().nullable().default(null),
      reason: z.string().trim().max(300).default(""),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const meta = await loadViewerMeta(user.id);
    if (meta.banned) return { ok: false, error: "Your account is restricted." };
    await db()
      .prepare(
        "INSERT OR IGNORE INTO reports (reporter_id, target_type, target_id, song_id, reason) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(user.id, data.targetType, data.targetId, data.songId, data.reason)
      .run();
    return { ok: true };
  });

interface ReportRow {
  id: number;
  target_type: string;
  target_id: number;
  song_id: number | null;
  reason: string;
  created_at: string;
  reporter: string;
}

export const listReports = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ isModerator: boolean; reports: ReportItem[] }> => {
    const user = await getSessionUser();
    if (!user) return { isModerator: false, reports: [] };
    const meta = await loadViewerMeta(user.id);
    if (!meta.isModerator || meta.banned) return { isModerator: false, reports: [] };

    const database = db();
    const rows = await database
      .prepare(
        `SELECT r.id, r.target_type, r.target_id, r.song_id, r.reason, r.created_at,
                u.username AS reporter
         FROM reports r JOIN users u ON u.id = r.reporter_id
         WHERE r.resolved = 0 ORDER BY r.created_at DESC LIMIT 100`,
      )
      .all<ReportRow>();

    const reports: ReportItem[] = [];
    for (const r of rows.results ?? []) {
      let snippet = "(removed)";
      let targetUsername: string | null = null;
      if (r.target_type === "comment") {
        const c = await database
          .prepare("SELECT body FROM comments WHERE id = ?")
          .bind(r.target_id)
          .first<{ body: string }>();
        snippet = c?.body ?? "(deleted)";
      } else if (r.target_type === "user") {
        const u = await database
          .prepare("SELECT username FROM users WHERE id = ?")
          .bind(r.target_id)
          .first<{ username: string }>();
        targetUsername = u?.username ?? null;
        snippet = u ? `@${u.username}` : "(deleted)";
      }
      reports.push({
        id: r.id,
        targetType: r.target_type,
        targetId: r.target_id,
        songId: r.song_id,
        reason: r.reason,
        createdAt: r.created_at,
        reporter: r.reporter,
        snippet,
        targetUsername,
      });
    }
    return { isModerator: true, reports };
  },
);

export const resolveReport = createServerFn({ method: "POST" })
  .inputValidator(z.object({ reportId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const user = await requireUser();
    const meta = await loadViewerMeta(user.id);
    if (!meta.isModerator || meta.banned) return { ok: false };
    await db().prepare("UPDATE reports SET resolved = 1 WHERE id = ?").bind(data.reportId).run();
    return { ok: true };
  });
