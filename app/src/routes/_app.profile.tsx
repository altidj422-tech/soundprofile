import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { difficultyLabel, skillLabel } from "../lib/catalog";
import type { Instrument, MySong, ProfilePublic } from "../lib/types";
import {
  getInstruments,
  getMyProfile,
  setMyInstruments,
  updateProfile,
} from "../lib/api/profile.functions";
import { removeUserSong } from "../lib/api/songs.functions";
import { AddSongDialog, type AddTarget } from "../components/sp/AddSongDialog";
import {
  Avatar,
  DifficultyMeter,
  EmptyState,
  InstrumentChip,
  PrimaryCTA,
  QuietGlass,
  SongCover,
  Spinner,
  cx,
} from "../components/sp/ui";

export const Route = createFileRoute("/_app/profile")({
  loader: async () => {
    const [profile, instruments] = await Promise.all([getMyProfile(), getInstruments()]);
    return { profile, instruments };
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, instruments } = Route.useLoaderData();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editingInstruments, setEditingInstruments] = useState(false);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const myInstrumentIds = profile.instruments.map((i) => i.id);

  async function onRemove(userSongId: number) {
    await removeUserSong({ data: { userSongId } });
    router.invalidate();
  }

  function onRate(song: MySong) {
    setAddTarget({
      songId: song.song.id,
      title: song.song.title,
      artist: song.song.artist,
      hue: song.song.hue,
      artworkUrl: song.song.artworkUrl,
      previewUrl: song.song.previewUrl,
    });
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-28 pt-8 lg:pb-12 lg:pt-10">
      {/* Header */}
      <div className="sp-card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={profile.user.displayName} hue={profile.user.avatarHue} size={84} ring />
          <div className="min-w-0 flex-1">
            {editing ? (
              <EditProfileForm
                profile={profile}
                onDone={() => {
                  setEditing(false);
                  router.invalidate();
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold">{profile.user.displayName}</h1>
                <p className="text-sm text-[var(--sp-muted)]">@{profile.user.username}</p>
                {profile.user.bio && (
                  <p className="mt-2 text-[15px] text-[var(--sp-ink)]/90">{profile.user.bio}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <QuietGlass onClick={() => setEditing(true)}>Edit profile</QuietGlass>
                  <Link to="/u/$username" params={{ username: profile.user.username }}>
                    <QuietGlass>View public page</QuietGlass>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Songs" value={profile.stats.songCount} />
          <Stat label="Instruments" value={profile.stats.instrumentCount} />
          <Stat
            label="Avg difficulty"
            value={profile.stats.avgDifficulty ? difficultyLabel(profile.stats.avgDifficulty) : "—"}
          />
        </div>
      </div>

      {/* Instruments */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Instruments</h2>
          {!editingInstruments && (
            <button
              onClick={() => setEditingInstruments(true)}
              className="text-sm font-semibold text-[var(--sp-aqua)] hover:underline"
            >
              Edit
            </button>
          )}
        </div>
        {editingInstruments ? (
          <InstrumentEditor
            instruments={instruments}
            current={profile.instruments}
            onDone={() => {
              setEditingInstruments(false);
              router.invalidate();
            }}
            onCancel={() => setEditingInstruments(false)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.instruments.map((inst) => (
              <InstrumentChip key={inst.id} instrument={inst} skill={inst.skill} />
            ))}
          </div>
        )}
      </div>

      {/* Songs */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">My songs</h2>
          <Link to="/library" className="text-sm font-semibold text-[var(--sp-aqua)] hover:underline">
            + Add songs
          </Link>
        </div>
        {profile.songs.length === 0 ? (
          <EmptyState title="No songs yet" icon="🎼">
            Head to the Library to add the first song you can play.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {profile.songs.map((song) => (
              <li
                key={song.userSongId}
                className="flex items-center gap-3 rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] p-3"
              >
                <Link to="/songs/$id" params={{ id: String(song.song.id) }} className="shrink-0">
                  <SongCover
                    hue={song.song.hue}
                    title={song.song.title}
                    artworkUrl={song.song.artworkUrl}
                    className="h-14 w-14"
                    showWave={false}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/songs/$id"
                    params={{ id: String(song.song.id) }}
                    className="block truncate font-semibold hover:underline"
                  >
                    {song.song.title}
                  </Link>
                  <div className="truncate text-sm text-[var(--sp-muted)]">{song.song.artist}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-xs font-medium text-[var(--sp-muted)]">
                      {song.instrument.emoji} {song.instrument.name}
                    </span>
                    <span className="text-xs text-[var(--sp-faint)]">Your rating:</span>
                    <DifficultyMeter value={song.difficulty} size="sm" />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <button
                    onClick={() => onRate(song)}
                    className="rounded-full border border-[var(--sp-line-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)]"
                  >
                    Re-rate
                  </button>
                  <button
                    onClick={() => onRemove(song.userSongId)}
                    className="rounded-full px-3 py-1 text-xs font-medium text-[var(--sp-faint)] transition hover:text-[var(--sp-coral)]"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddSongDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        song={addTarget}
        instruments={instruments}
        myInstrumentIds={myInstrumentIds}
        onAdded={() => router.invalidate()}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] px-4 py-3 text-center">
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs text-[var(--sp-faint)]">{label}</div>
    </div>
  );
}

function EditProfileForm({
  profile,
  onDone,
  onCancel,
}: {
  profile: ProfilePublic;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile.user.displayName);
  const [bio, setBio] = useState(profile.user.bio);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateProfile({ data: { displayName, bio } });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        maxLength={40}
        className="w-full rounded-xl border border-[var(--sp-line)] bg-white/[0.03] px-3.5 py-2 text-sm font-semibold focus:border-[var(--sp-coral)] focus:outline-none"
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={280}
        rows={2}
        placeholder="Add a short bio"
        className="w-full resize-none rounded-xl border border-[var(--sp-line)] bg-white/[0.03] px-3.5 py-2 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] focus:border-[var(--sp-coral)] focus:outline-none"
      />
      <div className="flex gap-2">
        <PrimaryCTA onClick={save} disabled={saving} className="px-5 py-2 text-[13px]">
          {saving ? <Spinner /> : "Save"}
        </PrimaryCTA>
        <button onClick={onCancel} className="px-4 text-sm font-semibold text-[var(--sp-muted)]">
          Cancel
        </button>
      </div>
    </div>
  );
}

function InstrumentEditor({
  instruments,
  current,
  onDone,
  onCancel,
}: {
  instruments: Instrument[];
  current: { id: number; skill: number }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Record<number, number>>(
    Object.fromEntries(current.map((c) => [c.id, c.skill])),
  );
  const [saving, setSaving] = useState(false);
  const ids = Object.keys(selected).map(Number);

  async function save() {
    setSaving(true);
    try {
      await setMyInstruments({
        data: { items: ids.map((id) => ({ instrumentId: id, skill: selected[id] })) },
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sp-card p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {instruments.map((inst) => {
          const active = selected[inst.id] != null;
          return (
            <div
              key={inst.id}
              className={cx(
                "rounded-xl border p-3 transition",
                active ? "border-[var(--sp-coral)] bg-[var(--sp-coral)]/10" : "border-[var(--sp-line)]",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setSelected((prev) => {
                    const next = { ...prev };
                    if (next[inst.id] != null) delete next[inst.id];
                    else next[inst.id] = 2;
                    return next;
                  })
                }
                className="flex w-full items-center gap-2.5 text-left"
              >
                <span className="text-xl" aria-hidden>
                  {inst.emoji}
                </span>
                <span className="flex-1 text-sm font-semibold">{inst.name}</span>
                <span
                  className={cx(
                    "grid h-5 w-5 place-items-center rounded-full text-[11px]",
                    active ? "bg-[var(--sp-coral)] text-white" : "border border-[var(--sp-line-strong)] text-transparent",
                  )}
                >
                  ✓
                </span>
              </button>
              {active && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelected((p) => ({ ...p, [inst.id]: lvl }))}
                      className={cx(
                        "flex-1 rounded-md border px-1 py-1 text-[10px] font-semibold transition",
                        selected[inst.id] === lvl
                          ? "border-[var(--sp-aqua)] bg-[var(--sp-aqua)]/15 text-[var(--sp-ink)]"
                          : "border-[var(--sp-line)] text-[var(--sp-faint)]",
                      )}
                    >
                      {skillLabel(lvl)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryCTA onClick={save} disabled={saving || ids.length === 0} className="px-5 py-2 text-[13px]">
          {saving ? <Spinner /> : "Save instruments"}
        </PrimaryCTA>
        <button onClick={onCancel} className="px-4 text-sm font-semibold text-[var(--sp-muted)]">
          Cancel
        </button>
      </div>
    </div>
  );
}
