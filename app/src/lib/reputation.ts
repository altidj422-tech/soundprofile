// Reputation thresholds (client-safe constants).
// Reputation = likes received − dislikes received on your technique tags.

export const MOD_MIN_REP = 10; // trusted tagger: can overwrite lower-rep tags + remove comments
export const BAN_THRESHOLD = -5; // reputation at/below this → banned, tags disappear

export function isModerator(reputation: number): boolean {
  return reputation >= MOD_MIN_REP;
}
