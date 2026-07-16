import type { ButtonHTMLAttributes, ReactNode } from "react";

import { avatarGradient, coverGradient, difficultyLabel, initials } from "../../lib/catalog";
import type { Instrument } from "../../lib/types";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Logo ─────────────────────────────────────────────────────────────── */
export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect width="32" height="32" rx="9" fill="url(#sp-logo)" />
        <g stroke="#0b0e1a" strokeWidth="2.4" strokeLinecap="round">
          <line x1="9" y1="13" x2="9" y2="19" />
          <line x1="13.5" y1="9" x2="13.5" y2="23" />
          <line x1="18" y1="11.5" x2="18" y2="20.5" />
          <line x1="22.5" y1="14" x2="22.5" y2="18" />
        </g>
        <defs>
          <linearGradient id="sp-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff5d73" />
            <stop offset="0.55" stopColor="#ff9c5b" />
            <stop offset="1" stopColor="#33e6c4" />
          </linearGradient>
        </defs>
      </svg>
      {withText && (
        <span className="font-display text-[17px] font-semibold tracking-tight text-[var(--sp-ink)]">
          Sound<span className="sp-gradient-text">Profile</span>
        </span>
      )}
    </span>
  );
}

/* ── Avatar ───────────────────────────────────────────────────────────── */
export function Avatar({
  name,
  hue,
  size = 40,
  ring = false,
}: {
  name: string;
  hue: number;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-full font-display font-semibold text-[#0b0e1a]",
        ring && "ring-2 ring-white/20",
      )}
      style={{
        width: size,
        height: size,
        background: avatarGradient(hue),
        fontSize: size * 0.38,
      }}
    >
      {initials(name)}
    </span>
  );
}

/* ── Generative song cover ────────────────────────────────────────────── */
function waveBars(seed: number, count = 22): number[] {
  const out: number[] = [];
  let s = seed || 1;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.push(0.28 + (s % 1000) / 1000 * 0.72);
  }
  return out;
}

export function SongCover({
  hue,
  title,
  className,
  rounded = "rounded-xl",
  showWave = true,
}: {
  hue: number;
  title: string;
  className?: string;
  rounded?: string;
  showWave?: boolean;
}) {
  const bars = waveBars(hue * 7 + title.length * 13);
  return (
    <div
      className={cx("relative overflow-hidden", rounded, className)}
      style={{ background: coverGradient(hue) }}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_0%,rgba(255,255,255,0.28),transparent_55%)]" />
      {showWave && (
        <svg
          className="absolute inset-x-0 bottom-0 h-1/2 w-full opacity-80 mix-blend-soft-light"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
        >
          {bars.map((h, i) => (
            <rect
              key={i}
              x={i * (100 / bars.length) + 0.6}
              y={40 - h * 38}
              width={100 / bars.length - 1.2}
              height={h * 38}
              rx="0.8"
              fill="rgba(255,255,255,0.85)"
            />
          ))}
        </svg>
      )}
    </div>
  );
}

/* ── Difficulty meter (console fader) ─────────────────────────────────── */
const LEVEL_COLORS = ["#33e6c4", "#7ee06a", "#ffc24b", "#ff9c5b", "#ff5d73"];

export function DifficultyMeter({
  value,
  showLabel = true,
  size = "md",
}: {
  value: number | null | undefined;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const filled = value == null ? 0 : Math.round(value);
  const barH = size === "sm" ? "h-3.5" : "h-5";
  const barW = size === "sm" ? "w-1.5" : "w-2";
  return (
    <div className="inline-flex items-center gap-2">
      <div className="flex items-end gap-1">
        {[1, 2, 3, 4, 5].map((seg) => {
          const on = seg <= filled;
          const growH = size === "sm" ? 6 + seg * 2 : 8 + seg * 3;
          return (
            <span
              key={seg}
              className={cx("rounded-[2px]", barW)}
              style={{
                height: growH,
                background: on ? LEVEL_COLORS[filled - 1] : "rgba(255,255,255,0.13)",
                boxShadow: on ? `0 0 8px ${LEVEL_COLORS[filled - 1]}55` : "none",
              }}
            />
          );
        })}
        <span className={cx("hidden", barH)} />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-[var(--sp-muted)]">
          {value == null ? "Unrated" : difficultyLabel(value)}
        </span>
      )}
    </div>
  );
}

/* ── Instrument chip ──────────────────────────────────────────────────── */
export function InstrumentChip({
  instrument,
  skill,
  active,
  onClick,
  size = "md",
}: {
  instrument: Pick<Instrument, "name" | "emoji">;
  skill?: number;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-[13px]",
        active
          ? "border-[var(--sp-coral)] bg-[var(--sp-coral)]/15 text-[var(--sp-ink)]"
          : "border-[var(--sp-line-strong)] bg-white/[0.03] text-[var(--sp-muted)]",
        onClick && "hover:border-[var(--sp-line-strong)] hover:text-[var(--sp-ink)]",
      )}
    >
      <span aria-hidden>{instrument.emoji}</span>
      <span>{instrument.name}</span>
      {skill != null && (
        <span className="ml-0.5 flex gap-0.5" aria-hidden>
          {[1, 2, 3, 4].map((d) => (
            <span
              key={d}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: d <= skill ? "var(--sp-aqua)" : "rgba(255,255,255,0.18)" }}
            />
          ))}
        </span>
      )}
    </Comp>
  );
}

export function GenreTag({ genre }: { genre: string }) {
  if (!genre) return null;
  return (
    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--sp-muted)]">
      {genre}
    </span>
  );
}

/* ── Buttons (bespoke chrome, each its own identity) ──────────────────── */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function PrimaryCTA({ className, children, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-[#160a0f] transition",
        "bg-[linear-gradient(100deg,var(--sp-coral),var(--sp-coral-2))] shadow-[0_10px_30px_-10px_rgba(255,93,115,0.7)]",
        "hover:brightness-[1.07] hover:shadow-[0_16px_40px_-12px_rgba(255,93,115,0.8)] active:scale-[0.98] disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AquaGhost({ className, children, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full border border-[var(--sp-aqua)]/50 px-5 py-3 text-sm font-semibold text-[var(--sp-aqua)] transition",
        "hover:bg-[var(--sp-aqua)]/10 active:scale-[0.98] disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SolidCoral({ className, children, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--sp-coral)] px-4 py-2 text-[13px] font-semibold text-white transition",
        "hover:brightness-110 active:scale-[0.97] disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function QuietGlass({ className, children, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full border border-[var(--sp-line-strong)] bg-white/[0.03] px-4 py-2 text-[13px] font-semibold text-[var(--sp-muted)] transition",
        "hover:bg-white/[0.07] hover:text-[var(--sp-ink)] active:scale-[0.97] disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Difficulty rater (interactive 1..5) ──────────────────────────────── */
export function DifficultyRater({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cx(
            "flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition",
            n === value
              ? "border-transparent text-[#160a0f]"
              : "border-[var(--sp-line-strong)] text-[var(--sp-muted)] hover:text-[var(--sp-ink)]",
          )}
          style={n === value ? { background: LEVEL_COLORS[n - 1] } : undefined}
        >
          {n}
          <span className="mt-0.5 block text-[10px] font-medium opacity-80">
            {difficultyLabel(n)}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Misc ─────────────────────────────────────────────────────────────── */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-[var(--sp-coral)]",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  children,
  icon,
}: {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="sp-card grid place-items-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-3xl">{icon}</div>}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children && <div className="mt-1.5 max-w-sm text-sm text-[var(--sp-muted)]">{children}</div>}
    </div>
  );
}

export { cx };
