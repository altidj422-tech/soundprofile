import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";

import type { Instrument } from "../../lib/types";
import { addUserSong } from "../../lib/api/songs.functions";
import { DifficultyRater, SolidCoral, SongCover, Spinner, cx } from "./ui";

export interface AddTarget {
  id: number;
  title: string;
  artist: string;
  hue: number;
}

export function AddSongDialog({
  open,
  onOpenChange,
  song,
  instruments,
  myInstrumentIds,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  song: AddTarget | null;
  instruments: Instrument[];
  myInstrumentIds: number[];
  onAdded: () => void;
}) {
  const mine = new Set(myInstrumentIds);
  const ordered = [...instruments].sort((a, b) => {
    const am = mine.has(a.id) ? 0 : 1;
    const bm = mine.has(b.id) ? 0 : 1;
    return am - bm || a.id - b.id;
  });

  const [instrumentId, setInstrumentId] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time a new song is opened.
  useEffect(() => {
    if (open && song) {
      setInstrumentId(myInstrumentIds[0] ?? ordered[0]?.id ?? null);
      setDifficulty(3);
      setNote("");
      setError(null);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, song?.id]);

  async function confirm() {
    if (!song || !instrumentId) {
      setError("Pick the instrument you play it on");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await addUserSong({
        data: { songId: song.id, instrumentId, difficulty, note },
      });
      if (!res.ok) {
        setError(res.error);
        setSaving(false);
        return;
      }
      onAdded();
      onOpenChange(false);
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--sp-line-strong)] bg-[var(--sp-bg-2)] p-5 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          {song && (
            <>
              <div className="flex items-center gap-3">
                <SongCover hue={song.hue} title={song.title} className="h-14 w-14" />
                <div className="min-w-0">
                  <Dialog.Title className="font-display truncate text-base font-semibold">
                    {song.title}
                  </Dialog.Title>
                  <p className="truncate text-sm text-[var(--sp-muted)]">{song.artist}</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--sp-faint)]">
                  Instrument you play it on
                </p>
                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto sp-scroll">
                  {ordered.map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => setInstrumentId(inst.id)}
                      className={cx(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition",
                        instrumentId === inst.id
                          ? "border-[var(--sp-coral)] bg-[var(--sp-coral)]/15 text-[var(--sp-ink)]"
                          : "border-[var(--sp-line-strong)] bg-white/[0.03] text-[var(--sp-muted)] hover:text-[var(--sp-ink)]",
                      )}
                    >
                      <span aria-hidden>{inst.emoji}</span>
                      {inst.name}
                      {mine.has(inst.id) && (
                        <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[var(--sp-aqua)]" aria-hidden />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--sp-faint)]">
                  How hard is it to play?
                </p>
                <DifficultyRater value={difficulty} onChange={setDifficulty} />
              </div>

              <div className="mt-4">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  placeholder="Optional note (e.g. capo 2, tricky bridge)"
                  className="w-full rounded-xl border border-[var(--sp-line)] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] focus:border-[var(--sp-coral)] focus:outline-none"
                />
              </div>

              {error && <p className="mt-3 text-sm text-[var(--sp-coral)]">{error}</p>}

              <div className="mt-5 flex items-center justify-end gap-2">
                <Dialog.Close asChild>
                  <button className="rounded-full px-4 py-2 text-[13px] font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)]">
                    Cancel
                  </button>
                </Dialog.Close>
                <SolidCoral onClick={confirm} disabled={saving}>
                  {saving ? <Spinner /> : "Add to my songs"}
                </SolidCoral>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
