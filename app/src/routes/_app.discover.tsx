import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { difficultyLabel } from "../lib/catalog";
import type { Instrument, Recommendation } from "../lib/types";
import { getInstruments, getMyProfile } from "../lib/api/profile.functions";
import { dismissSong, getRecommendations } from "../lib/api/recommend.functions";
import { AddSongDialog, type AddTarget } from "../components/sp/AddSongDialog";
import {
  AquaGhost,
  DifficultyMeter,
  InstrumentChip,
  PrimaryCTA,
  SolidCoral,
  SongCover,
  cx,
} from "../components/sp/ui";

export const Route = createFileRoute("/_app/discover")({
  loader: async () => {
    const [recs, instruments, profile] = await Promise.all([
      getRecommendations({ data: { limit: 30 } }),
      getInstruments(),
      getMyProfile(),
    ]);
    return { recs, instruments, myInstrumentIds: profile.instruments.map((i) => i.id) };
  },
  component: Discover,
});

function Discover() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [recs, setRecs] = useState<Recommendation[]>(data.recs);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // keep local list in sync when the loader reloads (after refresh)
  const loaderKey = useMemo(() => data.recs.map((r) => r.song.id).join(","), [data.recs]);
  const [seenKey, setSeenKey] = useState(loaderKey);
  if (seenKey !== loaderKey) {
    setSeenKey(loaderKey);
    setRecs(data.recs);
  }

  function remove(songId: number) {
    setRecs((prev) => prev.filter((r) => r.song.id !== songId));
  }

  async function skip(rec: Recommendation) {
    remove(rec.song.id);
    try {
      await dismissSong({ data: { songId: rec.song.id } });
    } catch {
      /* best-effort */
    }
  }

  function openAdd(rec: Recommendation) {
    setAddTarget({
      songId: rec.song.id,
      title: rec.song.title,
      artist: rec.song.artist,
      hue: rec.song.hue,
      artworkUrl: rec.song.artworkUrl,
      previewUrl: rec.song.previewUrl,
    });
    setDialogOpen(true);
  }

  return (
    <div className="relative">
      {/* floating header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4">
        <span className="font-display pointer-events-auto rounded-full bg-black/40 px-3.5 py-1.5 text-sm font-semibold backdrop-blur">
          For you
        </span>
        <button
          onClick={() => router.invalidate()}
          className="pointer-events-auto rounded-full bg-black/40 px-3.5 py-1.5 text-sm font-semibold text-[var(--sp-muted)] backdrop-blur transition hover:text-[var(--sp-ink)]"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="sp-feed h-[calc(100dvh-118px)] overflow-y-auto lg:h-dvh">
        {recs.length === 0 ? (
          <AllCaught onRefresh={() => router.invalidate()} />
        ) : (
          recs.map((rec) => (
            <FeedCard
              key={rec.song.id}
              rec={rec}
              instruments={data.instruments}
              myInstrumentIds={data.myInstrumentIds}
              onAdd={() => openAdd(rec)}
              onSkip={() => skip(rec)}
            />
          ))
        )}
        {recs.length > 0 && <FeedTail count={recs.length} />}
      </div>

      <AddSongDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        song={addTarget}
        instruments={data.instruments}
        myInstrumentIds={data.myInstrumentIds}
        onAdded={() => {
          if (addTarget?.songId != null) remove(addTarget.songId);
        }}
      />
    </div>
  );
}

function FeedCard({
  rec,
  onAdd,
  onSkip,
}: {
  rec: Recommendation;
  instruments: Instrument[];
  myInstrumentIds: number[];
  onAdd: () => void;
  onSkip: () => void;
}) {
  const { song, reason, matchingInstruments } = rec;
  return (
    <article className="sp-snap relative h-[calc(100dvh-118px)] w-full lg:h-dvh">
      <div className="absolute inset-0">
        <SongCover
          hue={song.hue}
          title={song.title}
          artworkUrl={song.artworkUrl}
          className="h-full w-full"
          rounded=""
        />
      </div>
      {song.artworkUrl && <div className="absolute inset-0 bg-black/30" />}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,14,26,0.55)_0%,rgba(11,14,26,0.1)_28%,rgba(11,14,26,0.25)_55%,rgba(11,14,26,0.92)_100%)]" />

      <div className="relative mx-auto flex h-full max-w-xl flex-col justify-end px-6 pb-8 pt-20">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sp-coral)]/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
            <span aria-hidden>✦</span>
            {reason}
          </span>
          {song.genre && (
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white/80 backdrop-blur">
              {song.genre}
            </span>
          )}
        </div>

        <h2 className="font-display text-4xl font-bold leading-none drop-shadow-lg sm:text-5xl">
          {song.title}
        </h2>
        <p className="mt-2 text-lg font-medium text-white/90">
          {song.artist}
          {song.year ? <span className="text-white/50"> · {song.year}</span> : null}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-2.5 rounded-2xl bg-black/35 px-3.5 py-2.5 backdrop-blur">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
                Community difficulty
              </div>
              <div className="mt-1">
                <DifficultyMeter value={song.avgDifficulty} showLabel />
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-black/35 px-3.5 py-2.5 backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
              Players
            </div>
            <div className="font-display mt-0.5 text-lg font-bold">
              {song.players}
              <span className="ml-1 text-xs font-medium text-white/60">
                {song.players === 1 ? "musician" : "musicians"}
              </span>
            </div>
          </div>
        </div>

        {matchingInstruments.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-medium text-white/60">
              You could learn it on
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchingInstruments.map((inst) => (
                <InstrumentChip key={inst.id} instrument={inst} size="sm" active />
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2.5">
          <SolidCoral onClick={onAdd} className="px-6 py-3 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add to my songs
          </SolidCoral>
          <button
            onClick={onSkip}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-5 py-3 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-black/50 active:scale-[0.97]"
          >
            Skip
          </button>
          <Link
            to="/songs/$id"
            params={{ id: String(song.id) }}
            className="ml-auto rounded-full border border-white/20 bg-black/30 px-4 py-3 text-sm font-semibold text-white/80 backdrop-blur transition hover:text-white"
          >
            Details
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
          Scroll for the next pick
        </div>
      </div>
    </article>
  );
}

function FeedTail({ count }: { count: number }) {
  return (
    <div className="sp-snap grid h-[calc(100dvh-118px)] place-items-center px-6 lg:h-dvh">
      <div className="text-center">
        <div className="font-display sp-gradient-text text-4xl font-bold">That&apos;s the set</div>
        <p className="mx-auto mt-3 max-w-xs text-sm text-[var(--sp-muted)]">
          You&apos;ve been through {count} {count === 1 ? "pick" : "picks"}. Add more songs to your
          Library and the feed keeps re-tuning.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/library">
            <AquaGhost>Browse the Library</AquaGhost>
          </Link>
        </div>
      </div>
    </div>
  );
}

function AllCaught({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="grid h-[calc(100dvh-118px)] place-items-center px-6 lg:h-dvh">
      <div className="text-center">
        <div className="text-4xl">🎧</div>
        <h2 className="font-display mt-4 text-2xl font-bold">All caught up</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--sp-muted)]">
          No fresh picks right now. Add songs you can play so we can find musicians like you.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/library">
            <PrimaryCTA>Add songs</PrimaryCTA>
          </Link>
          <button
            onClick={onRefresh}
            className="rounded-full border border-[var(--sp-line-strong)] px-5 py-3 text-sm font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)]"
          >
            ↻ Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
