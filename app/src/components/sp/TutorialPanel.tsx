import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import type { SongTutorial } from "../../lib/types";
import { removeSongTutorial, setSongTutorial } from "../../lib/api/tutorials.functions";
import { SolidCoral, Spinner } from "./ui";

function YouTubeGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * (20 / 28)}
      viewBox="0 0 28 20"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect width="28" height="20" rx="5" fill="#FF0033" />
      <path d="M11.2 5.8 19 10l-7.8 4.2z" fill="#fff" />
    </svg>
  );
}

export function TutorialPanel({
  songId,
  title,
  artist,
  instrument,
  tutorial,
  canContribute,
}: {
  songId: number;
  title: string;
  artist: string;
  instrument: string;
  tutorial: SongTutorial | null;
  canContribute: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = [title, artist, instrument, "tutorial"].filter(Boolean).join(" ");
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  async function save() {
    setError(null);
    if (!url.trim()) {
      setError("Paste a YouTube link first.");
      return;
    }
    setSaving(true);
    try {
      const res = await setSongTutorial({ data: { songId, url: url.trim() } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setUrl("");
      setEditing(false);
      router.invalidate();
    } catch {
      setError("Couldn't save that link. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await removeSongTutorial({ data: { songId } });
      router.invalidate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">How to play it</h2>
        <a
          href={searchUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--sp-line-strong)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[var(--sp-muted)] transition hover:border-[#FF0033]/50 hover:text-[var(--sp-ink)]"
        >
          <YouTubeGlyph size={18} />
          Search on YouTube
        </a>
      </div>

      {tutorial ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--sp-line)] bg-black/40 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.8)]">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              key={tutorial.videoId}
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${tutorial.videoId}?rel=0&modestbranding=1`}
              title={`${title} — tutorial`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--sp-faint)]">
              <YouTubeGlyph size={15} />
              Community tutorial · added by{" "}
              <span className="font-medium text-[var(--sp-muted)]">@{tutorial.addedByUsername}</span>
            </span>
            {tutorial.canEdit && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setEditing((v) => !v);
                    setError(null);
                  }}
                  className="rounded-full border border-[var(--sp-line-strong)] px-3 py-1 text-xs font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)]"
                >
                  Replace
                </button>
                <button
                  onClick={remove}
                  disabled={saving}
                  className="rounded-full px-3 py-1 text-xs font-medium text-[var(--sp-faint)] transition hover:text-[var(--sp-coral)] disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      ) : canContribute ? (
        <div className="rounded-2xl border border-dashed border-[var(--sp-line-strong)] bg-white/[0.02] px-6 py-8 text-center">
          <div className="mx-auto flex w-fit items-center justify-center">
            <YouTubeGlyph size={34} />
          </div>
          <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--sp-muted)]">
            No tutorial pinned yet. Know a great one? Paste a YouTube link and help the next player
            learn it.
          </p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--sp-coral)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
            >
              Pin a tutorial
            </button>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] px-4 py-6 text-center text-sm text-[var(--sp-faint)]">
          No tutorial pinned yet. Search YouTube above to find one.
        </p>
      )}

      {editing && (
        <div className="mt-3 rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] p-3.5">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sp-faint)]">
            YouTube tutorial link
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="w-full rounded-xl border border-[var(--sp-line)] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] focus:border-[var(--sp-coral)] focus:outline-none"
          />
          {error && <p className="mt-2 text-sm text-[var(--sp-coral)]">{error}</p>}
          <div className="mt-2.5 flex items-center gap-2">
            <SolidCoral onClick={save} disabled={saving}>
              {saving ? <Spinner /> : tutorial ? "Save new link" : "Pin tutorial"}
            </SolidCoral>
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
                setUrl("");
              }}
              className="px-3 text-sm font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
