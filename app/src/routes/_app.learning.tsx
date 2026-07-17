import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import type { LearningSong } from "../lib/types";
import { getLearning, removeFromLearning } from "../lib/api/learning.functions";
import { getInstruments, getMyProfile } from "../lib/api/profile.functions";
import { AddSongDialog, type AddTarget } from "../components/sp/AddSongDialog";
import {
  DifficultyMeter,
  EmptyState,
  PreviewButton,
  PrimaryCTA,
  SolidCoral,
  SongCover,
  cx,
} from "../components/sp/ui";

export const Route = createFileRoute("/_app/learning")({
  loader: async () => {
    const [learning, instruments, profile] = await Promise.all([
      getLearning(),
      getInstruments(),
      getMyProfile(),
    ]);
    return { learning, instruments, myInstrumentIds: profile.instruments.map((i) => i.id) };
  },
  component: LearningPage,
});

function LearningPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const learning = data.learning;
  const inProgress = learning.filter((l) => !l.inLibrary).length;

  async function remove(songId: number) {
    await removeFromLearning({ data: { songId } });
    router.invalidate();
  }

  function openAdd(l: LearningSong) {
    setAddTarget({
      songId: l.song.id,
      title: l.song.title,
      artist: l.song.artist,
      hue: l.song.hue,
      artworkUrl: l.song.artworkUrl,
      previewUrl: l.song.previewUrl,
    });
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-28 pt-8 lg:pb-12 lg:pt-10">
      <h1 className="font-display text-3xl font-bold">Learning</h1>
      <p className="mt-1.5 text-[15px] text-[var(--sp-muted)]">
        Songs you&apos;re working toward. Tap the{" "}
        <span className="font-semibold text-[var(--sp-aqua)]">Learn</span> button on any song to
        save it here — then move it to your set once you&apos;ve nailed it.
      </p>

      {learning.length > 0 && (
        <div className="mt-4 text-sm text-[var(--sp-faint)]">
          {learning.length} {learning.length === 1 ? "song" : "songs"}
          {inProgress !== learning.length && ` · ${learning.length - inProgress} already in your set`}
        </div>
      )}

      {learning.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Nothing here yet" icon="🎯">
            When a song in the feed catches your ear, hit{" "}
            <span className="font-semibold text-[var(--sp-aqua)]">Learn</span> to line it up here.{" "}
            <Link to="/discover" className="text-[var(--sp-aqua)]">
              Open the feed
            </Link>
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {learning.map((l) => (
            <li
              key={l.song.id}
              className={cx(
                "flex items-center gap-3 rounded-2xl border p-3 transition",
                l.inLibrary
                  ? "border-[var(--sp-aqua)]/40 bg-[var(--sp-aqua)]/[0.06]"
                  : "border-[var(--sp-line)] bg-white/[0.02] hover:border-[var(--sp-line-strong)]",
              )}
            >
              <div className="relative h-14 w-14 shrink-0">
                <Link to="/songs/$id" params={{ id: String(l.song.id) }}>
                  <SongCover
                    hue={l.song.hue}
                    title={l.song.title}
                    artworkUrl={l.song.artworkUrl}
                    className="h-14 w-14"
                    showWave={false}
                  />
                </Link>
                {l.song.previewUrl && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="pointer-events-auto">
                      <PreviewButton url={l.song.previewUrl} size={28} />
                    </div>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  to="/songs/$id"
                  params={{ id: String(l.song.id) }}
                  className="block truncate font-semibold hover:underline"
                >
                  {l.song.title}
                </Link>
                <div className="truncate text-sm text-[var(--sp-muted)]">
                  {l.song.artist}
                  {l.song.year ? <span className="text-[var(--sp-faint)]"> · {l.song.year}</span> : null}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <DifficultyMeter value={l.song.avgDifficulty} size="sm" />
                  {l.song.players > 0 && (
                    <span className="text-xs text-[var(--sp-faint)]">
                      {l.song.players} {l.song.players === 1 ? "player" : "players"}
                    </span>
                  )}
                  {l.inLibrary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sp-aqua)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--sp-aqua)]">
                      🎉 You can play this now
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {!l.inLibrary && (
                  <SolidCoral onClick={() => openAdd(l)} className="shrink-0">
                    Add to my songs
                  </SolidCoral>
                )}
                <button
                  onClick={() => remove(l.song.id)}
                  className="rounded-full px-3 py-1 text-xs font-medium text-[var(--sp-faint)] transition hover:text-[var(--sp-coral)]"
                >
                  {l.inLibrary ? "Remove from Learning" : "Remove"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddSongDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        song={addTarget}
        instruments={data.instruments}
        myInstrumentIds={data.myInstrumentIds}
        onAdded={() => router.invalidate()}
      />
    </div>
  );
}
