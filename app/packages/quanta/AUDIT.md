# Quanta Component Audit — rules · optimization · architecture

> Audit of all **38 components** against `ai/COMPONENT_STANDARD.md` (incl. the new **§2c** compound +
> **§2d** reuse rules). Method (2026-06-23): 6 parallel auditors, every component dir read in full
> (`.tsx` + `.css` + `.test.tsx` + `index.ts`), three lenses — **rule violations**, **optimization
> leaks**, **architecture correctness** — each issue with `file:line` evidence and a concrete fix.
>
> ⚠️ **Pixel-perfect guardrail (Standard §1):** several fixes below (the §2d input swaps, the slider
> re-base) change rendered DOM. Treat each as "verify pixel-parity against the `Figma`/Storybook
> baseline, or flag" — don't ship a render-shifting "cleanup" silently.

## Summary

**The baseline is strong.** The two latent-bug classes are essentially clean:
- **§3 CSS registration** (unstyled-in-prod): **0 misses** — all 39 component `.css` are `@import`-ed in `components.css`, all carry `@source`.
- **§5 arbitrary values**: 1 real hit (`tag`), 1 borderline (`slider`); the `chip.tsx:11` hex is a JSDoc comment, not code.
- **§6 cleanup + reduced-motion**: handled almost everywhere; `grid`/`virtual-grid`/`use-flip`/`use-in-view` are **reference-quality** (every observer/rAF/timer torn down, FLIP + autoplay degrade under reduced-motion).

**The debt concentrates in two themes:**
1. **§2d — compose, don't hand-roll/duplicate** (the new rule, immediately validated): **7 sites** re-implement markup an existing component already covers.
2. **§2b / Principle-5 — don't re-implement Base UI behavior**: **2 components** re-build primitives Base UI ships (`dropdown` hover, `slider`).

Plus a cluster of **un-memoized context values (§6)**, some **dead/no-op surfaces**, and **over-built variant matrices** with zero app consumers.

**Counts: 7 HIGH · 20 MED · ~22 LOW.** Clean/reference: `button`, `input`, `checkbox`, `switch`, `glass`, `avatar`, `vault`, `grid`(+virtual-grid), `divider`, `kbd`, `icon`, `typography`, `not-found`, `tooltip`.

---

## HIGH — fix first

| # | Component | file:line | Lens | Issue | Fix |
|---|---|---|---|---|---|
| 1 | **dropdown** | `dropdown.tsx:489-512` + `dropdown.css` | §2d arch | Search hand-rolls raw `<input class="q-dropdown-search-input">` + bespoke `q-dropdown-search`/`-icon` chrome — re-implements `Input`. | Render `<Input start={<Icon><SearchIcon/></Icon>} value onChange inputClassName>` exactly like `cmdk`'s `CommandInput`; delete `q-dropdown-search*` CSS. |
| 2 | **dropdown** | `dropdown.tsx:151-353` (`OpenContext`, hover timers, `Trigger`/`Content` handlers) | §2b arch | Entire `openOnHover` model is hand-rolled (delay constants, `scheduleHoverOpen/Close`, manual `internalOpen`/`updateOpen`) — Base UI `Menu.Trigger` ships `openOnHover`/`delay`/`closeDelay` natively. Largest re-implementation of owned behavior in the set. | Forward `openOnHover`(+`delay`/`closeDelay`) to `Primitive.Trigger`; delete `OpenContext`, timers, pointer handlers, and the manual open-state control; let Base own open state unless `open` is passed. |
| 3 | **modal** | `modal.tsx:117-130` + `modal.css:277-291` | §2d arch | `Modal.Search` hand-rolls raw `<input class="q-modal-search-input">` — same `Input` re-implementation. | Compose `Input` (`start` icon, `type="search"`, forward `inputClassName`); remove the 3 `q-modal-search*` utilities. |
| 4 | **sidebar** | `sidebar.tsx:215-221` + `sidebar.css:556-567` | §2d arch | `Sidebar.Search` hand-rolls raw `<input class="q-sidebar-search-input">` + full bespoke `@utility`. | Compose `Input` (or the shared `q-field-control`/`q-field-input` surface, as `autocomplete` does); delete `q-sidebar-search-input`. |
| 5 | **radio** | `radio.tsx:25` + `radio.css:117-150` | §4a arch | `RadioColor = SlotColor \| 'white'` = **7 colors** vs Checkbox's **2** (`'brand' \| 'white'`), violating its own "derived 1:1 from checkbox" contract. | Narrow `RadioColor → 'brand' \| 'white'`; trim `COLOR_CLASS`; **delete** `q-radio-{neutral,success,error,warning,info}` (`radio.css:117-150`); drop the `SlotColor` type-borrow (`radio.tsx:8`). |
| 6 | **slider** | `slider.tsx:95-330` (whole) | §2b arch | Fully hand-rolled (manual `useState`/PointerEvents/keyboard/`role="slider"`+ARIA/bespoke `mergeRefs`) **despite `@base-ui/react/slider` existing** (Root/Track/Thumb/Indicator/Value, v1.5.0). | Re-base on Base UI `Slider.*` (paint Track/Indicator/Thumb with the existing `q-slider*` classes; keep `--q-slider-width` + glass recipe). If the segmented bar genuinely can't map to Base UI's thumb model, **document the exception in the JSDoc** (currently none). |
| 7 | **tag** | `tag.tsx:45,47` | §5 rule | Arbitrary JIT selector `[&_svg]:size-q-icon-xs` (×2) on `start`/`end` slots — an arbitrary value, and it bypasses `Icon`. | Wrap slot content in `<Icon size="xs">` (consistent with the remove glyph already using it) and remove the `[&_svg]` selectors. |

---

## MED

| Component | file:line | Lens | Issue | Fix |
|---|---|---|---|---|
| **select** | `select.tsx:67-73` | opt §6 | Inline `value={{ connected }}` context literal → re-renders Trigger/Content consumers each Root render. | `const ui = useMemo(() => ({ connected }), [connected])`. |
| **autocomplete** | `autocomplete.tsx:66-73` | opt §6 | Inline `value={{ connected, controlRef }}` context literal (same leak). | `useMemo(() => ({ connected, controlRef }), [connected])` (controlRef is stable). |
| **dropdown** | `dropdown.tsx:556-560` | opt §6 | `Group` runs `useLayoutEffect(() => setEmpty(...))` with **no dep array** → fires + sets state every render. | Gate `setEmpty` on the changed value, or compute emptiness without the effect+state round-trip. |
| **cmdk** | `cmdk.tsx:444-450` | opt §6 | `CommandItem` effect deps `[active]` omit `detail`/`action` → stale detail/action panes when they change while active. | Add `detail`, `action` to deps (setters are stable). |
| **menu** | `menu.css:42` | opt §6 | `.q-menu-item` declares a `transition` with **no `prefers-reduced-motion` degrade** block. | Add `@media (prefers-reduced-motion: reduce){ .q-menu-item{ transition-duration:1ms } }` (or confirm no duration ever applies). |
| **slider** | `slider.css` (no `@media`) + `slider.tsx:297` | opt §6 | Animates fill `width` (`transition-[width] duration-200`) with **no reduced-motion** degrade (switch/tabs/radio all have one). | Add a `prefers-reduced-motion` block disabling the width transition. |
| **sidebar** | `sidebar.tsx:215-221` | arch §2c.7 | Search part types against `<input>` so `...props`/`ref` land on the inner input, but the part's root DOM node is the wrapper `<div>` — ref reaches the wrong node. | Resolved by composing `Input`/`q-field-control` (the control becomes the root); else put `ref` on the `<div>` + expose `inputProps`. |
| **navigation-menu** | `navigation-menu.tsx:236` | rule §2c.3 | `Action.render?: ReactElement` is narrower than `useRender.RenderProp` — rejects the function form, inconsistent with `Sidebar.Item`. | Type `render?: useRender.RenderProp`. |
| **tabs** | `tabs.tsx:178-201` | arch §2c.3 | `Tab` (wraps `Primitive.Tab`) doesn't surface the `render` prop, so callers can't host-swap a tab into a link/Button (works via `...props` but untyped/undocumented). | Add `render?: ComponentProps<typeof Primitive.Tab>['render']` to `TabProps` (and `Panel`/`List` if link-tabs are wanted). |
| **card** | `card.css:68-76` + `card.tsx:114-119` | arch dup | `q-card-title`/`-description` CSS `@apply`s the **same** composite typography + color that the wrapped `<Typography>` already applies (double-painted; test asserts both classes). | Reduce the CSS to bare selector hooks (no `@apply`/`color`), or drop the Typography wrap — one source per value. |
| **media** | `media.tsx:203-210` | arch §2c.1 | `Object.assign(Root, { Root, … })` makes `Media.Root === Media` — self-referential, inconsistent with `card`/`grid` (which expose only sub-parts). | Drop the `Root` key: `Object.assign(Root, { Image, Video, Fallback, Overlay, Caption })`. |
| **accordion** | `accordion.css:46-53` | arch §2d | `.q-accordion-separated .q-accordion-item` re-derives the **exact `q-card` glass recipe** (its own comment admits it) → will drift when the glass surface changes. | Apply the `q-card` class to the separated item, or factor the glass surface into a shared `@utility` both consume. |
| **sonner** | `sonner.tsx:146` | arch §2d | `loading` glyph is a hand-rolled inline `<svg class="q-sonner-spinner">` — `Loader` already ships a slot-tinted, reduced-motion-safe `circle` spinner. | Render `<Loader variant="circle" size="sm" />`; drop `q-sonner-spinner` + `@keyframes q-sonner-spin` from `sonner.css`. |
| **cmdk** | `cmdk.tsx:587-602` | arch §2d | `CommandAction` forks a raw `<button class="q-command-action">` instead of composing `Button` (cmdk is otherwise the §2d exemplar — reuses Input/Kbd/Divider/Modal). | Render `<Button>` (or expose via `render`). If the footer pill needs a unique look, extend Button, don't fork. |
| **cmdk** | `cmdk.tsx` + `index.ts:1-21` | rule §2c.1 | Exports every part individually (`CommandInput`/`List`/`Item`/…) alongside the `Command` namespace — §2c.1 says ship ONE object. (modal/dropdown/vault export only the namespace.) | Keep parts as internal `function`s; export only `Command` + types. *(Verify no consumer imports the individual parts first.)* |
| **autocomplete** | `autocomplete.tsx:294-311` + `index.ts` | rule §2c.1 | Same — parts (`AutocompleteRoot`, …) exported individually in addition to the namespace. | Export only `Autocomplete` + public types. |
| **progress** | `progress.tsx` (surface) | arch over-built | 3 variants × 2 shapes × 5 sizes × 6 colors = **180 combos**, **zero app consumers** (stories only); circular line/dots are bespoke SVG geometry. | Confirm with product that circular line/dots + xxs/lg are real requirements; otherwise trim the shape/size matrix. |
| **loader** | `loader.tsx` (surface) | arch over-built | 4 variants × 5 sizes × 6 colors = **120 combos**, **zero consumers**; `stars`/`shine` are speculative marketing motifs. | Confirm `stars`/`shine`/`xxs` with product; the `circle`+`dots` core is clearly justified. |
| **button-group** | `button-group.tsx:92-110` | arch scope | Purely presentational (no `value`/`onValueChange`/`aria-pressed`/roving focus) — overlaps the **unbuilt ToggleGroup**; a caller wanting a segmented *select* finds no selection model. | Scope flag, not a bug: document in JSDoc that ButtonGroup = layout/segmentation and selection belongs to a future `ToggleGroup` (compose `Toggle`s). |
| **radio** | `radio.tsx:8,25` | arch | Borrows the `SlotColor` *type* as `RadioColor`'s base while not being a slot component — conflates Pattern-1/2 (it's actually correctly on the Pattern-2 table). | After narrowing (HIGH #5), define `RadioColor = 'brand' \| 'white'` directly; drop the `SlotColor` import. |

---

## LOW (condensed)

**Dead / no-op surfaces** — remove or justify:
- `modal` `q-modal-header-flush` sets the same padding as base → the `flush` prop is a no-op (`modal.css:116-119`).
- `progress` `--q-progress-conn` set in all 5 size blocks but **never read** (`progress.css:20-52`); + stale `q-progress-connector` test assertion.
- `navigation-menu` 4 orphan `@utility` blocks with zero refs: `q-nav-logo-link`, `q-nav-avatar-item`, `q-nav-header-avatar`, `q-nav-action-label`.
- `sidebar` `data-collapsed` attr emitted but no CSS keys off it (collapse uses `.q-sidebar-collapsed`).
- `media` `q-media-overlay-fill` ≡ `q-media-overlay-center` (byte-identical).
- `chip` `q-chip-brand` re-sets the base `q-chip` defaults (redundant).

**Token / consistency nits:**
- `chip` `q-chip-info` ring uses `state-info-bg`, siblings use `state-*-glow` (`chip.css:133`) — likely a missing `state-info-glow` token (also `radio-info`, moot once deleted).
- `slider` hardcodes `opacity-50` instead of `--hf-opacity-disabled` (switch/tabs use the token); inline `gap: var(--hf-space-050)` should be the `gap-0.5` class (`slider.tsx:319`); `transition-[width]` is an arbitrary property (borderline).
- `loader` Mode-A inconsistency: layout containers are plain selectors while sub-parts are `@utility` (cosmetic).
- `progress` variant literals aren't backed by a `VARIANT_CLASS satisfies Record<>` map (dispatched via `if`-branches).

**Reuse / coupling / polish:**
- `tooltip` `Provider` is a pass-through wrapper *function* — make it `const Provider = Primitive.Provider` (§2c passthrough).
- `media` hand-rolls a local ref-merge; `card` `Title`/`Description` should type `Omit<…,'color'>` (the stripped `color` isn't reflected); `textarea` uses an `as unknown as` cast (documented); `modal` `BackButton` + `sidebar` collaborator/thumbnail use raw `<button>`/`<img>` (borderline — recipe reused / no Avatar equivalent for the 18px stack); `close-button` re-exports `CloseIcon` that `tag` imports through it (indirection).

**Ref-test gap (cross-cutting):** `tag`, `chip`, `badge`, `toggle` rely on React-19 ref-as-prop **without an explicit ref test** (`button`, `button-group`, `close-button` each have one). Functionally fine; add tests to lock the contract.

**Documented §5 exceptions (no action — listed for completeness):** `glass` blur knobs (`--q-glass-blur`), `avatar` dot rim anchor (`85.355%`), the `1ms` reduced-motion snap sentinels (sonner/close-button/accordion), `dot`/`loader` stagger durations — all correctly flagged inline per §5(a).

---

## Cross-cutting themes & recommended fix order

- **Theme A — §2d compose, don't hand-roll** (validates the new rule): search inputs (`dropdown`/`modal`/`sidebar` → `Input`), spinner (`sonner` → `Loader`), action (`cmdk` → `Button`), tag svg slots (→ `Icon`), accordion glass (→ share `q-card`).
- **Theme B — §2b don't re-implement Base UI**: `dropdown` hover model, `slider` (the two biggest architectural wins).
- **Theme C — §6 un-memoized context / effects**: `select`, `autocomplete`, `dropdown` Group effect, `cmdk` deps (cheap, safe perf).
- **Theme D — dead / over-built cleanup**: no-op surfaces above, `loader`/`progress` matrices, `radio` colors.

**Suggested order:** **C** (cheap, low-risk perf) → **A: inputs** (high-value, exercises the new rule — pixel-verify each) → **radio trim** (D, contained) → **B** (`slider`/`dropdown` — larger, pixel-verify) → remaining **D** cleanup.

## Token-gap flags for the design team
- Sub-second **stagger durations** (`0.3/0.6/0.9s`) and an **`ease-in-out` bezier** — no matching `--hf-duration-*` / `--hf-ease-*` (surfaced by `loader`/`dot`).
- **`state-info-glow`** — `chip`/`radio` info focus-ring falls back to `state-info-bg`.
- **`--hf-opacity-disabled`** — used by switch/tabs; `slider` hardcodes `opacity-50` for want of the utility.
