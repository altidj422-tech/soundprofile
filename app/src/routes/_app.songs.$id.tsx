import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { difficultyLabel } from "../lib/catalog";
import { getSongExtras } from "../lib/api/annotations.functions";
import { getComments } from "../lib/api/comments.functions";
import { addToLearning, getLearningIds, removeFromLearning } from "../lib/api/learning.functions";
import { getInstruments, getMyProfile } from "../lib/api/profile.functions";
import { getSongDetail, removeUserSong } from "../lib/api/songs.functions";
import { getSongTutorial } from "../lib/api/tutorials.functions";
import { AddSongDialog } from "../components/sp/AddSongDialog";
import { CommentsPanel } from "../components/sp/CommentsPanel";
import { TechniquesPanel } from "../components/sp/TechniquesPanel";
import { TutorialPanel } from "../components/sp/TutorialPanel";
import {
  Avatar,
  DifficultyMeter,
  EmptyState,
  PreviewButton,
  PrimaryCTA,
  QuietGlass,
  SongCover,
  cx,
} from "../components/sp/ui";

export const Route = createFileRoute("/_app/songs/$id")({
  loader: async ({ params }) => {
    const songId = Number(params.id);
    if (!Number.isFinite(songId))
      return {
        detail: null,
        instruments: [],
        myInstrumentIds: [],
        extras: null,
        comments: [],
        isLearning: false,
        tutorial: null,
      };
    const [detail, instruments, profile, extras, comments, learningIds, tutorial] =
      await Promise.all([
        getSongDetail({ data: { songId } }),
        getInstruments(),
        getMyProfile(),
        getSongExtras({ data: { songId } }),
        getComments({ data: { songId } }),
        getLearningIds(),
        getSongTutorial({ data: { songId } }),
      ]);
    return {
      detail,
      instruments,
      myInstrumentIds: profile.instruments.map((i) => i.id),
      extras,
      comments,
      isLearning: learningIds.includes(songId),
      tutorial,
    };
  },
  component: SongPage,
});

function SongPage() {
  const { detail, instruments, myInstrumentIds, extras, comments, isLearning, tutorial } =
    Route.useLoaderData();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [learning, setLearning] = useState(isLearning);
  const [learningBusy, setLearningBusy] = useState(false);

  async function toggleLearning(songId: number) {
    if (learningBusy) return;
    const next = !learning;
    setLearning(next);
    setLearningBusy(true);
    try {
      if (next) await addToLearning({ data: { songId } });
      else await removeFromLearning({ data: { songId } });
    } catch {
      setLearning(!next);
    } finally {
      setLearningBusy(false);
    }
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <EmptyState title="Song not found" icon="🔍">
          This song doesn&apos;t exist. <Link to="/library" className="text-[var(--sp-aqua)]">Back to Library</Link>
        </EmptyState>
      </div>
    );
  }

  const { song, players, byInstrument, mine } = detail;

  // Instrument to bias the YouTube search toward: the one you play this song on,
  // else your primary instrument, else nothing.
  const learnInstrument =
    mine[0]?.instrument.name ??
    instruments.find((i) => i.id === myInstrumentIds[0])?.name ??
    "";
  const canContribute = !!extras && extras.viewer.userId > 0 && !extras.viewer.banned;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-8 lg:pb-12 lg:pt-10">
      <Link to="/discover" className="text-sm font-medium text-[var(--sp-faint)] hover:text-[var(--sp-muted)]">
        ← Back to feed
      </Link>

      {/* Hero */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-[var(--sp-line)]">
        <div className="relative h-44 sm:h-56">
          <div className="absolute inset-0">
            <SongCover
              hue={song.hue}
              title={song.title}
              artworkUrl={song.artworkUrl}
              className="h-full w-full"
              rounded=""
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--sp-bg-2)] via-transparent to-transparent" />
          {song.previewUrl && (
            <div className="absolute bottom-3 right-3">
              <PreviewButton url={song.previewUrl} size={44} />
            </div>
          )}
        </div>
        <div className="bg-[var(--sp-bg-2)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold leading-tight">{song.title}</h1>
              <p className="mt-1 text-lg text-[var(--sp-muted)]">
                {song.artist}
                {song.year ? <span className="text-[var(--sp-faint)]"> · {song.year}</span> : null}
                {song.genre ? <span className="text-[var(--sp-faint)]"> · {song.genre}</span> : null}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {mine.length > 0 ? (
                <span className="rounded-full border border-[var(--sp-aqua)]/50 px-3 py-2 text-sm font-semibold text-[var(--sp-aqua)]">
                  ✓ In your set
                </span>
              ) : (
                <PrimaryCTA onClick={() => setDialogOpen(true)} className="px-5 py-2.5 text-sm">
                  Add to my songs
                </PrimaryCTA>
              )}
              <button
                onClick={() => toggleLearning(song.id)}
                disabled={learningBusy}
                aria-label={learning ? "Remove from Learning" : "Add to Learning"}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition active:scale-[0.97] disabled:opacity-60",
                  learning
                    ? "border-[var(--sp-aqua)] bg-[var(--sp-aqua)]/12 text-[var(--sp-aqua)]"
                    : "border-[var(--sp-line-strong)] bg-white/[0.03] text-[var(--sp-muted)] hover:text-[var(--sp-ink)]",
                )}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4 2 9l10 5 10-5-10-5Z" />
                  <path d="M5 11v5c0 1.4 3.1 3 7 3s7-1.6 7-3v-5" />
                </svg>
                {learning ? "In Learning" : "Learn this"}
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--sp-faint)]">
                Community difficulty
              </div>
              <div className="mt-1.5">
                <DifficultyMeter value={song.avgDifficulty} />
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--sp-faint)]">
                Played by
              </div>
              <div className="font-display mt-1 text-lg font-bold">
                {song.players} {song.players === 1 ? "musician" : "musicians"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Your entries */}
      {mine.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display mb-3 text-lg font-semibold">You play this on</h2>
          <div className="space-y-2">
            {mine.map((m) => (
              <div
                key={m.userSongId}
                className="flex items-center gap-3 rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] p-3"
              >
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-sm font-medium">
                  {m.instrument.emoji} {m.instrument.name}
                </span>
                <div className="flex items-center gap-2 text-sm text-[var(--sp-muted)]">
                  Your rating <DifficultyMeter value={m.difficulty} size="sm" />
                </div>
                {m.note && <span className="truncate text-xs text-[var(--sp-faint)]">“{m.note}”</span>}
                <button
                  onClick={async () => {
                    await removeUserSong({ data: { userSongId: m.userSongId } });
                    router.invalidate();
                  }}
                  className="ml-auto rounded-full px-3 py-1 text-xs font-medium text-[var(--sp-faint)] transition hover:text-[var(--sp-coral)]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <QuietGlass onClick={() => setDialogOpen(true)}>Add another instrument</QuietGlass>
          </div>
        </div>
      )}

      {/* Difficulty by instrument */}
      {byInstrument.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display mb-3 text-lg font-semibold">Difficulty by instrument</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {byInstrument.map((row) => (
              <div
                key={row.instrument.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] p-3.5"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-lg">{row.instrument.emoji}</span>
                  {row.instrument.name}
                </span>
                <div className="flex items-center gap-2">
                  <DifficultyMeter value={row.avgDifficulty} size="sm" showLabel={false} />
                  <span className="w-24 text-right text-xs text-[var(--sp-muted)]">
                    {difficultyLabel(row.avgDifficulty)} · {row.players}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {extras && <TechniquesPanel songId={song.id} extras={extras} />}

      {/* Tutorial: community-pinned embed + YouTube search */}
      <TutorialPanel
        songId={song.id}
        title={song.title}
        artist={song.artist}
        instrument={learnInstrument}
        tutorial={tutorial}
        canContribute={canContribute}
      />

      {/* Players */}
      <div className="mt-8">
        <h2 className="font-display mb-3 text-lg font-semibold">Who plays it</h2>
        {players.length === 0 ? (
          <EmptyState title="Be the first" icon="🎵">
            No one has logged this song yet. Add it to your set to start its difficulty rating.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {players.map((p, i) => (
              <li
                key={`${p.username}-${p.instrument.id}-${i}`}
                className="flex items-center gap-3 rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] p-3"
              >
                <Link to="/u/$username" params={{ username: p.username }}>
                  <Avatar name={p.displayName} hue={p.avatarHue} size={40} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/u/$username"
                    params={{ username: p.username }}
                    className="block truncate font-semibold hover:underline"
                  >
                    {p.displayName}
                  </Link>
                  <div className="truncate text-xs text-[var(--sp-faint)]">
                    {p.instrument.emoji} {p.instrument.name}
                    {p.note ? ` · “${p.note}”` : ""}
                  </div>
                </div>
                <DifficultyMeter value={p.difficulty} size="sm" showLabel={false} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {extras && <CommentsPanel songId={song.id} comments={comments} viewer={extras.viewer} />}

      <AddSongDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        song={{
          songId: song.id,
          title: song.title,
          artist: song.artist,
          hue: song.hue,
          artworkUrl: song.artworkUrl,
          previewUrl: song.previewUrl,
        }}
        instruments={instruments}
        myInstrumentIds={myInstrumentIds}
        onAdded={() => router.invalidate()}
      />
    </div>
  );
}
