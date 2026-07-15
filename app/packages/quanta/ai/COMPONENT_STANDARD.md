# Component authoring standard

The single rulebook for building & maintaining `@higgsfield/quanta` components.
Derived from the existing component set — this codifies the conventions already
proven in `button`, `switch`, `dot`, `divider`, etc. so every new component looks
and behaves like the others.

> Tokens are the single source of truth. Every visual value maps to a token.
> If no token exists for a value you need, **flag the gap — never inline a
> custom/arbitrary value.** See §5.

---

## Quality bar

Every component change is held to **5 principles**. They are non-negotiable; a
PR that breaks any one is not done. The rest of this doc is how you satisfy
them — these are the *why*.

1. **PIXEL-PERFECT.** The rendered result stays byte-identical to the current
   Figma-aligned output. Every refactor below must be visually exact-equivalent.
   If a change would alter the render in any way, **don't make it — FLAG it
   instead.** A "cleanup" that shifts a pixel is a regression, not a cleanup.
2. **READABLE CODE.** Flat maps typed with `satisfies Record<…>` (§2.3),
   intent-named (`SIZE_CLASS`, not `m`), no clever indirection; small focused
   functions; match every convention in this doc.
3. **NO OVER-NESTED LAYOUTS.** One element where one suffices (§2.8). Strip a
   wrapper **only** when it is provably layout-neutral (single child, zero own
   visual/layout style); otherwise KEEP it. When uncertain, FLAG.
4. **REF-FORWARDING.** The component forwards `ref` to its primary root DOM node
   (§2.7). React 19 ref-as-prop: ensure `ref` is actually spread/passed through,
   never dropped. For Base UI wrappers, `ref` flows to the primitive.
5. **BASE UI USED CORRECTLY.** When wrapping a Base UI primitive, let it own
   behavior, a11y, state, and `data-*` attributes (§2b). Quanta only paints and
   forwards `className` + `ref` + `...props`. No re-implementing Base UI
   behavior, no redundant double-wrapping.

Stay token-clean and gate-clean throughout: only `--hf-*` / `q-*` values (§4,
§5), and the verification gate (§7) green.

---

## 1. One file structure

Every component lives in `src/components/<name>/` with **exactly** these files:

```
<name>/
  <name>.tsx        component + types + (optional) recipe fn
  <name>.css        presentation OR scanner registration (see §3) — REQUIRED
  <name>.test.tsx   colocated tests (import from ./index.ts)
  index.ts          public barrel: export the component + its public types
```

- `index.ts` re-exports the component and **all public types**:
  ```ts
  export { Thing } from './thing.tsx'
  export type { ThingProps, ThingSize, ThingColor } from './thing.tsx'
  ```
- Tests import through the barrel (`from './index.ts'`), never the raw `.tsx`,
  so they exercise the same surface consumers use.
- A `.css` file is **mandatory even when there are no styles** — see §3 (the
  `@source` registration requirement). The only exception is a component that
  shares another component's stylesheet (e.g. `dropdown` uses `menu.css`); such
  sharing must be documented in a comment in both files.

---

## 2. One component shape

```tsx
'use client'

import type { ComponentProps, ReactNode } from 'react'
import type { ClassValue } from '../utils/cx.ts'
import { cx } from '../utils/cx.ts'

/** One-paragraph JSDoc: what it is, what Figma node it maps to, key behavior. */

export type ThingSize = 'sm' | 'md' | 'lg'
export type ThingProps = ComponentProps<'div'> & {
  size?: ThingSize
}

// Union → literal class strings. `satisfies Record<Union, string>` makes the
// union the single source of truth: adding a variant fails to compile until its
// class is registered here. Tailwind extracts these literals (see §3).
const SIZE_CLASS = {
  sm: '…',
  md: '…',
  lg: '…',
} satisfies Record<ThingSize, string>

export function Thing({ size = 'md', className, ...props }: ThingProps) {
  return <div className={cx('q-thing', SIZE_CLASS[size], className)} {...props} />
}
```

Rules:
1. **`'use client'`** at the top of every component `.tsx`.
2. **`ComponentProps<'element'>`** (or `ComponentProps<typeof Primitive.Root>`
   for Base UI wrappers) as the props base, intersected with the component's
   own options. Always accept and forward `className` + `...props`.
3. **Maps are named `SIZE_CLASS` / `VARIANT_CLASS` / `COLOR_CLASS`** and typed
   with **`satisfies Record<Union, string>`** (compile-time exhaustiveness).
   Never `const X: Record<…>` (weaker — allows missing keys to slip).
4. **`cx(...)`** is the only class joiner. The composite component class comes
   first, then maps, then the caller `className` **last** (so callers win).
5. **`ClassValue`** is imported from `../utils/cx.ts` — never redefined locally.
6. Default every optional prop in the destructure (`size = 'md'`).
7. **Forward `ref` to the primary root DOM node.** React 19 passes `ref` as a
   prop, so `...props` already carries it — but only if it actually lands on the
   root element. Spread `...props` onto the rendered root (or pass `ref`
   explicitly) so it is never dropped. For Base UI wrappers, `ref` flows through
   to the primitive (it owns the DOM node — see §2b); never intercept it.
8. **One element where one suffices.** Render the minimum DOM. A wrapper element
   may exist only when it does real work. Remove a wrapper **only** if it is
   provably layout-neutral: it has a **single child** and **no own visual/layout
   effect** — no padding, margin, gap, flex, grid, display, size, border,
   background, position, or transform. If it carries **any** such style, KEEP it
   (removing it shifts layout = a pixel regression). When uncertain, FLAG it —
   do not remove.

### 2a. Recipe functions (optional, for composable styling)

Components whose class string is useful on other elements expose a lowercase
recipe fn returning the class string (`button()`, `badge()`, `chip()`,
`checkbox()`, `radio()`, `modal()`):

```ts
export function thing(options: ThingOptions = {}, ...extra: ClassValue[]): string {
  const { size = 'md' } = options
  return cx('q-thing', SIZE_CLASS[size], ...extra)
}
```

Provide one when consumers may need to style a non-default element (e.g.
`<Trigger className={button({ variant: 'secondary' })}>`). Skip it for
leaf/structural components.

### 2b. Base UI wrappers

When wrapping a Base UI primitive (switch, checkbox, radio, toggle, slider,
dropdown), let Base UI own behavior + a11y + state data-attributes; quanta only
paints. `className` may be a `string | (state) => string` — resolve it:

```ts
className={state => cx('q-thing', SIZE_CLASS[size],
  typeof className === 'function' ? className(state) : className)}
```

Slot-colored components spread `slotStyle(color)` into `style` (§4).

### 2c. Compound (composition-first) components

A component that is more than one element (modal, dropdown, select, sidebar,
card, tabs, accordion, vault, navigation-menu, autocomplete, command, media,
grid) ships as a **parts API**. The principle: **the component owns the DESIGN
(the surface, the rows, the spacing); every title / control / caption is CONTENT
the caller composes.** Parts make **no assumption about the caller's data shape**.

1. **One file, one exported namespace.** All parts live in the same `<name>.tsx`
   and ship as ONE object — never export parts individually. Two sanctioned forms:
   - `export const Modal = { Root, Trigger, Content, … }` — caller always enters at
     `<Modal.Root>`. **Default.**
   - `export const Card = Object.assign(Root, { Header, Body, Footer })` — use
     **only** when `<Card>` is also valid bare (card, grid, media, autocomplete,
     command): `<Card>` renders the root, `<Card.Header>` is a part.
2. **Three kinds of part — use the lightest that works:**
   - **Passthrough:** `const Root = Primitive.Root` — re-name a Base UI part
     unchanged (Base owns behavior/a11y/state/`data-*`; §2b).
   - **Styled wrapper:** wrap a Base UI part, add the class, forward the rest:
     `<Primitive.Title className={cx('q-modal-title', className)} {...props} />`;
     type `Omit<ComponentProps<typeof Primitive.Title>, 'className'> & { className?: string }`.
   - **Structural:** a pure `q-*` element, no Base primitive (`Modal.Header`,
     `Dropdown.ItemTitle`) — `ComponentProps<'div'|'span'>`, `cx('q-…', className)`.
3. **Host-swap goes through Base UI — never a hand-rolled Slot.** Two surfaces:
   - A part wrapping a Base UI part exposes Base UI's **`render`** prop unchanged:
     `<Modal.Trigger render={<Button>Open</Button>} />`, `<… render={<Divider />} />`.
   - A standalone leaf/recipe exposes **`as`** (polymorphic tag) and/or **`asChild`**,
     implemented with Base UI **`useRender`** (precedent: button, card, glass,
     sidebar, navigation-menu, not-found). Any element the caller passes must
     forward `ref` and spread the props it receives.
4. **Shared state lives in `Root` and is broadcast via a memoized context** — never
   prop-drill between parts (precedent: dropdown selection/open/query, sidebar
   collapse). Controlled + uncontrolled in one model:
   `const isControlled = value != null; const current = isControlled ? value : internal`
   — seed the internal case from `defaultValue`, fire `onValueChange` either way,
   and `useMemo` the context value.
5. **Overlays compose the Base UI layer stack** on the `Content`/`Popup` part:
   `Portal > (Positioner | Backdrop) > Popup`. Anchored menus/popovers use a
   `Positioner` (surface `side`/`align`/`sideOffset`/`alignOffset`/`collisionPadding`
   + a `container` portal-mount prop); centered dialogs use a `Backdrop` and no
   Positioner. Never re-implement positioning.
6. **Preserve Base UI's change-event shape.** Forward `onValueChange(value,
   eventDetails)` with its `reason` / `cancel()` intact — don't flatten it to
   `(value) => …` — and keep the `onValueChange` (live) vs `onValueCommitted`
   (settled) split wherever the primitive offers it.
7. **Every part forwards `ref`** to its root DOM node (React 19 ref-as-prop via
   `...props`). When a part keeps its own ref AND forwards one, merge them
   (precedent: the local `mergeRefs` in modal/slider/cmdk).
8. **Reuse Base UI's part vocabulary** verbatim so parts read alike everywhere:
   `Root · Trigger · Portal · Positioner · Backdrop · Popup · Arrow · Viewport ·
   Item · ItemIndicator · Group · GroupLabel · Separator · Title · Description ·
   Close · Track · Thumb · List`. For Quanta's own structural sub-parts follow the
   `Item*` slot pattern (`ItemIcon` / `ItemContent` / `ItemTitle` / `ItemTrailing`).

### 2d. Reuse components — never hand-roll what already exists

A component **composes existing quanta components**; it must not hand-roll markup
that duplicates one. If you find yourself styling a raw `<input>`, `<button>`,
icon, badge, divider, spinner, etc. inside a component, stop — render `Input`,
`Button`, `Icon`, `Badge`, `Divider`, `Loader`, … instead. Composing the real
component inherits its tokens, states, a11y, ref-forwarding, and every future fix
for free; a bespoke copy silently drifts from the original.

- ❌ **Violation:** `Dropdown`, `Modal`, and `Sidebar` each hand-roll a search
  field as a raw `<input className="q-dropdown-search-input">` (and `q-modal-…`,
  `q-sidebar-…`) — re-implementing the `Input` component.
- ✔ **Correct:** `Command` (cmdk) composes the real component — `Command.Input`
  renders `<Input>`. The three above should do the same.

A bespoke `q-<comp>-<thing>` element is justified **only** when no quanta component
covers it (a genuinely new structural part). When one exists, compose it — if it
needs a tweak to fit, extend that component, don't fork it.

---

## 3. One styling architecture (two sanctioned modes)

**Why a `.css` is always required:** quanta is consumed as a **symlinked
workspace package**, and Tailwind's automatic content detection **skips
`node_modules`**. So the literal class strings in a component's `.tsx` are NOT
discovered unless the colocated `.css` registers them with
`@source "./<name>.tsx";`. Every `.css` is then `@import`-ed once in
`src/css/tailwind/components.css` (the aggregator) so it lands in the bundle.
**Forgetting either step is a latent prod bug: the component renders unstyled in
the app even though it looks fine in Storybook** (Storybook scans `../stories`).

Pick the mode that fits:

**Mode A — `@utility` (stateful / complex / themed components):**
emit one composite `q-<name>` class; author the real rules in the `.css` via
`@utility q-<name> { … }`. Used by button, switch, checkbox, radio, chip,
badge, input, kbd, modal, avatar, tabs, menu, slider.

```css
@source "./thing.tsx";
@utility q-thing { /* token-based declarations only */ }
```

**Mode B — registration-only (simple presentational components):**
compose emitted utilities inline in the `.tsx`; the `.css` contains *only* the
`@source` line + a header comment explaining why. Used by dot, divider, tag,
toggle.

```css
/* Header comment: composes emitted utilities; this file registers the scanner. */
@source "./thing.tsx";
```

After creating any `.css`, add its `@import` to
`src/css/tailwind/components.css`.

---

## 4. Tokens are the single source of truth

Authoritative reference: `ai/AGENTS.md` (§"The `q-` namespace"). In brief:

- **Color / type / z-index / border-width / component classes → `q-`-prefixed**
  (`bg-q-background-primary`, `text-q-body-md-regular`, `border-q-thin`,
  `z-q-modal`, `q-button-primary`).
- **Spacing / sizing / breakpoints → native, unprefixed** (`p-4`, `gap-2`,
  `size-2`, `h-10`, `tablet:flex`). These are structural primitives shared with
  legacy `@higgsfield/ui`; the native Tailwind scale is active in the real build
  because consumers import `tailwindcss` before quanta. ✔ verified: `size-2`
  renders 8px.
- **Composite typography only** (`text-q-headline-md-semi-bold`), never
  `text-2xl font-bold`.
- **Component color → one of two patterns (§4a).** Both resolve to
  `--hf-color-*` runtime primitives, so theming is automatic. Pick by component
  class — never collapse them into one.

### 4a. Component color: two deliberate patterns

A component that takes a `color` prop uses exactly ONE of these. They fit
different component classes; forcing one into the other is a pixel regression.

**Pattern 1 — Tint slot** (`utils/slot.ts` + `tailwind/slot.css`). For soft,
single-accent surfaces. Take `color?: SlotColor`, spread `slotStyle(color)` into
`style` (sets the private `--q-tint*` vars), and paint with `q-slot-*` utilities
(`q-slot-bg-10`, `q-slot-text`, `q-slot-ring-40`, …). One prop re-skins the whole
control and it is theme-reactive for free. **Used by:** toggle, tag, switch,
tabs, progress, loader.

```ts
style={{ ...slotStyle(color), ...style }}   // → className "q-slot-bg-10 q-slot-text"
```

**Pattern 2 — Selection-control color table** (the component's own `.css`). For
controls whose color is a richer *identity* than a tint — a fill, an inverse fg,
a hover border, and a **bespoke glow ring that is NOT a `color-mix` of one
color**. Author per-color `@utility q-<comp>-<color>` blocks that set the
component's private `--q-<comp>-fill` / `-fg` / `-hover-border` / `-ring` vars
from exact tokens (e.g. `state-success-glow`, `transparent-lime-20`, brand hover
`lime-900`). **Used by:** checkbox, radio, chip (radio is derived 1:1 from
checkbox).

```css
@utility q-chip-success {
  --q-chip-selected-bg: var(--hf-color-state-success-fg);
  --q-chip-ring: var(--hf-color-state-success-glow);   /* a real glow token, not color-mix */
}
```

**When to use which:** single accent/tint → Pattern 1. Selected/active state
needs a distinct fill + glow-ring identity → Pattern 2. The tint slot can only
derive its ring as `color-mix(--q-tint 40%)`, so a Pattern-2 control folded onto
it loses its exact glow ring — a visible regression (§1).

### 5. No custom / arbitrary values — flag the gap

- ❌ `w-[184px]`, `p-[17px]`, `style={{ padding: '17px' }}`, `#d1fe17`, `rgb(...)`.
- ✔ If a value isn't on a token scale, it's either (a) a genuine fixed Figma
  **component dimension** with no token — encode it as a documented CSS custom
  property default inside the component's `@utility` rule (precedent:
  `--q-menu-min-width` in `menu.css`, `--q-slider-width` in `slider.css`), keep
  it overridable by the caller; or (b) a real **token gap** — surface it to the
  design-tokens owner; do not inline.
- `style={{ … }}` is allowed **only** for wiring dynamic values that can't be a
  class: `slotStyle(color)` spreads, Base UI positioner vars
  (`--transform-origin`), or a measured fill `width: ${pct}%`.

---

## 6. Performance & correctness conventions

- **Static maps are module-level consts** (`SIZE_CLASS` etc.) — defined once,
  not rebuilt per render.
- **No `tailwind-merge`** — `cx` is a plain filter+join; rely on caller-last
  ordering for overrides (§2.4). Keep class lists static where possible so
  Tailwind can extract them.
- **Memoize only derived objects passed via context** (e.g. the dropdown
  selection context uses `useMemo`); don't over-memoize leaf render paths.
- **Lift expensive/shared state into context once**, expose a minimal surface
  (see `Dropdown.Root`'s controlled/uncontrolled selection model).
- **Reduced motion**: any animation must degrade under
  `@media (prefers-reduced-motion: reduce)` (precedent: modal.css, menu.css,
  dot.css).
- **Accessibility is Base UI's job when wrapping it**; for hand-rolled elements,
  set the right role/aria and forward refs implicitly via `...props`.

---

## 7. Verification gate (run before declaring done)

From `packages/quanta/`:

```bash
yarn typecheck                 # tsc — must be clean
yarn vitest run                # full suite — must be green
# spot-check the component renders correctly (Storybook), and that any new
# class survives the SYMLINKED build (the .css @source + components.css import).
```

A component is not "done" until: structure matches §1, it has a registered
`.css` (§3), zero arbitrary values (§5), colocated tests pass, and it renders
correctly in Storybook.
