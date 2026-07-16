import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SongAnnotation, SongExtras, TechniqueTag, ViewerMeta } from "../types";
import { db } from "../db.server";
import { authorReputation, banUser, loadViewerMeta } from "../rep.server";
import { BAN_THRESHOLD, isModerator } from "../reputation";
import { getSessionUser, requireUser } from "../session.server";

async function loadVocabulary(): Promise<TechniqueTag[]> {
  const res = await db()
    .prepare("SELECT id, name, slug FROM technique_tags WHERE instrument = 'guitar' ORDER BY id")
    .all<TechniqueTag>();
  return res.results ?? [];
}

interface AnnotRow {
  id: number;
  author_id: number;
  note: string;
  likes: number;
  dislikes: number;
  updated_at: string;
  a_username: string;
  a_display: string;
  a_hue: number;
  a_likes: number;
  a_dislikes: number;
  a_banned: number;
}

async function loadAnnotation(
  songId: number,
  viewerId: number | null,
): Promise<{ pub: SongAnnotation; authorId: number } | null> {
  const database = db();
  const row = await database
    .prepare(
      `SELECT sa.id, sa.author_id, sa.note, sa.likes, sa.dislikes, sa.updated_at,
              u.username AS a_username, u.display_name AS a_display, u.avatar_hue AS a_hue,
              u.likes_received AS a_likes, u.dislikes_received AS a_dislikes, u.banned AS a_banned
       FROM song_annotations sa JOIN users u ON u.id = sa.author_id
       WHERE sa.song_id = ?`,
    )
    .bind(songId)
    .first<AnnotRow>();
  if (!row || row.a_banned === 1) return null;

  const tagsRes = await database
    .prepare(
      `SELECT t.id, t.name, t.slug FROM annotation_tags at
       JOIN technique_tags t ON t.id = at.tag_id
       WHERE at.annotation_id = ? ORDER BY t.id`,
    )
    .bind(row.id)
    .all<TechniqueTag>();

  let myVote = 0;
  if (viewerId) {
    const v = await database
      .prepare("SELECT value FROM annotation_votes WHERE song_id = ? AND voter_id = ?")
      .bind(songId, viewerId)
      .first<{ value: number }>();
    myVote = v?.value ?? 0;
  }

  const authorRep = row.a_likes - row.a_dislikes;
  return {
    authorId: row.author_id,
    pub: {
      author: {
        username: row.a_username,
        displayName: row.a_display,
        avatarHue: row.a_hue,
        reputation: authorRep,
        isModerator: isModerator(authorRep),
      },
      note: row.note,
      tags: tagsRes.results ?? [],
      likes: row.likes,
      dislikes: row.dislikes,
      myVote,
      netNegative: row.dislikes > row.likes,
      mine: viewerId != null && row.author_id === viewerId,
      updatedAt: row.updated_at,
    },
  };
}

export const getSongExtras = createServerFn({ method: "GET" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<SongExtras> => {
    const viewerUser = await getSessionUser();
    const [vocabulary, loaded] = await Promise.all([
      loadVocabulary(),
      loadAnnotation(data.songId, viewerUser?.id ?? null),
    ]);

    let viewer: ViewerMeta = { userId: 0, reputation: 0, isModerator: false, banned: false };
    let canEdit = false;
    if (viewerUser) {
      viewer = await loadViewerMeta(viewerUser.id);
      if (!viewer.banned) {
        if (!loaded) {
          canEdit = true;
        } else if (loaded.authorId === viewerUser.id) {
          canEdit = true;
        } else if (loaded.pub.netNegative) {
          canEdit = true;
        } else if (viewer.isModerator && viewer.reputation > loaded.pub.author.reputation) {
          canEdit = true;
        }
      }
    }

    return { annotation: loaded?.pub ?? null, vocabulary, canEdit, viewer };
  });

export const saveAnnotation = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      songId: z.number().int().positive(),
      tagIds: z.array(z.number().int().positive()).max(20).default([]),
      note: z.string().trim().max(500).default(""),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const meta = await loadViewerMeta(user.id);
    if (meta.banned) return { ok: false, error: "Your account is restricted." };
    const database = db();

    // Keep only real guitar tags.
    const validRes = await database
      .prepare("SELECT id FROM technique_tags WHERE instrument = 'guitar'")
      .all<{ id: number }>();
    const validIds = new Set((validRes.results ?? []).map((r) => r.id));
    const tagIds = [...new Set(data.tagIds.filter((id) => validIds.has(id)))];

    const existing = await database
      .prepare("SELECT id, author_id, likes, dislikes FROM song_annotations WHERE song_id = ?")
      .bind(data.songId)
      .first<{ id: number; author_id: number; likes: number; dislikes: number }>();

    let annotationId: number;

    if (existing) {
      const isAuthor = existing.author_id === user.id;
      const netNeg = existing.dislikes > existing.likes;
      let allowed = isAuthor || netNeg;
      if (!allowed && meta.isModerator) {
        const authorRep = await authorReputation(existing.author_id);
        if (meta.reputation > authorRep) allowed = true;
      }
      if (!allowed) {
        return { ok: false, error: "These tags are locked — you can only vote on them." };
      }

      if (!isAuthor) {
        // Takeover: become the author, reset votes + counts.
        await database
          .prepare("DELETE FROM annotation_votes WHERE song_id = ?")
          .bind(data.songId)
          .run();
        await database
          .prepare(
            "UPDATE song_annotations SET author_id = ?, note = ?, likes = 0, dislikes = 0, updated_at = datetime('now') WHERE song_id = ?",
          )
          .bind(user.id, data.note, data.songId)
          .run();
      } else {
        await database
          .prepare("UPDATE song_annotations SET note = ?, updated_at = datetime('now') WHERE song_id = ?")
          .bind(data.note, data.songId)
          .run();
      }
      annotationId = existing.id;
      await database
        .prepare("DELETE FROM annotation_tags WHERE annotation_id = ?")
        .bind(annotationId)
        .run();
    } else {
      const ins = await database
        .prepare("INSERT INTO song_annotations (song_id, author_id, note) VALUES (?, ?, ?) RETURNING id")
        .bind(data.songId, user.id, data.note)
        .first<{ id: number }>();
      if (!ins) return { ok: false, error: "Could not save the tags." };
      annotationId = ins.id;
    }

    if (tagIds.length) {
      await database.batch(
        tagIds.map((tid) =>
          database
            .prepare("INSERT OR IGNORE INTO annotation_tags (annotation_id, tag_id) VALUES (?, ?)")
            .bind(annotationId, tid),
        ),
      );
    }
    return { ok: true };
  });

export const voteAnnotation = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ songId: z.number().int().positive(), value: z.number().int().min(-1).max(1) }),
  )
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const meta = await loadViewerMeta(user.id);
    if (meta.banned) return { ok: false, error: "Your account is restricted." };
    const database = db();

    const annot = await database
      .prepare("SELECT id, author_id FROM song_annotations WHERE song_id = ?")
      .bind(data.songId)
      .first<{ id: number; author_id: number }>();
    if (!annot) return { ok: false, error: "Nothing to vote on yet." };
    if (annot.author_id === user.id) return { ok: false, error: "You can't vote on your own tags." };

    const existing = await database
      .prepare("SELECT value FROM annotation_votes WHERE song_id = ? AND voter_id = ?")
      .bind(data.songId, user.id)
      .first<{ value: number }>();
    const oldValue = existing?.value ?? 0;
    const newValue = data.value;

    if (newValue === 0) {
      await database
        .prepare("DELETE FROM annotation_votes WHERE song_id = ? AND voter_id = ?")
        .bind(data.songId, user.id)
        .run();
    } else {
      await database
        .prepare(
          "INSERT INTO annotation_votes (song_id, voter_id, value) VALUES (?, ?, ?) ON CONFLICT(song_id, voter_id) DO UPDATE SET value = excluded.value",
        )
        .bind(data.songId, user.id, newValue)
        .run();
    }

    const cnt = await database
      .prepare(
        `SELECT COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) AS likes,
                COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) AS dislikes
         FROM annotation_votes WHERE song_id = ?`,
      )
      .bind(data.songId)
      .first<{ likes: number; dislikes: number }>();
    await database
      .prepare("UPDATE song_annotations SET likes = ?, dislikes = ? WHERE song_id = ?")
      .bind(cnt?.likes ?? 0, cnt?.dislikes ?? 0, data.songId)
      .run();

    const dLikes = (newValue === 1 ? 1 : 0) - (oldValue === 1 ? 1 : 0);
    const dDislikes = (newValue === -1 ? 1 : 0) - (oldValue === -1 ? 1 : 0);
    if (dLikes !== 0 || dDislikes !== 0) {
      await database
        .prepare(
          "UPDATE users SET likes_received = MAX(0, likes_received + ?), dislikes_received = MAX(0, dislikes_received + ?) WHERE id = ?",
        )
        .bind(dLikes, dDislikes, annot.author_id)
        .run();
    }

    const author = await database
      .prepare("SELECT likes_received, dislikes_received, banned FROM users WHERE id = ?")
      .bind(annot.author_id)
      .first<{ likes_received: number; dislikes_received: number; banned: number }>();
    if (author && author.banned === 0 && author.likes_received - author.dislikes_received <= BAN_THRESHOLD) {
      await banUser(annot.author_id);
    }
    return { ok: true };
  });

export const deleteAnnotation = createServerFn({ method: "POST" })
  .inputValidator(z.object({ songId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const user = await requireUser();
    const meta = await loadViewerMeta(user.id);
    const database = db();
    const annot = await database
      .prepare("SELECT id, author_id FROM song_annotations WHERE song_id = ?")
      .bind(data.songId)
      .first<{ id: number; author_id: number }>();
    if (!annot) return { ok: true };

    let allowed = annot.author_id === user.id;
    if (!allowed && meta.isModerator) {
      const authorRep = await authorReputation(annot.author_id);
      if (meta.reputation > authorRep) allowed = true;
    }
    if (!allowed) return { ok: false, error: "Not allowed." };

    await database.batch([
      database.prepare("DELETE FROM annotation_tags WHERE annotation_id = ?").bind(annot.id),
      database.prepare("DELETE FROM annotation_votes WHERE song_id = ?").bind(data.songId),
      database.prepare("DELETE FROM song_annotations WHERE id = ?").bind(annot.id),
    ]);
    return { ok: true };
  });
