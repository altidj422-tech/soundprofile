import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { shortDate } from "../../lib/catalog";
import type { Comment, ViewerMeta } from "../../lib/types";
import { addComment, deleteComment } from "../../lib/api/comments.functions";
import { Avatar, RepBadge, SolidCoral, Spinner } from "./ui";

export function CommentsPanel({
  songId,
  comments,
  viewer,
}: {
  songId: number;
  comments: Comment[];
  viewer: ViewerMeta;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const signedIn = viewer.userId > 0;

  async function post() {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const res = await addComment({ data: { songId, body: body.trim() } });
      if (res.ok) {
        setBody("");
        router.invalidate();
      }
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: number) {
    await deleteComment({ data: { commentId: id } });
    router.invalidate();
  }

  return (
    <div className="mt-8">
      <h2 className="font-display mb-3 text-lg font-semibold">
        Comments <span className="text-sm font-normal text-[var(--sp-faint)]">({comments.length})</span>
      </h2>

      {signedIn && !viewer.banned ? (
        <div className="sp-card mb-4 p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Share a tip, a tuning, or how you learned it…"
            className="w-full resize-none rounded-xl border border-[var(--sp-line)] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] focus:border-[var(--sp-coral)] focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <SolidCoral onClick={post} disabled={posting || !body.trim()}>
              {posting ? <Spinner /> : "Post"}
            </SolidCoral>
          </div>
        </div>
      ) : viewer.banned ? (
        <p className="mb-4 rounded-xl border border-[var(--sp-coral)]/30 bg-[var(--sp-coral)]/10 px-4 py-3 text-sm text-[var(--sp-coral)]">
          Your account is restricted, so you can&apos;t comment.
        </p>
      ) : (
        <p className="mb-4 text-sm text-[var(--sp-muted)]">
          <Link to="/login" className="font-semibold text-[var(--sp-aqua)]">
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-[var(--sp-faint)]">No comments yet — be the first.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Link to="/u/$username" params={{ username: c.username }} className="shrink-0">
                <Avatar name={c.displayName} hue={c.avatarHue} size={34} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <Link
                    to="/u/$username"
                    params={{ username: c.username }}
                    className="text-sm font-semibold hover:underline"
                  >
                    {c.displayName}
                  </Link>
                  <RepBadge reputation={c.reputation} />
                  <span className="text-[11px] text-[var(--sp-faint)]">{shortDate(c.createdAt)}</span>
                  {c.canDelete && (
                    <button
                      onClick={() => remove(c.id)}
                      className="ml-auto text-[11px] font-medium text-[var(--sp-faint)] transition hover:text-[var(--sp-coral)]"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-[var(--sp-ink)]/90">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
