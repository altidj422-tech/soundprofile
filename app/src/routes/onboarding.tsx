import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { skillLabel } from "../lib/catalog";
import type { Instrument, SearchSong } from "../lib/types";
import { getMe } from "../lib/api/auth.functions";
import { getInstruments, setMyInstruments } from "../lib/api/profile.functions";
import { addUserSong, searchSongs } from "../lib/api/songs.functions";
import { Logo, PrimaryCTA, QuietGlass, SongCover, Spinner, cx } from "../components/sp/ui";
import OptionWheel from "../components/sp/OptionWheel";

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
  const [focused, setFocused] = useState(0); // index into `instruments` centered on the wheel

  const selectedIds = Object.keys(selected).map(Number);

  // Stable label list for the wheel — names only, so the curved type stays
  // legible. Membership/skill are surfaced in the panel beside it instead.
  const wheelLabels = useMemo(() => instruments.map((i) => i.name), [instruments]);
  const focusedInst = instruments[focused];
  const focusedAdded = focusedInst ? selected[focusedInst.id] != null : false;

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
            Spin the wheel to your instrument, add it, then set your level. You can change these
            anytime.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* ── Wheel picker ─────────────────────────────────────────── */}
            <div>
              <div className="relative h-[340px] overflow-hidden rounded-3xl border border-[var(--sp-line)] bg-[radial-gradient(120%_80%_at_0%_50%,rgba(255,93,115,0.10),transparent_60%)] sm:h-[380px]">
                {/* selection zone highlight behind the centered option */}
                <div className="pointer-events-none absolute inset-x-3 top-1/2 h-14 -translate-y-1/2 rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10" />
                <div className="pointer-events-none absolute left-3.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--sp-coral)] shadow-[0_0_12px_var(--sp-coral)]" />
                <OptionWheel
                  items={wheelLabels}
                  defaultSelected={0}
                  onChange={(index) => setFocused(index)}
                  side="left"
                  fontSize={2}
                  spacing={1.35}
                  curve={1}
                  tilt={7}
                  blur={1.4}
                  fade={0.34}
                  minOpacity={0.14}
                  smoothing={220}
                  inset={44}
                  loop
                  textColor="#5c6499"
                  activeColor="#ffffff"
                  className="[mask-image:linear-gradient(to_bottom,transparent,#000_22%,#000_78%,transparent)]"
                />
              </div>

              {focusedInst && (
                <button
                  type="button"
                  onClick={() => toggleInstrument(focusedInst)}
                  className={cx(
                    "mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition active:scale-[0.98]",
                    focusedAdded
                      ? "border border-[var(--sp-aqua)] bg-[var(--sp-aqua)]/12 text-[var(--sp-aqua)] hover:bg-[var(--sp-aqua)]/20"
                      : "bg-[linear-gradient(100deg,var(--sp-coral),var(--sp-coral-2))] text-[#160a0f] shadow-[0_10px_30px_-10px_rgba(255,93,115,0.7)] hover:brightness-[1.07]",
                  )}
                >
                  <span className="text-lg" aria-hidden>
                    {focusedInst.emoji}
                  </span>
                  {focusedAdded
                    ? `${focusedInst.name} added — tap to remove`
                    : `Add ${focusedInst.name}`}
                </button>
              )}
              <p className="mt-2 text-center text-xs text-[var(--sp-faint)]">
                Scroll, drag, or use arrow keys to browse
              </p>
            </div>

            {/* ── Your selection ───────────────────────────────────────── */}
            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-lg font-semibold">Your instruments</h2>
                <span className="text-sm text-[var(--sp-faint)]">
                  {selectedIds.length} selected
                </span>
              </div>

              {selectedIds.length === 0 ? (
                <div className="grid h-[calc(100%-2.25rem)] min-h-[200px] place-items-center rounded-3xl border border-dashed border-[var(--sp-line-strong)] px-6 py-10 text-center">
                  <div>
                    <div className="text-3xl" aria-hidden>
                      🎚️
                    </div>
                    <p className="mt-2 text-sm text-[var(--sp-muted)]">
                      Nothing yet — spin the wheel and hit{" "}
                      <span className="font-semibold text-[var(--sp-ink)]">Add</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {selectedIds.map((id) => {
                    const inst = instruments.find((i) => i.id === id);
                    if (!inst) return null;
                    return (
                      <div
                        key={id}
                        className="rounded-2xl border border-[var(--sp-coral)]/60 bg-[var(--sp-coral)]/[0.08] p-3.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl" aria-hidden>
                            {inst.emoji}
                          </span>
                          <span className="flex-1 font-semibold">{inst.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleInstrument(inst)}
                            aria-label={`Remove ${inst.name}`}
                            className="grid h-6 w-6 place-items-center rounded-full border border-[var(--sp-line-strong)] text-[var(--sp-faint)] transition hover:border-[var(--sp-coral)] hover:text-[var(--sp-coral)]"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="mt-3 flex gap-1.5">
                          {[1, 2, 3, 4].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setSelected((p) => ({ ...p, [id]: lvl }))}
                              className={cx(
                                "flex-1 rounded-lg border px-1 py-1.5 text-[11px] font-semibold transition",
                                selected[id] === lvl
                                  ? "border-[var(--sp-aqua)] bg-[var(--sp-aqua)]/15 text-[var(--sp-ink)]"
                                  : "border-[var(--sp-line)] text-[var(--sp-faint)] hover:text-[var(--sp-muted)]",
                              )}
                            >
                              {skillLabel(lvl)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <span className="text-sm text-[var(--sp-faint)]">{selectedIds.length} selected</span>
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
                  <SongCover
                    hue={song.hue}
                    title={song.title}
                    artworkUrl={song.artworkUrl}
                    className="mb-2.5 h-24 w-full"
                  />
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
            <QuietGlass onClick={() => (window.location.href = "/discover")}>
              Skip for now
            </QuietGlass>
            <PrimaryCTA onClick={() => (window.location.href = "/discover")}>
              Open my feed
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </PrimaryCTA>
          </div>
        </div>
      )}
    </div>
  );
}
