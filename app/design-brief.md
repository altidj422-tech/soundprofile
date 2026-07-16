# SoundProfile — design brief

## Design read
For gigging and bedroom musicians who want to grow their repertoire. Emotional
register: energetic, encouraging, a little nightlife — the feeling of a lit
stage and a well-mixed monitor, not a sterile SaaS dashboard.

## Concept spine
**A mixing console for your musical identity.** The app reads your "signal" —
the instruments you play and the songs in your set — and tunes a stream of new
songs to learn. Cards behave like channel strips / now-playing panels: level
meters for difficulty, a clear signal path from "musicians like you" to "play
this next."

## Delivery tier
This is an **application**, not a marketing page. The public landing uses one
confident hero (editorial tier, micro-motion only); every signed-in screen
follows app UX (dense, legible, instant). The heavy scroll-scrub cinema
pipeline is intentionally out of scope — it would fight the product's job.

## Locked palette (dark, pinned)
- `--sp-bg` `#0B0E1A` — deep indigo night (clearly indigo, never a neutral near-black)
- `--sp-bg-2` `#111535` — raised indigo panel
- `--sp-surface` `#181D45` — card surface
- `--sp-ink` `#F5F6FF` — cool near-white text
- `--sp-muted` `#A7ADDA` — lavender-grey secondary text
- `--sp-coral` `#FF5D73` → `#FF9C5B` — primary "sound" accent (warm coral→amber gradient)
- `--sp-aqua` `#33E6C4` — secondary accent, meters & confirmations
- `--sp-gold` `#FFC24B` — rating/highlight
Defense: coral+aqua over indigo is a stage-lighting palette — warm key light,
cool rim light — and avoids every banned family (no near-black+neon, no
graphite+ember, no beige+brass, no AI-violet glow).

## Locked type
- Display: **Space Grotesk** (700/500) — geometric with quirks, reads musical/technical.
- Body/UI: **Inter** (400/500/600).
Loaded via Google Fonts `<link>` in the root head.

## Signature components
- **FeedCard** — full-height discovery card: generative cover, difficulty level
  meter, "why you're seeing this" reason, Add / Skip.
- **DifficultyMeter** — 5-segment level bar (console fader aesthetic) for the
  aggregate difficulty rating.
- **Generative cover art** — every song/artist/avatar gets a deterministic
  gradient artwork from a stored hue seed (a real design system, not stock).
- **InstrumentChip**, **SkillPicker**, **Star/segment difficulty rater**.

## Section plan (landing)
Hero → how it works (3 steps) → the discovery feed preview → difficulty-rating
explainer → CTA. One layout family per section, no consecutive repeats.

## Asset plan
Generative gradient art for all song/artist/avatar imagery (deterministic from
hue seeds). One generated hero/cover image + one generated logo/favicon for
brand + marketplace card (credit-budgeted).

## CTA inventory
- Primary "Start your profile" — coral→amber filled, subtle lift on hover.
- "Open the feed" — aqua-outlined ghost.
- "Add to my songs" (in-feed) — solid coral, compact.
- "Skip" (in-feed) — quiet glass.
Each CTA is its own component with its own interaction identity; no shared
site-wide button utility.
