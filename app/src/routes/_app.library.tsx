import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import type { Instrument, SearchSong } from "../lib/types";
import { getInstruments, getMyProfile } from "../lib/api/profile.functions";
import { addCustomSong, searchSongs } from "../lib/api/songs.functions";
import { AddSongDialog, type AddTarget } from "../components/sp/AddSongDialog";
import {
  DifficultyMeter,
  DifficultyRater,
  PrimaryCTA,
  SolidCoral,
  SongCover,
  Spinner,
  cx,
} from "../components/sp/ui";

export const Route = createFileRoute("/_app/library")({
  loader: async () => {
    const [songs, instruments, profile] = await Promise.all([
      searchSongs({ data: { q: "", limit: 60 } }),
      getInstruments(),
      getMyProfile(),
    ]);
    return { songs, instruments, myInstrumentIds: profile.instruments.map((i) => i.id) };
  },
  component: Library,
});

function Library() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [tab, setTab] = useState<"browse" | "custom">("browse");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchSong[]>(data.songs);
  const [loading, setLoading] = useState(false);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchSongs({ data: { q: query, limit: 60 } });
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  function openAdd(song: SearchSong) {
    setAddTarget({ id: song.id, title: song.title, artist: song.artist, hue: song.hue });
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:py-10">
      <h1 className="font-display text-3xl font-bold">Library</h1>
      <p className="mt-1.5 text-[15px] text-[var(--sp-muted)]">
        Find songs to add to your set, or log one that isn&apos;t here yet.
      </p>

      <div className="mt-6 flex gap-1.5 rounded-full border border-[var(--sp-line)] bg-white/[0.02] p-1">
        {(["browse", "custom"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "flex-1 rounded-full px-4 py-2 text-sm font-semibold transition",
              tab === t ? "bg-white/[0.08] text-[var(--sp-ink)]" : "text-[var(--sp-muted)]",
            )}
          >
            {t === "browse" ? "Browse songs" : "Add a custom song"}
          </button>
        ))}
      </div>

      {tab === "browse" ? (
        <div className="mt-6">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sp-faint)]"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, artist, or genre…"
              className="w-full rounded-full border border-[var(--sp-line)] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] focus:border-[var(--sp-coral)] focus:outline-none"
            />
            {loading && <Spinner className="absolute right-4 top-1/2 -translate-y-1/2" />}
          </div>

          {results.length === 0 ? (
            <p className="mt-8 text-center text-sm text-[var(--sp-muted)]">
              No songs match “{query}”. Try the{" "}
              <button className="font-semibold text-[var(--sp-aqua)]" onClick={() => setTab("custom")}>
                custom song
              </button>{" "}
              tab.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {results.map((song) => (
                <li
                  key={song.id}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] p-3 transition hover:border-[var(--sp-line-strong)]"
                >
                  <Link to="/songs/$id" params={{ id: String(song.id) }} className="shrink-0">
                    <SongCover hue={song.hue} title={song.title} className="h-14 w-14" showWave={false} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/songs/$id"
                      params={{ id: String(song.id) }}
                      className="block truncate font-semibold hover:underline"
                    >
                      {song.title}
                    </Link>
                    <div className="truncate text-sm text-[var(--sp-muted)]">
                      {song.artist}
                      {song.genre ? <span className="text-[var(--sp-faint)]"> · {song.genre}</span> : null}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <DifficultyMeter value={song.avgDifficulty} size="sm" />
                      <span className="text-xs text-[var(--sp-faint)]">
                        {song.players} {song.players === 1 ? "player" : "players"}
                      </span>
                    </div>
                  </div>
                  {song.inLibrary ? (
                    <span className="shrink-0 rounded-full border border-[var(--sp-aqua)]/50 px-3 py-1.5 text-xs font-semibold text-[var(--sp-aqua)]">
                      ✓ In your set
                    </span>
                  ) : (
                    <SolidCoral onClick={() => openAdd(song)} className="shrink-0">
                      Add
                    </SolidCoral>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <CustomSongForm
          instruments={data.instruments}
          myInstrumentIds={data.myInstrumentIds}
          onAdded={() => {
            router.invalidate();
            setTab("browse");
          }}
        />
      )}

      <AddSongDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        song={addTarget}
        instruments={data.instruments}
        myInstrumentIds={data.myInstrumentIds}
        onAdded={() => {
          setResults((prev) =>
            prev.map((s) => (s.id === addTarget?.id ? { ...s, inLibrary: true } : s)),
          );
          router.invalidate();
        }}
      />
    </div>
  );
}

function CustomSongForm({
  instruments,
  myInstrumentIds,
  onAdded,
}: {
  instruments: Instrument[];
  myInstrumentIds: number[];
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [instrumentId, setInstrumentId] = useState<number | null>(myInstrumentIds[0] ?? null);
  const [difficulty, setDifficulty] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mine = new Set(myInstrumentIds);
  const ordered = [...instruments].sort((a, b) => (mine.has(b.id) ? 1 : 0) - (mine.has(a.id) ? 1 : 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !artist.trim()) {
      setError("Add both a title and an artist");
      return;
    }
    if (!instrumentId) {
      setError("Pick the instrument you play it on");
      return;
    }
    setSaving(true);
    try {
      const res = await addCustomSong({
        data: {
          title: title.trim(),
          artist: artist.trim(),
          genre: genre.trim(),
          year: year ? Number(year) : null,
          instrumentId,
          difficulty,
          note,
        },
      });
      if (!res.ok) {
        setError(res.error);
        setSaving(false);
        return;
      }
      setDone(true);
      setTitle("");
      setArtist("");
      setGenre("");
      setYear("");
      setNote("");
      onAdded();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="sp-card mt-6 p-5">
      {done && (
        <div className="mb-4 rounded-xl border border-[var(--sp-aqua)]/40 bg-[var(--sp-aqua)]/10 px-4 py-3 text-sm text-[var(--sp-aqua)]">
          Added to your set. Log another below.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Song title" value={title} onChange={setTitle} placeholder="Blackbird" />
        <TextField label="Artist" value={artist} onChange={setArtist} placeholder="The Beatles" />
        <TextField label="Genre (optional)" value={genre} onChange={setGenre} placeholder="Folk" />
        <TextField
          label="Year (optional)"
          value={year}
          onChange={(v) => setYear(v.replace(/[^0-9]/g, "").slice(0, 4))}
          placeholder="1968"
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--sp-faint)]">
          Instrument you play it on
        </p>
        <div className="flex flex-wrap gap-1.5">
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
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
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
          placeholder="Optional note"
          className="w-full rounded-xl border border-[var(--sp-line)] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] focus:border-[var(--sp-coral)] focus:outline-none"
        />
      </div>

      {error && <p className="mt-3 text-sm text-[var(--sp-coral)]">{error}</p>}

      <div className="mt-5">
        <PrimaryCTA type="submit" disabled={saving}>
          {saving ? <Spinner /> : "Add to my songs"}
        </PrimaryCTA>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sp-faint)]">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--sp-line)] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] focus:border-[var(--sp-coral)] focus:outline-none"
      />
    </label>
  );
}
