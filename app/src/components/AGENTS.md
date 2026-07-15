# Shared app components — the cross-app contract

Every Higgsfield app built from this template MUST behave identically for a
few core interactions, no matter how custom its layout is. The components in
this folder are the single source of truth for those interactions.

**IMPORT them — never copy, fork, or hand-roll a replacement.** If one of
these components is missing a prop you need, extend it here (backward
compatible) so every app benefits; do not build a private variant inside a
route or layout.

## Hard rules (apply to EVERY app)

1. **Assets / uploads → `AssetLibraryModal`.** Every "+" button, "Upload",
   "Attach files", "Add media", image-picker tile, or empty upload dropzone
   opens `AssetLibraryModal` from `@/components/asset-library`. Never build a
   custom asset picker, file dialog UI, or upload modal.
   - **Upload FIELD in a creation rail / input panel → `UploadField`.** When a
     rail (`InputPanel`-style aside — see `src/layouts/preset.tsx`) needs an
     upload field, use `UploadField` from `@/components/upload-field` as the
     `AssetLibraryModal` trigger — never hand-roll a rail upload field. Elsewhere,
     the app-detail generator hero uses `Dropzone`. Both are ONLY trigger UI;
     they must open `AssetLibraryModal`.
   - **Creation-rail fields are chosen per app, within a budget.** A rail holds
     only the inputs that app needs (not a fixed template set): at most **3 large
     fields** (`UploadField` / cover `MediaCard` / `Dropzone`) and **4 compact
     fields** (`SettingTrigger` / `Select`) at once. Make the rail a scroll
     container and pin the costed Generate CTA with `RailFooter`
     (`@/components/rail-footer`) so it stays reachable when the rail overflows.
2. **Generation in progress → `GenerationCard`.** The animated
   generating placeholder is `<GenerationCard state="generating" />`. Never
   hand-roll spinners, shimmer boxes, or progress overlays for generations.
3. **Finished generations → `GenerationCard` (+ `GenerationDetailModal`).**
   Result tiles are `GenerationCard`; clicking a result opens
   `GenerationDetailModal`. Feeds compose them inside a Quanta `Grid` (or the
   ready-made `HistoryGrid`).
4. **Pick-one-option choosers → `TemplateModal`** (presets, styles, animals,
   any grid of selectable tiles).
5. **History → `HistoryGrid`, personal only.** A History tab/section shows
   only the CURRENT user's own generations in this app — never other users'
   work, never a public/community feed — rendered with `HistoryGrid` exactly
   as in the preset template (see `PresetGallery` in `src/layouts/preset.tsx`).
6. **Compact panels — progressive disclosure.** A settings / creation panel
   shows only its PRIMARY inputs plus the costed Generate CTA by default. Every
   secondary or optional choice lives COLLAPSED under a titled section and
   expands on demand — use the Quanta `Accordion`
   (`import { Accordion } from '@higgsfield/quanta/accordion'`, `multiple={false}`
   so only one section opens at a time), never a flat always-open control list
   and never a hand-rolled collapsible/disclosure. The creation-rail field
   budget (rule 1) must hold in the DEFAULT/collapsed state.

## Component catalog

| Component | Import | What it is |
| --- | --- | --- |
| `AssetLibraryModal` | `@/components/asset-library` | THE asset picker modal (tabs header, All/Personal toolbar, element grid). Opens from any upload/attach/plus trigger. `onSelect` reports the picked asset. |
| `TemplateModal` | `@/components/template-modal` | Generic "choose one option" modal — grid of image tiles, lime ring on the active one. |
| `GenerationCard` | `@/components/generation-card` | A generation tile: `state="generating"` (pulsing brand glow + status pill) or ready (media + optional title). |
| `GenerationDetailModal` | `@/components/generation-detail` | Fullscreen-ish detail view of one generation (preview + metadata rows + actions). Trigger-based like the modals above. |
| `HistoryGrid` | `@/components/history-grid` | THE History section: the current user's OWN generations in this app (personal — never other users' work), as the batch-grouped `GenerationCard` grid. Every History tab/page renders this grid, not a custom layout. |
| `Dropzone` / `DropzonePreview` | `@/components/dropzone` | Bordered upload/select tile (icon → title → subtitle); `preview` shows the after-selection state. THE upload tile for the app-detail generator hero. Pair as the trigger of `AssetLibraryModal` / `TemplateModal`. |
| `UploadField` | `@/components/upload-field` | THE rail-style upload field for creation rails / input panels (Figma "Media upload", 3322:51742): rail-width bordered tile — icon-chip → title → subtitle empty state, white-ringed `preview` + remove (X) filled state. Use it (never a hand-rolled field) as the `AssetLibraryModal` trigger in any `InputPanel`-style rail. |
| `RailFooter` | `@/components/rail-footer` | The pinned Generate CTA footer for a creation rail: `sticky bottom-0` with a gradient scrim (rail surface → transparent) so the CTA stays reachable and the fields fade under it when the rail overflows; sits inline at the bottom when they fit. Wrap the `marketingPrimary` Generate button as its children. |
| `Composer` | `@/components/composer` | Tall side-rail prompt pane with a footer action row (`Composer.Action` pills). |
| `PromptBox` | `@/components/prompt-box` | Wide bottom prompt dock (mode rail, setting pills, upload tiles, GENERATE). |
| `MediaCard` | `@/components/media-card` | Cover/preview card with title + action, used in creation rails and preset galleries. `ratio` picks the media aspect — landscape (`video`) or portrait (`9/16` etc.). |
| `TemplatePickerModal` / `TemplateCard` | `@/components/template-picker` | Tabbed, searchable template gallery (Studio-style triptych cards). |
| `SettingTrigger` | `@/components/setting-trigger` | Labelled setting row that opens a picker. |
| `StepRail` | `@/components/step-rail` | Numbered multi-step wizard indicator (e.g. Upload → Grid → Upscale): drives which panel renders; completed steps show a brand check, reached steps are clickable. Used by the Shots layout. |
| `BeforeAfterCompare` | `@/components/before-after-compare` | Draggable before/after comparison slider (original ↔ result) with pointer + keyboard (`role="slider"`) control. THE component for enhance/retouch/restore/upscale before↔after payoffs. Used by the Skin Enhancer layout. |
| `IconTile` | `@/components/icon-tile` | Small gradient icon tile used in sidebars / nav rows. |

## Preset tiles: horizontal or vertical orientation

Preset galleries support two tile orientations, chosen **per app** — never
hardcode one. The preset template (`src/layouts/preset.tsx`) exposes a
`PresetOrientation` (`'horizontal' | 'vertical'`) knob: `PresetTemplate` takes a
`presetOrientation` prop (default `'horizontal'`) that threads down to
`PresetGrid`, which reads `PRESET_GRID_LAYOUT[orientation]` to set the `Grid`
column count and the `MediaCard` `ratio`.

- **Horizontal** (default) — landscape 16:9 tiles, 3 columns.
- **Vertical** — portrait 9:16 tiles, denser grid (Figma vertical presets,
  3322:53945).

Pick the orientation that matches the app's output (e.g. vertical for shorts /
9:16 video apps): `<PresetTemplate presetOrientation="vertical" />`. To build a
new preset-style grid, drive tile shape with `MediaCard`'s `ratio` prop the same
way rather than a bespoke aspect ladder.

## Wiring `AssetLibraryModal` (copy-paste)

The modal is trigger-based: pass your clickable element via `trigger`, get the
chosen asset in `onSelect`.

```tsx
import { AssetLibraryModal } from '@/components/asset-library'
import { Dropzone, DropzonePreview } from '@/components/dropzone'

const [image, setImage] = useState<string | null>(null)

<AssetLibraryModal
  onSelect={item => setImage(item.src)}
  trigger={(
    <Dropzone
      render={<button type="button" />}
      icon={IconAddPhoto}
      title="Upload Image"
      subtitle="PNG, JPG or Paste from Clipboard"
      preview={image != null ? <DropzonePreview src={image} alt="Selected image" /> : undefined}
    />
  )}
/>
```

Other trigger shapes, straight from the shipped layouts:

```tsx
// A "+" pill in the PromptBox dock (studio.tsx)
<AssetLibraryModal
  trigger={<PromptBox.Pill iconOnly aria-label="Add media" start={<Icon as={IconPlus} size="sm" />} />}
/>

// An "Attach files" action under a Composer (preset.tsx)
<AssetLibraryModal
  trigger={<Composer.Action start={<Icon size="sm" as={IconPlus} />}>Attach files</Composer.Action>}
/>
```

### Why your trigger might silently not open the modal

`trigger` is rendered AS the modal trigger (Base UI `render` prop), so the
element must spread incoming props (`onClick`, `ref`, aria) onto a real DOM
node. Quanta components and the components in this folder all do. If you pass
a custom component that ignores unknown props, the click does nothing. Fix:
make it forward props, or wrap: `trigger={<button type="button" className="contents"><MyTile /></button>}`.

## Generation lifecycle (copy-paste)

One state machine, same visuals in every app: `idle → generating → result`.

```tsx
import { GenerationCard } from '@/components/generation-card'

{stage === 'generating' && <GenerationCard state="generating" ratio="portrait" />}
{stage === 'result' && (
  <GenerationCard src={resultUrl} alt="Result" className="group">
    {/* optional hover overlays composed as children */}
  </GenerationCard>
)}
```

For real backend wiring (submit, polling, uploads) read
`app/packages/fnf-react/ai/AGENTS.md` — `useGenerationRun` drives the
`generating` prop, `useAttachments` uploads the files picked via
`AssetLibraryModal`.

## Adding a new shared component

Build it here from Quanta primitives + `q-` tokens (never a third-party UI
lib), export it via an `index.ts`, document the Figma node in the JSDoc, and
add a row to the catalog table above.
