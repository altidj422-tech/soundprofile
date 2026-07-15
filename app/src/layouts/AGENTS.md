# App layouts — start from a shipped code layout

A `type: "app"` product must look and feel like a Higgsfield product. The
template ships six ready-made layout screens as REAL CODE — **prefer one of
them**, copy it into your route and adapt it freely. Only build a custom shell
if the user asks for something none covers. For anything Quanta lacks, build
a small component from Quanta primitives in `app/src/components/` — never a
third-party UI library, never modify the vendored `@higgsfield/quanta`.

## The six layouts

| Layout | File | When to use |
| --- | --- | --- |
| **Studio** | `src/layouts/studio.tsx` (`StudioTemplate`) | Full creative workspace: projects-first left `Sidebar` + hero + a floating prompt dock (`@/components/prompt-box` — mode toggle, inline setting pills, lime GENERATE) over an edge-to-edge generations feed. The richest shell — for multi-project generation tools. |
| **Preset** | `src/layouts/preset.tsx` (`PresetTemplate`) | Pick-a-style-then-generate: a persistent left creation rail (cover/source, `@/components/composer`, `@/components/setting-trigger` rows, costed Generate) beside a browsable grid of preset tiles with Presets/History/How-it-works tabs + search. Preset tiles support horizontal (default) or vertical/portrait orientation via `presetOrientation`. |
| **App detail** | `src/layouts/app-detail.tsx` (`AppDetailTemplate`) | A single app's public landing page: a centered `max-w-7xl` scroll page with a two-column generator hero (`@/components/dropzone` inputs on the left, a large `Media` preview on the right, costed Generate), and a "how it works in 3 steps" explainer row. Use it for a marketing/detail page around one tool, not a full workspace. |
| **AI Stylist** | `src/layouts/ai-stylist.tsx` (`AiStylistTemplate`) | Configure-then-generate workspace: a persistent creation rail (`@/components/upload-field` uploads → `AssetLibraryModal`, `TemplateModal` preset picker, `Select`/`SettingTrigger` option rows, costed Generate) beside a segmented `Tabs` workspace (options gallery / live Results canvas / `HistoryGrid` / How-it-works). Use for a tool where the user uploads inputs, picks options, and iterates (try-on, restyle, character). |
| **Skin Enhancer** | `src/layouts/skin-enhancer.tsx` (`SkinEnhancerTemplate`) | Centered single-tool page built around a **before/after compare slider** (`@/components/before-after-compare`): upload → enhance → compare original vs result, plus How-it-works and a personal `HistoryGrid`. Use for enhance / retouch / restore / upscale tools whose payoff is a before↔after comparison. |
| **Shots** | `src/layouts/shots.tsx` (`ShotsTemplate`) | Compact centered multi-step **wizard** (`@/components/step-rail`): step 1 upload one input → step 2 generate a grid of variations (`GenerationCard`) and favorite the best → step 3 upscale/refine (with a `BeforeAfterCompare`). Use for a linear generate → select → refine flow. |

Pick Studio for a full workspace, Preset for a gallery-driven pick-then-generate
tool, App detail for a single tool's landing page, AI Stylist for an
upload-configure-iterate workspace, Skin Enhancer for a before/after
enhance tool, Shots for a step-by-step generate→select→refine wizard; map any
request to the closest. Reusable building blocks live in `app/src/components/` —
`prompt-box`, `composer`, `setting-trigger`, `generation-card`, `history-grid`,
`media-card`, `asset-library`, `generation-detail`, `template-modal`,
`template-picker`, `dropzone`, `upload-field`, `step-rail`,
`before-after-compare`. Compose from these rather than hand-rolling feeds /
composers / pickers / upload areas. **Read `../components/AGENTS.md` — it is the
mandatory contract for these components, with copy-paste wiring examples.**

## Rules

- **Compact & focused, with progressive disclosure (GENERAL — applies to EVERY
  layout/app, not just AI Stylist).** Do NOT hoist or expand every setting and
  control at the top of a panel. The DEFAULT view stays compact and focused:
  show only the PRIMARY inputs plus the PRIMARY action (the costed Generate
  CTA). Secondary or optional choices must be HIDDEN under their section title by
  default (COLLAPSED) and expand on demand — an accordion / disclosure pattern,
  never a flat list of always-open controls. Group related secondary settings
  under short titled sections; at most ONE section is open initially (or none),
  the rest collapsed. Use the shared Quanta **`Accordion`** for this —
  `import { Accordion } from '@higgsfield/quanta/accordion'` with
  `multiple={false}` (only one section open at a time) — never hand-roll a
  collapsible and never leave the whole option set expanded. This keeps the
  creation-rail field budget (below) satisfied in the collapsed/default state.
- Creation rail (the tall left `aside.q-card` input panel — `StylistRail` in
  `ai-stylist.tsx`, `InputPanel` in `preset.tsx`): its fields are CHOSEN PER APP.
  Include only the inputs that specific app needs — do not blindly copy the full
  set from a template. Keep the rail usable with a field budget: at most **3
  large fields** (upload-size fields — `UploadField` / cover `MediaCard` /
  `Dropzone`) and at most **4 compact fields** (setting rows/cells —
  `SettingTrigger` / `Select`) visible at once. Overflow: the rail is a scroll
  container (`overflow-y-auto`, stretched to the viewport — no `self-start`), and
  the costed Generate CTA lives in `RailFooter` (`@/components/rail-footer`) so it
  is **pinned to the bottom (`sticky bottom-0`) with a gradient scrim** over the
  scrolling fields when content overflows, and sits inline at the bottom when it
  fits — the CTA is always reachable.
- Any "+" / upload / attach / add-media action opens `AssetLibraryModal` from
  `@/components/asset-library` (pass your clickable element as `trigger`,
  receive the picked asset in `onSelect`). NEVER build a custom asset picker
  or upload modal.
- Generation in progress is `<GenerationCard state="generating" />`; finished
  results are `GenerationCard`; opening a result uses `GenerationDetailModal`.
  NEVER hand-roll generation spinners, placeholders, or result tiles.
- History is PERSONAL: it shows only the current user's own generations in
  this app — never other users' work, never a public/community feed. Render
  it with `HistoryGrid` from `@/components/history-grid` (the batch-grouped
  `GenerationCard` grid, exactly as in the preset template) — do not invent a
  different history layout.

- Compose from Quanta components and `cn`. For anything Quanta lacks (date
  picker, calendar, table, …), build a small custom component from Quanta
  primitives + `q-` tokens in `app/src/components/` — never add a third-party
  UI library, never modify the vendored `@higgsfield/quanta`.
- Real copy in every state (empty, busy, error) — no placeholder tokens.
- Apps render inside Higgsfield: NEVER add an app header/top bar (no brand/logo
  row, no top nav) and never credits/balance or sign-out controls — the host
  chrome provides all of that. No content breadcrumb bar either (e.g. an
  "Apps / <name>" crumb row) — the host provides all navigation chrome. In-app
  navigation goes in a Quanta `Sidebar` or inline controls (tabs, step
  indicators); page titles are headings inside the content area.
- Permanently DARK: `data-theme="default-dark"` is pinned on `<html>` in
  `src/routes/__root.tsx`. Never add a theme toggle, a light mode, quanta's
  bootstrapScript/ThemeController, or `dark:`-conditional styling.
- Container width: `mx-auto w-full max-w-7xl` on the shell — except the studio
  layout, a full-bleed workspace (sidebar + edge-to-edge feed).
- Generation CTAs are Quanta Button `variant="marketingPrimary"` (a Loader
  `size="xs" color="neutral"` while busy) and ALWAYS show the credit cost
  inside the button as `{label} {sparkles icon} {credits}` — the sparkle is the
  branded soft-sparkles asset
  (`import Sparkles from "@/assets/icon-sparkles-soft.svg?react"`, 14px) and the
  credits number inherits the button label's font. Variant reality check (names
  do NOT match the colors): `primary` = flat LIME, `secondary` = solid WHITE,
  `tertiary` = dark white/10 glass, `ghost` = transparent. Ordinary actions and
  navigation use the dark `tertiary`/`ghost`; `secondary` (white) only where the
  real product uses a white button; flat lime `primary` is almost never right.
- Icons are Google Material Symbols (outlined, weight 400), imported per icon:
  `import Star from "@material-symbols/svg-400/outlined/star_shine.svg?react"`
  — one icon family everywhere; `-fill` variants only for very small glyphs.
- Generation feeds: result cards composed from quanta `Media`/`Card` inside a
  Quanta `Grid` with `cols="auto-fit"` — resize `minColWidth` rather than adding
  breakpoint class ladders (studio-style feeds can use CSS-columns masonry).
  Helpers in `src/lib/higgsfield-generation-results.ts` map a Generation to its
  preview media. Prompt composer / mode switcher: use `@/components/prompt-box`
  (or `@/components/composer`) — see `src/layouts/studio.tsx` and
  `references/app-layouts.md` in the skill for the anatomy.

## Wiring the data (fnf-react)

From `app/packages/fnf-react/ai/AGENTS.md`:

- Submit prompts/runs with `useGenerationRun(jobClient, { scopeKey })`; map its
  status to a `busy`/`generating` prop.
- Read feeds with `jobsFeedQueryOptions` + `flattenFeedPages`; poll one job with
  `generationQueryOptions`; read credit prices with `costQueryOptions`.
- After a run resolves, call `prependGenerations` so fresh work appears at the
  top of the grid; upload files with `useAttachments` and pass refs to
  `run.start`.
