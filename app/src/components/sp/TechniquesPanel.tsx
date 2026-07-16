import * as Dialog from "@radix-ui/react-dialog";
import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { shortDate } from "../../lib/catalog";
import type { SongExtras } from "../../lib/types";
import {
  deleteAnnotation,
  saveAnnotation,
  voteAnnotation,
} from "../../lib/api/annotations.functions";
import { Avatar, RepBadge, SolidCoral, Spinner, cx } from "./ui";

export function TechniquesPanel({ songId, extras }: { songId: number; extras: SongExtras }) {
  const router = useRouter();
  const { annotation, vocabulary, canEdit, viewer } = extras;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const signedIn = viewer.userId > 0;
  const canVote = signedIn && !viewer.banned && annotation && !annotation.mine;

  async function vote(next: 1 | -1) {
    if (!canVote || busy) return;
    const value = annotation!.myVote === next ? 0 : next;
    setBusy(true);
    try {
      await voteAnnotation({ data: { songId, value } });
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteAnnotation({ data: { songId } });
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">
          Playing techniques <span className="text-sm font-normal text-[var(--sp-faint)]">· guitar</span>
        </h2>
        {annotation && canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-semibold text-[var(--sp-aqua)] hover:underline"
          >
            {annotation.mine ? "Edit" : "Rewrite"}
          </button>
        )}
      </div>

      {!annotation ? (
        <div className="sp-card grid place-items-center px-6 py-10 text-center">
          <div className="text-3xl">🎸</div>
          <p className="mt-2 text-sm text-[var(--sp-muted)]">
            No techniques tagged yet.
            {viewer.banned && " Your account is restricted."}
          </p>
          {canEdit ? (
            <button
              onClick={() => setEditing(true)}
              className="mt-4 rounded-full bg-[var(--sp-coral)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Tag the techniques
            </button>
          ) : !signedIn ? (
            <Link to="/login" className="mt-4 text-sm font-semibold text-[var(--sp-aqua)]">
              Log in to add tags
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="sp-card p-5">
          {annotation.netNegative && (
            <div className="mb-4 rounded-xl border border-[var(--sp-coral)]/40 bg-[var(--sp-coral)]/10 px-3.5 py-2.5 text-xs text-[var(--sp-coral)]">
              More dislikes than likes — these tags are unlocked for anyone to rewrite.
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {annotation.tags.length > 0 ? (
              annotation.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full border border-[var(--sp-line-strong)] bg-white/[0.04] px-3 py-1.5 text-[13px] font-medium text-[var(--sp-ink)]"
                >
                  {t.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--sp-faint)]">No tags — just a note.</span>
            )}
          </div>

          {annotation.note && (
            <p className="mt-3 text-sm italic text-[var(--sp-muted)]">“{annotation.note}”</p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sp-line)] pt-3.5">
            <Link
              to="/u/$username"
              params={{ username: annotation.author.username }}
              className="flex items-center gap-2"
            >
              <Avatar name={annotation.author.displayName} hue={annotation.author.avatarHue} size={26} />
              <span className="text-xs text-[var(--sp-muted)]">
                {annotation.author.displayName}
              </span>
              <RepBadge
                reputation={annotation.author.reputation}
                isModerator={annotation.author.isModerator}
              />
              <span className="text-[11px] text-[var(--sp-faint)]">· {shortDate(annotation.updatedAt)}</span>
            </Link>

            <div className="flex items-center gap-1.5">
              <VoteButton
                dir="up"
                count={annotation.likes}
                active={annotation.myVote === 1}
                disabled={!canVote || busy}
                onClick={() => vote(1)}
              />
              <VoteButton
                dir="down"
                count={annotation.dislikes}
                active={annotation.myVote === -1}
                disabled={!canVote || busy}
                onClick={() => vote(-1)}
              />
              {canEdit && !annotation.mine && (
                <button
                  onClick={remove}
                  className="ml-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--sp-faint)] transition hover:text-[var(--sp-coral)]"
                  title="Remove these tags"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {annotation.mine && (
            <p className="mt-2 text-[11px] text-[var(--sp-faint)]">
              You tagged this — you can&apos;t vote on your own tags.
            </p>
          )}
        </div>
      )}

      {editing && (
        <TagEditor
          songId={songId}
          vocabulary={vocabulary}
          initialTagIds={annotation?.tags.map((t) => t.id) ?? []}
          initialNote={annotation?.note ?? ""}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.invalidate();
          }}
        />
      )}
    </div>
  );
}

function VoteButton({
  dir,
  count,
  active,
  disabled,
  onClick,
}: {
  dir: "up" | "down";
  count: number;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const color = dir === "up" ? "var(--sp-aqua)" : "var(--sp-coral)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition disabled:opacity-45",
        active ? "border-transparent text-[#0b0e1a]" : "border-[var(--sp-line-strong)] text-[var(--sp-muted)]",
        !disabled && !active && "hover:text-[var(--sp-ink)]",
      )}
      style={active ? { background: color } : undefined}
    >
      {dir === "up" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4l8 9h-5v7H9v-7H4z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 20l-8-9h5V4h6v7h5z" />
        </svg>
      )}
      {count}
    </button>
  );
}

function TagEditor({
  songId,
  vocabulary,
  initialTagIds,
  initialNote,
  onClose,
  onSaved,
}: {
  songId: number;
  vocabulary: SongExtras["vocabulary"];
  initialTagIds: number[];
  initialNote: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(initialTagIds));
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await saveAnnotation({
        data: { songId, tagIds: [...selected], note: note.trim() },
      });
      if (!res.ok) {
        setError(res.error);
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--sp-line-strong)] bg-[var(--sp-bg-2)] p-5 shadow-2xl sp-scroll focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <Dialog.Title className="font-display text-base font-semibold">
            Tag guitar techniques
          </Dialog.Title>
          <p className="mt-1 text-xs text-[var(--sp-muted)]">
            Pick the techniques this song uses. Once you save, it&apos;s yours until the community
            downvotes it.
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {vocabulary.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-[13px] font-medium transition",
                  selected.has(t.id)
                    ? "border-[var(--sp-coral)] bg-[var(--sp-coral)]/15 text-[var(--sp-ink)]"
                    : "border-[var(--sp-line-strong)] bg-white/[0.03] text-[var(--sp-muted)] hover:text-[var(--sp-ink)]",
                )}
              >
                {t.name}
              </button>
            ))}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Optional note (e.g. capo 2nd fret, tricky barre in the chorus)"
            className="mt-4 w-full resize-none rounded-xl border border-[var(--sp-line)] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] focus:border-[var(--sp-coral)] focus:outline-none"
          />

          {error && <p className="mt-3 text-sm text-[var(--sp-coral)]">{error}</p>}

          <div className="mt-5 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <button className="rounded-full px-4 py-2 text-[13px] font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)]">
                Cancel
              </button>
            </Dialog.Close>
            <SolidCoral onClick={save} disabled={saving || (selected.size === 0 && !note.trim())}>
              {saving ? <Spinner /> : "Save tags"}
            </SolidCoral>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
