import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { getMe } from "../lib/api/auth.functions";
import { DifficultyMeter, Logo, PrimaryCTA, SongCover } from "../components/sp/ui";
import BorderGlow from "../components/reactbits/BorderGlow";
import GlassIcons, { type GlassIconsItem } from "../components/reactbits/GlassIcons";

// Mesh-gradient border colors for BorderGlow (brand: coral → amber → aqua).
const GLOW_MESH = ["#ff5d73", "#ff9c5b", "#33e6c4"];
const STEP_GLOWS = ["350 100 68", "22 100 68", "169 78 55"];

function I({ d }: { d: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const PILLARS: GlassIconsItem[] = [
  { label: "Discover", color: "linear-gradient(#ff5d73, #ff9c5b)", icon: <I d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m3.5 5.5L13 13l-4.5 2.5L11 11z" /> },
  { label: "Techniques", color: "linear-gradient(#33e6c4, #1fb6d6)", icon: <I d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0" /> },
  { label: "Difficulty", color: "linear-gradient(#ffc24b, #ff9c5b)", icon: <I d="M4 20v-5m5 5V9m5 11V4m5 16v-8" /> },
  { label: "Library", color: "linear-gradient(#7c86ff, #5b6bff)", icon: <I d="M4 19V6a2 2 0 0 1 2-2h13v15M6 17h13M6 21h13a2 2 0 0 0 2-2" /> },
  { label: "Comments", color: "linear-gradient(#ff5d73, #c65bff)", icon: <I d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
  { label: "Reputation", color: "linear-gradient(#33e6c4, #7ee06a)", icon: <I d="M12 2 4 5v6c0 5 3.4 8.6 8 11 4.6-2.4 8-6 8-11V5z M9 12l2 2 4-4" /> },
];

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { user } = await getMe();
    if (user) throw redirect({ to: "/discover" });
  },
  component: Landing,
});

const PREVIEW = [
  { title: "Isn't She Lovely", artist: "Stevie Wonder", hue: 55, diff: 3, reason: "Loved by pianists like you" },
  { title: "Riptide", artist: "Vance Joy", hue: 40, diff: 2, reason: "3 musicians with your taste play this" },
  { title: "Clair de Lune", artist: "Debussy", hue: 215, diff: 5, reason: "A go-to for piano players" },
];

const STEPS = [
  {
    n: "01",
    title: "Build your profile",
    body: "Pick the instruments you play and set your level — from first-week beginner to seasoned pro.",
  },
  {
    n: "02",
    title: "Log what you can play",
    body: "Add songs to your set and rate how hard each one really was on your instrument.",
  },
  {
    n: "03",
    title: "Get taste-matched picks",
    body: "A feed tuned to musicians who play like you surfaces your perfect next song to learn.",
  },
];

function Landing() {
  return (
    <div className="min-h-dvh">
      {/* Top nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--sp-muted)] transition hover:text-[var(--sp-ink)]"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold text-[var(--sp-ink)] ring-1 ring-[var(--sp-line-strong)] transition hover:bg-white/[0.1]"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--sp-line-strong)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--sp-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--sp-aqua)]" />
            Taste-matched song discovery for musicians
          </span>
          <h1 className="font-display mt-5 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
            Find your next
            <br />
            song to <span className="sp-gradient-text">learn.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--sp-muted)]">
            SoundProfile is where you keep the songs you can play, rate their difficulty, and get a
            feed of what to learn next — powered by musicians who play like you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/signup">
              <PrimaryCTA>
                Start your profile
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </PrimaryCTA>
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-[var(--sp-muted)] underline-offset-4 transition hover:text-[var(--sp-ink)] hover:underline"
            >
              I already have an account
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-[var(--sp-faint)]">
            <span>
              <strong className="font-display text-[var(--sp-ink)]">46+</strong> songs to explore
            </span>
            <span>
              <strong className="font-display text-[var(--sp-ink)]">13</strong> instruments
            </span>
            <span>
              <strong className="font-display text-[var(--sp-ink)]">1</strong> feed, tuned to you
            </span>
          </div>
        </div>

        {/* Hero visual: tilted stack of real product cards */}
        <div className="relative mx-auto hidden h-[420px] w-full max-w-sm lg:block">
          {PREVIEW.map((p, i) => (
            <div
              key={p.title}
              className="sp-card absolute left-1/2 w-72 -translate-x-1/2 p-4 shadow-2xl"
              style={{
                top: i * 46,
                transform: `translateX(-50%) rotate(${(i - 1) * 4}deg)`,
                zIndex: 10 - i,
              }}
            >
              <SongCover hue={p.hue} title={p.title} className="mb-3 h-36 w-full" />
              <div className="font-display truncate text-[15px] font-semibold">{p.title}</div>
              <div className="truncate text-sm text-[var(--sp-muted)]">{p.artist}</div>
              <div className="mt-3 flex items-center justify-between">
                <DifficultyMeter value={p.diff} size="sm" />
                <span className="text-[11px] font-medium text-[var(--sp-aqua)]">match</span>
              </div>
              <p className="mt-2 text-xs text-[var(--sp-faint)]">{p.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sp-faint)]">
          How it works
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <BorderGlow
              key={s.n}
              glowColor={STEP_GLOWS[i]}
              colors={GLOW_MESH}
              backgroundColor="#141733"
              borderRadius={16}
              glowRadius={26}
              coneSpread={30}
              edgeSensitivity={26}
            >
              <div className="p-6">
                <div className="font-display sp-gradient-text text-3xl font-bold">{s.n}</div>
                <h3 className="font-display mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--sp-muted)]">{s.body}</p>
              </div>
            </BorderGlow>
          ))}
        </div>
      </section>

      {/* Pillars — liquid-glass icon buttons */}
      <section className="mx-auto w-full max-w-4xl px-5 py-12 text-center">
        <h2 className="font-display text-3xl font-bold leading-tight">
          One home for everything you play
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-[var(--sp-muted)]">
          Hover to explore. Your feed, your set list, community difficulty, technique tags, and the
          conversation — all in one place.
        </p>
        <div className="mt-4">
          <GlassIcons items={PILLARS} className="mx-auto max-w-2xl" />
        </div>
      </section>

      {/* Difficulty explainer */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="sp-card grid items-center gap-8 p-8 md:grid-cols-2 md:p-10">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight">
              Every song, rated by the people who actually play it
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--sp-muted)]">
              Difficulty isn&apos;t a guess. Each song shows a community rating aggregated from every
              musician who logged it — and it&apos;s broken down by instrument, so a guitarist and a
              pianist each see what it takes for them.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              { t: "Wonderwall", a: "Oasis", d: 2 },
              { t: "Take Five", a: "Dave Brubeck", d: 4 },
              { t: "Clair de Lune", a: "Debussy", d: 5 },
            ].map((row) => (
              <div
                key={row.t}
                className="flex items-center gap-3 rounded-xl border border-[var(--sp-line)] bg-white/[0.02] p-3"
              >
                <SongCover hue={(row.t.length * 37) % 360} title={row.t} className="h-11 w-11" showWave={false} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{row.t}</div>
                  <div className="truncate text-xs text-[var(--sp-faint)]">{row.a}</div>
                </div>
                <DifficultyMeter value={row.d} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <BorderGlow
          glowColor="350 100 68"
          colors={GLOW_MESH}
          backgroundColor="#141026"
          borderRadius={28}
          glowRadius={46}
          glowIntensity={1.1}
          coneSpread={26}
        >
          <div className="relative overflow-hidden p-10 text-center md:p-16">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 140% at 50% 0%, rgba(255,93,115,0.20), transparent 60%)",
              }}
            />
            <div className="relative">
              <h2 className="font-display mx-auto max-w-2xl text-4xl font-bold leading-tight">
                Your next favorite song is one you haven&apos;t learned yet.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] text-[var(--sp-muted)]">
                Build your profile in a minute. The feed does the rest.
              </p>
              <div className="mt-8 flex justify-center">
                <Link to="/signup">
                  <PrimaryCTA>Create your SoundProfile</PrimaryCTA>
                </Link>
              </div>
            </div>
          </div>
        </BorderGlow>
        <footer className="mt-12 flex flex-col items-center gap-2 border-t border-[var(--sp-line)] pt-8 text-center text-sm text-[var(--sp-faint)]">
          <Logo size={22} />
          <p>Made for musicians who are always learning.</p>
        </footer>
      </section>
    </div>
  );
}
