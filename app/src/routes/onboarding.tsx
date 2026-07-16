import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { skillLabel } from "../lib/catalog";
import type { Instrument, SearchSong } from "../lib/types";
import { getMe } from "../lib/api/auth.functions";
import { getInstruments, setMyInstruments } from "../lib/api/profile.functions";
import { addUserSong, searchSongs } from "../lib/api/songs.functions";
import { Logo, PrimaryCTA, QuietGlass, SongCover, Spinner, cx } from "../components/sp/ui";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const { user, needsOnboarding } = await getMe();
    if (!user) throw redirect({ to: "/login" });
    if (!needsOnboarding) throw redirect({ to: "/discover" });
  },
  loader: async () => {
    const [instruments, popular] = await Promise.all([
      getInstruments(),
      searchSongs({ data: { q: "", limit: 15 } }),
    ]);
    return { instruments, popular };
  },
  component: Onboarding,
});

function Onboarding() {
  const { instruments, popular } = Route.useLoaderData();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<Record<number, number>>({}); // instrumentId -> skill
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());

  const selectedIds = Object.keys(selected).map(Number);

  function toggleInstrument(inst: Instrument) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[inst.id] != null) delete next[inst.id];
      else next[inst.id] = 2;
      return next;
    });
  }

  async function continueToSongs() {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      await setMyInstruments({
        data: { items: selectedIds.map((id) => ({ instrumentId: id, skill: selected[id] })) },
      });
      setStep(2);
    } finally {
      setSaving(false);
    }
  }

  async function quickAdd(song: SearchSong) {
    const primary = selectedIds[0];
    if (!primary || added.has(song.id)) return;
    setAdded((prev) => new Set(prev).add(song.id));
    try {
      await addUserSong({ data: { songId: song.id, instrumentId: primary, difficulty: 3 } });
    } catch {
      setAdded((prev) => {
        const n = new Set(prev);
        n.delete(song.id);
        return n;
      });
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="text-sm text-[var(--sp-faint)]">Step {step} of 2</span>
      </div>

      {/* progress */}
      <div className="mt-6 flex gap-2">
        {[1, 2].map((s) => (
          <div
            key={s}
            className="h-1 flex-1 rounded-full"
            style={{ background: s <= step ? "var(--sp-coral)" : "rgba(255,255,255,0.12)" }}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="mt-8">
          <h1 className="font-display text-3xl font-bold">What do you play?</h1>
          <p className="mt-2 text-[15px] text-[var(--sp-muted)]">
            Choose your instruments and set your level. You can change these anytime.
          </p>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {instruments.map((inst) => {
              const active = selected[inst.id] != null;
              return (
                <div
                  key={inst.id}
                  className={cx(
                    "rounded-2xl border p-3.5 transition",
                    active
                      ? "border-[var(--sp-coral)] bg-[var(--sp-coral)]/10"
                      : "border-[var(--sp-line)] bg-white/[0.02]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleInstrument(inst)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span className="text-2xl" aria-hidden>
                      {inst.emoji}
                    </span>
                    <span className="flex-1 font-semibold">{inst.name}</span>
                    <span
                      className={cx(
                        "grid h-5 w-5 place-items-center rounded-full border text-[11px]",
                        active
                          ? "border-transparent bg-[var(--sp-coral)] text-white"
                          : "border-[var(--sp-line-strong)] text-transparent",
                      )}
                    >
                      ✓
                    </span>
                  </button>
                  {active && (
                    <div className="mt-3 flex gap-1.5">
                      {[1, 2, 3, 4].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSelected((p) => ({ ...p, [inst.id]: lvl }))}
                          className={cx(
                            "flex-1 rounded-lg border px-1 py-1.5 text-[11px] font-semibold transition",
                            selected[inst.id] === lvl
                              ? "border-[var(--sp-aqua)] bg-[var(--sp-aqua)]/15 text-[var(--sp-ink)]"
                              : "border-[var(--sp-line)] text-[var(--sp-faint)] hover:text-[var(--sp-muted)]",
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

          <div className="mt-8 flex items-center justify-between">
            <span className="text-sm text-[var(--sp-faint)]">
              {selectedIds.length} selected
            </span>
            <PrimaryCTA onClick={continueToSongs} disabled={selectedIds.length === 0 || saving}>
              {saving ? <Spinner /> : "Continue"}
            </PrimaryCTA>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8">
          <h1 className="font-display text-3xl font-bold">Add a few songs you can play</h1>
          <p className="mt-2 text-[15px] text-[var(--sp-muted)]">
            Tap any you already know — this is what tunes your feed. You can refine instruments and
            difficulty later in your Library.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {popular.map((song) => {
              const on = added.has(song.id) || song.inLibrary;
              return (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => quickAdd(song)}
                  className={cx(
                    "group relative overflow-hidden rounded-2xl border p-3 text-left transition",
                    on
                      ? "border-[var(--sp-aqua)] bg-[var(--sp-aqua)]/10"
                      : "border-[var(--sp-line)] bg-white/[0.02] hover:border-[var(--sp-line-strong)]",
                  )}
                >
                  <SongCover hue={song.hue} title={song.title} className="mb-2.5 h-24 w-full" />
                  <div className="truncate text-sm font-semibold">{song.title}</div>
                  <div className="truncate text-xs text-[var(--sp-faint)]">{song.artist}</div>
                  {on && (
                    <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--sp-aqua)] text-xs font-bold text-[#0b0e1a]">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <QuietGlass onClick={() => (window.location.href = "/discover")}>Skip for now</QuietGlass>
            <PrimaryCTA onClick={() => (window.location.href = "/discover")}>
              Open my feed
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </PrimaryCTA>
          </div>
        </div>
      )}
    </div>
  );
}
