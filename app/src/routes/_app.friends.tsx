import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import type { ProfileSummary } from "../lib/types";
import { getFriendsData, searchProfiles } from "../lib/api/friends.functions";
import { FriendButton } from "../components/sp/FriendButton";
import { Avatar, EmptyState, Spinner } from "../components/sp/ui";

export const Route = createFileRoute("/_app/friends")({
  loader: async () => getFriendsData(),
  component: FriendsPage,
});

function FriendsPage() {
  const { friends, incoming, outgoing } = Route.useLoaderData();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await searchProfiles({ data: { q } });
        setResults(res);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const refresh = () => router.invalidate();
  const isSearching = query.trim().length >= 2;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-8 lg:pb-12 lg:pt-10">
      <h1 className="font-display text-3xl font-bold">Friends</h1>
      <p className="mt-1.5 text-[15px] text-[var(--sp-muted)]">
        Find musicians by name and connect — their sets help tune your feed.
      </p>

      {/* Search */}
      <div className="relative mt-6">
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
          placeholder="Search musicians by name or @username…"
          className="w-full rounded-full border border-[var(--sp-line)] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-[var(--sp-ink)] placeholder:text-[var(--sp-faint)] focus:border-[var(--sp-coral)] focus:outline-none"
        />
        {loading && <Spinner className="absolute right-4 top-1/2 -translate-y-1/2" />}
      </div>

      {isSearching ? (
        <div className="mt-6">
          {results.length === 0 ? (
            <p className="mt-8 text-center text-sm text-[var(--sp-muted)]">
              {searched ? `No musicians found for “${query.trim()}”.` : "Searching…"}
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map((p) => (
                <MusicianCard key={p.id} p={p} onChanged={refresh} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {incoming.length > 0 && (
            <Section title="Friend requests" count={incoming.length}>
              {incoming.map((p) => (
                <MusicianCard key={p.id} p={p} onChanged={refresh} />
              ))}
            </Section>
          )}

          <Section title="Your friends" count={friends.length}>
            {friends.length === 0 ? (
              <EmptyState title="No friends yet" icon="🤝">
                Search above to find musicians you know and send the first request.
              </EmptyState>
            ) : (
              friends.map((p) => <MusicianCard key={p.id} p={p} onChanged={refresh} />)
            )}
          </Section>

          {outgoing.length > 0 && (
            <Section title="Requests sent" count={outgoing.length}>
              {outgoing.map((p) => (
                <MusicianCard key={p.id} p={p} onChanged={refresh} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <h2 className="font-display mb-3 text-lg font-semibold">
        {title} <span className="text-sm font-normal text-[var(--sp-faint)]">({count})</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MusicianCard({ p, onChanged }: { p: ProfileSummary; onChanged: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--sp-line)] bg-white/[0.02] p-3">
      <Link to="/u/$username" params={{ username: p.username }} className="shrink-0">
        <Avatar name={p.displayName} hue={p.avatarHue} src={p.avatarUrl} size={48} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to="/u/$username"
          params={{ username: p.username }}
          className="flex items-center gap-1.5"
        >
          <span className="truncate font-semibold hover:underline">{p.displayName}</span>
          {p.isSeed && (
            <span className="shrink-0 rounded-full border border-[var(--sp-line-strong)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--sp-faint)]">
              Sample
            </span>
          )}
        </Link>
        <div className="truncate text-sm text-[var(--sp-muted)]">@{p.username}</div>
        <div className="mt-0.5 text-xs text-[var(--sp-faint)]">
          {p.songCount} {p.songCount === 1 ? "song" : "songs"} · {p.instrumentCount}{" "}
          {p.instrumentCount === 1 ? "instrument" : "instruments"}
        </div>
      </div>
      <div className="shrink-0">
        <FriendButton userId={p.id} status={p.friendStatus} onChanged={onChanged} />
      </div>
    </div>
  );
}
