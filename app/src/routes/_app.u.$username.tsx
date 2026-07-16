import { createFileRoute, Link } from "@tanstack/react-router";

import { difficultyLabel } from "../lib/catalog";
import { getUserProfile } from "../lib/api/profile.functions";
import {
  Avatar,
  DifficultyMeter,
  EmptyState,
  InstrumentChip,
  QuietGlass,
  SongCover,
} from "../components/sp/ui";

export const Route = createFileRoute("/_app/u/$username")({
  loader: async ({ params }) => {
    const profile = await getUserProfile({ data: { username: params.username } });
    return { profile };
  },
  component: PublicProfile,
});

function PublicProfile() {
  const { profile } = Route.useLoaderData();

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <EmptyState title="Musician not found" icon="🔍">
          No one goes by that name here. <Link to="/discover" className="text-[var(--sp-aqua)]">Back to feed</Link>
        </EmptyState>
      </div>
    );
  }

  const { user, instruments, songs, stats, isMe } = profile;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-8 lg:pb-12 lg:pt-10">
      <Link to="/discover" className="text-sm font-medium text-[var(--sp-faint)] hover:text-[var(--sp-muted)]">
        ← Back to feed
      </Link>

      <div className="sp-card mt-4 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={user.displayName} hue={user.avatarHue} size={84} ring />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{user.displayName}</h1>
              {user.isSeed && (
                <span className="rounded-full border border-[var(--sp-line-strong)] px-2 py-0.5 text-[11px] font-medium text-[var(--sp-faint)]">
                  Sample musician
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--sp-muted)]">@{user.username}</p>
            {user.bio && <p className="mt-2 text-[15px] text-[var(--sp-ink)]/90">{user.bio}</p>}
            {isMe && (
              <div className="mt-3">
                <Link to="/profile">
                  <QuietGlass>Edit your profile</QuietGlass>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Songs" value={stats.songCount} />
          <Stat label="Instruments" value={stats.instrumentCount} />
          <Stat
            label="Avg difficulty"
            value={stats.avgDifficulty ? difficultyLabel(stats.avgDifficulty) : "—"}
          />
        </div>
      </div>

      {instruments.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display mb-3 text-lg font-semibold">Plays</h2>
          <div className="flex flex-wrap gap-2">
            {instruments.map((inst) => (
              <InstrumentChip key={inst.id} instrument={inst} skill={inst.skill} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-display mb-3 text-lg font-semibold">
          Their set{" "}
          <span className="text-sm font-normal text-[var(--sp-faint)]">({songs.length})</span>
        </h2>
        {songs.length === 0 ? (
          <EmptyState title="No songs logged yet" icon="🎼" />
        ) : (
          <ul className="space-y-2">
            {songs.map((song) => (
              <li
                key={song.userSongId}
                className="flex items-center gap-3 rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] p-3"
              >
                <Link to="/songs/$id" params={{ id: String(song.song.id) }} className="shrink-0">
                  <SongCover hue={song.song.hue} title={song.song.title} className="h-12 w-12" showWave={false} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/songs/$id"
                    params={{ id: String(song.song.id) }}
                    className="block truncate font-semibold hover:underline"
                  >
                    {song.song.title}
                  </Link>
                  <div className="truncate text-xs text-[var(--sp-faint)]">
                    {song.song.artist} · {song.instrument.emoji} {song.instrument.name}
                  </div>
                </div>
                <DifficultyMeter value={song.difficulty} size="sm" showLabel={false} />
              </li>
            ))}
          </ul>
        )}
      </div>
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
