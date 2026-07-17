import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SongTutorial } from "../types";
import { db } from "../db.server";
import { authorReputation, loadViewerMeta } from "../rep.server";
import { getSessionUser, requireUser } from "../session.server";

// Pull the 11-char video id out of any common YouTube URL shape. Returns null
// for anything that isn't a real YouTube link — we NEVER embed a raw
// user-supplied string, only a canonical id we rebuilt ourselves.
export function extractYouTubeId(input: string): string | null {
  const valid = (id: string | null | undefined) =>
    id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  try {
    const u = new URL(input.trim());
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtu.be") return valid(u.pathname.slice(1));
    if (host === "youtube.com" || host === "music.youtube.com") {
      if (u.pathname === "/watch") return valid(u.searchParams.get("v"));
      const m = u.pathname.match(/^\/(?:embed|shorts|v)\/([^/?#]+)/);
      if (m) return valid(m[1]);
    }
    return null;
  } catch {
    // Bare id pasted on its own?
    return valid(input.trim());
  }
}

interface TutorialRow {
  video_id: string;
  added_by: number;
  username: string;
  display_name: string;
}

export const getSongTutorial = createServerFn({ method: "GET" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<SongTutorial | null> => {
    const viewer = await getSessionUser();
    const row = await db()
      .prepare(
        `SELECT t.video_id, t.added_by, u.username, u.display_name
         FROM song_tutorials t JOIN users u ON u.id = t.added_by
         WHERE t.song_id = ?`,
      )
      .bind(data.songId)
      .first<TutorialRow>();
    if (!row) return null;

    let canEdit = false;
    if (viewer) {
      if (viewer.id === row.added_by) {
        canEdit = true;
      } else {
        const meta = await loadViewerMeta(viewer.id);
        if (meta.isModerator && !meta.banned) {
          const authorRep = await authorReputation(row.added_by);
          if (meta.reputation > authorRep) canEdit = true;
        }
      }
    }

    return {
      videoId: row.video_id,
      addedByUsername: row.username,
      addedByDisplayName: row.display_name,
      canEdit,
    };
  });

export const setSongTutorial = createServerFn({ method: "POST" })
  .inputValidator(z.object({ songId: z.number().int().positive(), url: z.string().trim().max(300) }))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const meta = await loadViewerMeta(user.id);
    if (meta.banned) return { ok: false, error: "Your account is restricted." };

    const videoId = extractYouTubeId(data.url);
    if (!videoId) return { ok: false, error: "Paste a valid YouTube link." };

    const database = db();
    const song = await database
      .prepare("SELECT id FROM songs WHERE id = ?")
      .bind(data.songId)
      .first();
    if (!song) return { ok: false, error: "Unknown song." };

    const existing = await database
      .prepare("SELECT added_by FROM song_tutorials WHERE song_id = ?")
      .bind(data.songId)
      .first<{ added_by: number }>();

    if (existing) {
      let allowed = existing.added_by === user.id;
      if (!allowed && meta.isModerator) {
        const authorRep = await authorReputation(existing.added_by);
        if (meta.reputation > authorRep) allowed = true;
      }
      if (!allowed) {
        return {
          ok: false,
          error: "A tutorial's already pinned — only its contributor or a trusted member can change it.",
        };
      }
    }

    await database
      .prepare(
        `INSERT INTO song_tutorials (song_id, video_id, added_by) VALUES (?, ?, ?)
         ON CONFLICT(song_id) DO UPDATE SET video_id = excluded.video_id,
                                            added_by = excluded.added_by,
                                            created_at = datetime('now')`,
      )
      .bind(data.songId, videoId, user.id)
      .run();
    return { ok: true };
  });

export const removeSongTutorial = createServerFn({ method: "POST" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const meta = await loadViewerMeta(user.id);
    const existing = await db()
      .prepare("SELECT added_by FROM song_tutorials WHERE song_id = ?")
      .bind(data.songId)
      .first<{ added_by: number }>();
    if (!existing) return { ok: true };

    let allowed = existing.added_by === user.id;
    if (!allowed && meta.isModerator && !meta.banned) {
      const authorRep = await authorReputation(existing.added_by);
      if (meta.reputation > authorRep) allowed = true;
    }
    if (!allowed) return { ok: false, error: "Not allowed." };

    await db().prepare("DELETE FROM song_tutorials WHERE song_id = ?").bind(data.songId).run();
    return { ok: true };
  });
