// Client-safe labels + generative cover art. No server imports.

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Easy",
  2: "Casual",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
};

export const SKILL_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
  4: "Pro",
};

export function difficultyLabel(n: number | null | undefined): string {
  if (n == null) return "Unrated";
  return DIFFICULTY_LABELS[Math.round(n)] ?? "—";
}

export function skillLabel(n: number): string {
  return SKILL_LABELS[n] ?? "—";
}

// Deterministic gradient cover art from a hue seed (0..360). This is the app's
// real art system for songs/artists/avatars — vivid, on-brand, never stock.
export function coverGradient(hue: number): string {
  const h1 = ((hue % 360) + 360) % 360;
  const h2 = (h1 + 46) % 360;
  const h3 = (h1 + 320) % 360;
  return `linear-gradient(135deg, hsl(${h1} 78% 56%) 0%, hsl(${h2} 74% 46%) 52%, hsl(${h3} 62% 30%) 100%)`;
}

export function avatarGradient(hue: number): string {
  const h1 = ((hue % 360) + 360) % 360;
  const h2 = (h1 + 60) % 360;
  return `linear-gradient(145deg, hsl(${h1} 72% 58%), hsl(${h2} 68% 42%))`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
