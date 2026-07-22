import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FeedFriend, Recommendation } from "../lib/types";
import { getInstruments, getMyProfile } from "../lib/api/profile.functions";
import { getRecommendations } from "../lib/api/recommend.functions";
import { addToLearning, getLearningIds, removeFromLearning } from "../lib/api/learning.functions";
import { likeSong, unlikeSong } from "../lib/api/likes.functions";
import { AddSongDialog, type AddTarget } from "../components/sp/AddSongDialog";
import {
  AquaGhost,
  Avatar,
  DifficultyMeter,
  InstrumentChip,
  PrimaryCTA,
  SongCover,
  StarsReadout,
  cx,
} from "../components/sp/ui";

export const Route = createFileRoute("/_app/discover")({
  loader: async () => {
    const [recs, instruments, profile, learningIds] = await Promise.all([
      getRecommendations({ data: { limit: 30 } }),
      getInstruments(),
      getMyProfile(),
      getLearningIds(),
    ]);
    return {
      recs,
      instruments,
      myInstrumentIds: profile.instruments.map((i) => i.id),
      learningIds,
    };
  },
  component: Discover,
});

function Discover() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [recs, setRecs] = useState<Recommendation[]>(data.recs);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [learningIds, setLearningIds] = useState<Set<number>>(new Set(data.learningIds));
  // Liked songs are excluded from the feed server-side, so every card starts
  // unliked — this only tracks hearts tapped during this session.
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  async function toggleLike(songId: number) {
    const has = likedIds.has(songId);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (has) next.delete(songId);
      else next.add(songId);
      return next;
    });
    try {
      if (has) await unlikeSong({ data: { songId } });
      else await likeSong({ data: { songId } });
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (has) next.add(songId);
        else next.delete(songId);
        return next;
      });
    }
  }

  // keep local list in sync when the loader reloads (after refresh)
  const loaderKey = useMemo(() => data.recs.map((r) => r.song.id).join(","), [data.recs]);
  const [seenKey, setSeenKey] = useState(loaderKey);
  if (seenKey !== loaderKey) {
    setSeenKey(loaderKey);
    setRecs(data.recs);
    setLearningIds(new Set(data.learningIds));
  }

  async function toggleLearning(songId: number) {
    const has = learningIds.has(songId);
    setLearningIds((prev) => {
      const next = new Set(prev);
      if (has) next.delete(songId);
      else next.add(songId);
      return next;
    });
    try {
      if (has) await removeFromLearning({ data: { songId } });
      else await addToLearning({ data: { songId } });
    } catch {
      // revert on failure
      setLearningIds((prev) => {
        const next = new Set(prev);
        if (has) next.add(songId);
        else next.delete(songId);
        return next;
      });
    }
  }

  /* ── Single shared preview player (only one song plays at a time) ────── */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const armedRef = useRef(false); // becomes true after the first user tap
  const [activeId, setActiveId] = useState<number | null>(null);
  const activeIdRef = useRef<number | null>(null);
  activeIdRef.current = activeId;

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setActiveId(null);
  }, []);

  const playSong = useCallback((songId: number, url: string) => {
    if (!url || typeof window === "undefined") return;
    let a = audioRef.current;
    if (!a) {
      a = new Audio();
      a.addEventListener("ended", () => setActiveId(null));
      audioRef.current = a;
    }
    if (a.src !== url) a.src = url;
    a.currentTime = 0;
    void a
      .play()
      .then(() => {
        armedRef.current = true;
        setActiveId(songId);
      })
      .catch(() => setActiveId(null));
  }, []);

  const toggle = useCallback(
    (songId: number, url: string) => {
      if (activeIdRef.current === songId) stop();
      else playSong(songId, url);
    },
    [playSong, stop],
  );

  // Reels behaviour: once the user has played one preview, scrolling a new
  // card into view auto-plays it. We wait for that first tap to respect
  // browsers' autoplay policy (and not blast audio on page load).
  const onEnterView = useCallback(
    (songId: number, url: string) => {
      if (!armedRef.current) return;
      if (activeIdRef.current === songId) return;
      playSong(songId, url);
    },
    [playSong],
  );

  useEffect(() => () => audioRef.current?.pause(), []);

  /* ── Feed scrolling: keyboard, drag, and refresh ─────────────────────── */
  const feedRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Arrow/Page keys move a whole card. Native key scrolling is only ~40px,
  // which `scroll-snap-type: y mandatory` immediately snaps back — which is why
  // only Space (a full-viewport jump) appeared to work.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = feedRef.current;
      if (!el || dialogOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      let dir = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown") dir = 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp") dir = -1;
      else if (e.key === "Home") {
        e.preventDefault();
        el.scrollTo({ top: 0, behavior: "smooth" });
        return;
      } else return;

      e.preventDefault();
      el.scrollBy({ top: dir * el.clientHeight, behavior: "smooth" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen]);

  // Click-and-drag to scroll (mouse only — touch already scrolls natively).
  // Snapping is disabled mid-drag so it doesn't fight the pointer, then we snap
  // to the nearest card on release.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest("button, a, input, textarea")) return; // let controls work
    const el = feedRef.current;
    if (!el) return;
    dragRef.current = { startY: e.clientY, startTop: el.scrollTop, moved: false };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    const el = feedRef.current;
    if (!d || !el) return;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.abs(dy) < 4) return;
      d.moved = true;
      el.style.scrollSnapType = "none";
    }
    el.scrollTop = d.startTop - dy;
  }

  function endDrag() {
    const d = dragRef.current;
    const el = feedRef.current;
    dragRef.current = null;
    if (!d || !el || !d.moved) return;
    el.style.scrollSnapType = "";
    const h = el.clientHeight || 1;
    el.scrollTo({ top: Math.round(el.scrollTop / h) * h, behavior: "smooth" });
  }

  // Refresh re-runs the loader AND returns you to the top — without the scroll
  // reset it silently did nothing visible when the picks were unchanged.
  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    stop();
    try {
      await router.invalidate();
    } finally {
      setRefreshing(false);
      feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function remove(songId: number) {
    setRecs((prev) => prev.filter((r) => r.song.id !== songId));
    if (activeIdRef.current === songId) stop();
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
          onClick={refresh}
          disabled={refreshing}
          className="pointer-events-auto rounded-full bg-black/40 px-3.5 py-1.5 text-sm font-semibold text-[var(--sp-muted)] backdrop-blur transition hover:text-[var(--sp-ink)] disabled:opacity-60"
        >
          <span className={cx("inline-block", refreshing && "animate-spin")}>↻</span>{" "}
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div
        ref={feedRef}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        className="sp-feed h-[calc(100dvh-118px)] overflow-y-auto outline-none lg:h-dvh"
      >
        {recs.length === 0 ? (
          <AllCaught onRefresh={refresh} />
        ) : (
          recs.map((rec) => (
            <FeedCard
              key={rec.song.id}
              rec={rec}
              playing={activeId === rec.song.id}
              isLearning={learningIds.has(rec.song.id)}
              isLiked={likedIds.has(rec.song.id)}
              onToggle={toggle}
              onEnterView={onEnterView}
              onToggleLearning={() => toggleLearning(rec.song.id)}
              onToggleLike={() => toggleLike(rec.song.id)}
              onAdd={() => openAdd(rec)}
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

function friendsLine(friends: FeedFriend[]): string {
  const names = friends.map((f) => f.displayName.split(" ")[0]);
  if (names.length === 1) return `${names[0]} plays this`;
  if (names.length === 2) return `${names[0]} & ${names[1]} play this`;
  return `${names[0]}, ${names[1]} +${names.length - 2} play this`;
}

function FeedPlayButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={playing ? "Pause preview" : "Play preview"}
      className={cx(
        "grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border text-white backdrop-blur-xl transition active:scale-95",
        playing
          ? "sp-playing-ring border-[var(--sp-coral)]/60 bg-black/45"
          : "border-white/30 bg-black/35 hover:bg-black/55",
      )}
    >
      {playing ? (
        <span className="sp-eq text-[var(--sp-coral)]" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      )}
    </button>
  );
}

function FeedCard({
  rec,
  playing,
  isLearning,
  isLiked,
  onToggle,
  onEnterView,
  onToggleLearning,
  onToggleLike,
  onAdd,
}: {
  rec: Recommendation;
  playing: boolean;
  isLearning: boolean;
  isLiked: boolean;
  onToggle: (songId: number, url: string) => void;
  onEnterView: (songId: number, url: string) => void;
  onToggleLearning: () => void;
  onToggleLike: () => void;
  onAdd: () => void;
}) {
  const { song, matchingInstruments, tags, friendsPlaying, ratingAvg, ratingCount } = rec;
  const articleRef = useRef<HTMLElement | null>(null);

  // Auto-play this card's preview when it scrolls into view (parent decides
  // whether audio is "armed" yet).
  useEffect(() => {
    const el = articleRef.current;
    if (!el || !song.previewUrl) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            onEnterView(song.id, song.previewUrl);
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [song.id, song.previewUrl, onEnterView]);

  return (
    <article ref={articleRef} className="sp-snap relative h-[calc(100dvh-118px)] w-full lg:h-dvh">
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

      <div className="relative mx-auto flex h-full max-w-xl flex-col px-4 pb-8 pt-20 sm:px-6">
        {/* Player lives in the free space ABOVE the card, so it can never
            overlap it however tall the card grows. */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 py-2">
          {song.previewUrl && (
            <>
              <FeedPlayButton
                playing={playing}
                onClick={() => onToggle(song.id, song.previewUrl)}
              />
              <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur">
                {playing ? "Now playing · 30s preview" : "Tap to preview"}
              </span>
            </>
          )}
        </div>

        <div className="rounded-[26px] border border-white/12 bg-black/40 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-6">
          {song.genre && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white/80">
                {song.genre}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-4xl font-bold leading-none drop-shadow-lg sm:text-5xl">
              {song.title}
            </h2>
            {playing && (
              <span className="sp-eq mb-1 text-[var(--sp-coral)]" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </span>
            )}
          </div>
          <p className="mt-2 text-lg font-medium text-white/90">
            {song.artist}
            {song.year ? <span className="text-white/50"> · {song.year}</span> : null}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
                  Community difficulty
                </div>
                <div className="mt-1">
                  <DifficultyMeter value={song.avgDifficulty} showLabel />
                </div>
              </div>
            </div>
            {ratingCount > 0 && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
                    Community rating
                  </div>
                  <div className="mt-1">
                    <StarsReadout value={ratingAvg ?? 0} count={ratingCount} size={15} className="text-white/85" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-medium text-white/60">Techniques</div>
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, 6).map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/85"
                  >
                    {t.name}
                  </span>
                ))}
                {tags.length > 6 && (
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60">
                    +{tags.length - 6}
                  </span>
                )}
              </div>
            </div>
          )}

          {friendsPlaying.length > 0 && (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-[var(--sp-aqua)]/25 bg-[var(--sp-aqua)]/[0.07] px-3 py-2.5">
              <div className="flex -space-x-2">
                {friendsPlaying.slice(0, 4).map((f) => (
                  <Link
                    key={f.username}
                    to="/u/$username"
                    params={{ username: f.username }}
                    className="rounded-full ring-2 ring-[#0b0e1a]/70 transition hover:z-10 hover:scale-105"
                  >
                    <Avatar name={f.displayName} hue={f.avatarHue} src={f.avatarUrl} size={30} />
                  </Link>
                ))}
              </div>
              <span className="min-w-0 flex-1 text-xs font-medium text-white/85">
                {friendsLine(friendsPlaying)}
              </span>
            </div>
          )}

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

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {/* Learn is the primary action now */}
            <button
              onClick={onToggleLearning}
              aria-label={isLearning ? "Remove from Learning" : "Add to Learning"}
              className={cx(
                "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition active:scale-[0.97]",
                isLearning
                  ? "border border-[var(--sp-aqua)] bg-[var(--sp-aqua)]/15 text-[var(--sp-aqua)]"
                  : "bg-[var(--sp-coral)] text-white shadow-[0_10px_30px_-10px_rgba(255,93,115,0.7)] hover:brightness-110",
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4 2 9l10 5 10-5-10-5Z" />
                <path d="M5 11v5c0 1.4 3.1 3 7 3s7-1.6 7-3v-5" />
              </svg>
              {isLearning ? "Learning" : "Learn"}
            </button>
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-5 py-3 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-black/50 active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                <path d="M12 5v14M5 12h14" />
              </svg>
              My songs
            </button>
            <button
              onClick={onToggleLike}
              aria-label={isLiked ? "Unlike this song" : "Like this song"}
              title={isLiked ? "Liked — we'll tune your feed" : "Like this song"}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur transition active:scale-[0.97]",
                isLiked
                  ? "border-[var(--sp-coral)] bg-[var(--sp-coral)]/20 text-[var(--sp-coral)]"
                  : "border-white/25 bg-black/30 text-white/85 hover:bg-black/50",
              )}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 20.5 4.6 13a4.6 4.6 0 1 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13z" />
              </svg>
              {rec.likes + (isLiked ? 1 : 0) || ""}
            </button>
            <Link
              to="/songs/$id"
              params={{ id: String(song.id) }}
              hash="comments"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-5 py-3 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-black/50 active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-5.5A8 8 0 1 1 21 12Z" />
              </svg>
              Comments
            </Link>
            <Link
              to="/songs/$id"
              params={{ id: String(song.id) }}
              className="ml-auto rounded-full border border-white/20 bg-black/30 px-4 py-3 text-sm font-semibold text-white/80 backdrop-blur transition hover:text-white"
            >
              Details
            </Link>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
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
