import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import type { CatalogTrack, Instrument, SearchSong } from "../lib/types";
import { searchCatalog } from "../lib/api/catalog.functions";
import { getInstruments, getMyProfile } from "../lib/api/profile.functions";
import { addCustomSong, searchSongs } from "../lib/api/songs.functions";
import { AddSongDialog, type AddTarget } from "../components/sp/AddSongDialog";
import {
  DifficultyMeter,
  DifficultyRater,
  PreviewButton,
  PrimaryCTA,
  SolidCoral,
  SongCover,
  Spinner,
  cx,
} from "../components/sp/ui";

export const Route = createFileRoute("/_app/library")({
  loader: async () => {
    const [community, instruments, profile] = await Promise.all([
      searchSongs({ data: { q: "", limit: 40 } }),
      getInstruments(),
      getMyProfile(),
    ]);
    return { community, instruments, myInstrumentIds: profile.instruments.map((i) => i.id) };
  },
  component: Library,
});

// One normalised row for either a community song (in our DB) or a catalog hit.
interface Row {
  key: string;
  songId: number | null;
  title: string;
  artist: string;
  genre: string;
  year: number | null;
  hue: number;
  artworkUrl: string;
  previewUrl: string;
  players: number;
  avgDifficulty: number | null;
  inLibrary: boolean;
  externalId: string;
}

function fromCommunity(s: SearchSong): Row {
  return {
    key: `db-${s.id}`,
    songId: s.id,
    title: s.title,
    artist: s.artist,
    genre: s.genre,
    year: s.year,
    hue: s.hue,
    artworkUrl: s.artworkUrl,
    previewUrl: s.previewUrl,
    players: s.players,
    avgDifficulty: s.avgDifficulty,
    inLibrary: s.inLibrary,
    externalId: "",
  };
}

function fromCatalog(t: CatalogTrack): Row {
  return {
    key: t.externalId || `${t.title}-${t.artist}`,
    songId: t.songId,
    title: t.title,
    artist: t.artist,
    genre: t.genre,
    year: t.year,
    hue: t.hue,
    artworkUrl: t.artworkUrl,
    previewUrl: t.previewUrl,
    players: t.players,
    avgDifficulty: t.avgDifficulty,
    inLibrary: t.inLibrary,
    externalId: t.externalId,
  };
}

function Library() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [tab, setTab] = useState<"search" | "custom">("search");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>(data.community.map(fromCommunity));
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 2) {
      setSearched(false);
      setRows(data.community.map(fromCommunity));
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await searchCatalog({ data: { q } });
        setRows(res.map(fromCatalog));
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function openAdd(row: Row) {
    setAddTarget({
      songId: row.songId,
      title: row.title,
      artist: row.artist,
      hue: row.hue,
      artworkUrl: row.artworkUrl,
      previewUrl: row.previewUrl,
      genre: row.genre,
      year: row.year,
      externalId: row.externalId,
    });
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-28 pt-8 lg:pb-12 lg:pt-10">
      <h1 className="font-display text-3xl font-bold">Add songs</h1>
      <p className="mt-1.5 text-[15px] text-[var(--sp-muted)]">
        Search the catalog — real covers, instant. Tap a song to add it to your set.
      </p>

      <div className="mt-6 flex gap-1.5 rounded-full border border-[var(--sp-line)] bg-white/[0.02] p-1">
        {(["search", "custom"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "flex-1 rounded-full px-4 py-2 text-sm font-semibold transition",
              tab === t ? "bg-white/[0.08] text-[var(--sp-ink)]" : "text-[var(--sp-muted)]",
            )}
          >
            {t === "search" ? "Search catalog" : "Not listed? Add it"}
          </button>
        ))}
      </div>

      {tab === "search" ? (
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
              placeholder="Search any song or artist…"
              className="w-full rounded-full border border-[var(--sp-line)] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] focus:border-[var(--sp-coral)] focus:outline-none"
            />
            {loading && <Spinner className="absolute right-4 top-1/2 -translate-y-1/2" />}
          </div>

          {!searched && (
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--sp-faint)]">
              Popular in the community
            </p>
          )}

          {rows.length === 0 ? (
            <p className="mt-8 text-center text-sm text-[var(--sp-muted)]">
              {searched ? (
                <>
                  Nothing found for “{query}”. You can{" "}
                  <button className="font-semibold text-[var(--sp-aqua)]" onClick={() => setTab("custom")}>
                    add it manually
                  </button>
                  .
                </>
              ) : (
                "Start typing to search the catalog."
              )}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] p-3 transition hover:border-[var(--sp-line-strong)]"
                >
                  <div className="relative h-14 w-14 shrink-0">
                    <SongCover
                      hue={row.hue}
                      title={row.title}
                      artworkUrl={row.artworkUrl}
                      className="h-14 w-14"
                      showWave={false}
                    />
                    {row.previewUrl && (
                      <div className="absolute inset-0 grid place-items-center">
                        <PreviewButton url={row.previewUrl} size={28} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {row.songId != null ? (
                      <Link
                        to="/songs/$id"
                        params={{ id: String(row.songId) }}
                        className="block truncate font-semibold hover:underline"
                      >
                        {row.title}
                      </Link>
                    ) : (
                      <div className="truncate font-semibold">{row.title}</div>
                    )}
                    <div className="truncate text-sm text-[var(--sp-muted)]">
                      {row.artist}
                      {row.genre ? <span className="text-[var(--sp-faint)]"> · {row.genre}</span> : null}
                      {row.year ? <span className="text-[var(--sp-faint)]"> · {row.year}</span> : null}
                    </div>
                    {row.players > 0 && (
                      <div className="mt-1.5 flex items-center gap-3">
                        <DifficultyMeter value={row.avgDifficulty} size="sm" />
                        <span className="text-xs text-[var(--sp-faint)]">
                          {row.players} {row.players === 1 ? "player" : "players"}
                        </span>
                      </div>
                    )}
                  </div>
                  {row.inLibrary ? (
                    <span className="shrink-0 rounded-full border border-[var(--sp-aqua)]/50 px-3 py-1.5 text-xs font-semibold text-[var(--sp-aqua)]">
                      ✓ In your set
                    </span>
                  ) : (
                    <SolidCoral onClick={() => openAdd(row)} className="shrink-0">
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
            setTab("search");
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
          setRows((prev) =>
            prev.map((r) =>
              r.title === addTarget?.title && r.artist === addTarget?.artist
                ? { ...r, inLibrary: true }
                : r,
            ),
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
