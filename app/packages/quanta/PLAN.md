# Quanta — Mechanics & Component Plan

> Derived from an exhaustive **2026-06-23** review of three Base-UI-based libraries —
> **Base UI** (base-ui.com), **Kumo** (`@cloudflare/kumo`, GitHub `cloudflare/kumo`), and
> **COSS UI** (`cosscom/coss`, coss.com/ui). Every component page/file was read, plus each
> library's **composition**, **styling**, and **registry** mechanisms. All three are built on
> Base UI — the same engine as Quanta — so the comparison is clean.
>
> **Token guardrail (hard constraint).** The token system is the design team's:
> `tokens/*.json` → emitters → `--hf-*` primitives, `q-*` utilities, `--q-tint` slots, the
> `data-theme` runtime, and the `--q-<comp>-<dim>` override knobs all stay **exactly as-is**.
> Nothing in Plan A adds, renames, restructures, re-themes, or re-emits a token. We upgrade only
> the **mechanics layer above the tokens**.

---

## 0. Evidence — the three mechanisms across the three libraries

| | Base UI | Kumo | COSS |
|---|---|---|---|
| **Composition** | `render` prop (element + `(props,state)=>` fn), `useRender`, `mergeProps`; `Root>Portal>(Positioner\|Backdrop)>Popup` overlays; `(value, eventDetails)` change events with `reason`/`cancel()` + `onValueChange`/`onValueCommitted` split; `createHandle()` detached triggers; `.Props`/`.State` TS namespaces | Same engine; `Object.assign(Root,{…})` compounds + dotted (load-bearing) `displayName`; `LinkProvider`; `resolveVariant()` crash-safety; Field auto-wrap | Same engine; flat named-export part families (`DialogPopup`); dual-export styled + raw primitive; data-driven `items` + function-as-child (SSR-safe); `*Popup`/`*Panel` rename w/ legacy aliases |
| **Styling** | headless (you style it); data-attr state model + CSS-var geometry + `data-starting/ending-style` | Tailwind v4 `@theme`; tokens **codegen'd** (`scripts/theme-generator/config.ts`) to oklch; `light-dark()` keyed on `data-mode`; `data-theme` for palette; `data-kumo-component/-part` scoping | Tailwind v4; tokens shipped as `cssVars` in `registry:style` items (`@coss/style`, swappable `@coss/colors-neutral`); primitive-refs + `--alpha()` + `color-mix()`, dark self-derived from a seed |
| **Registry** | none (headless npm); `llms.txt` + TS types only | **bespoke variant registry** — `KUMO_*_VARIANTS {classes, description}` → lint-enforced → codegen `component-registry.json` + `llms.txt` + CLI + Figma. **Only library with variant-level human descriptions.** | **shadcn registry** — `@coss → coss.com/ui/r/{name}.json`, per-item embeds source `content` + `cssVars`. Purpose = *distribution/install*, not AI metadata. AI story = a separate **MCP server**. |

**Crux:** the three registries are **complementary, not competing** — Kumo's answers "what do these variants mean" (AI-composition), COSS's answers "how do I install/copy this" (distribution). Only Kumo bakes AI metadata in.

**Where Quanta already leads** (none of the three ship these): `Chip`, `Tag`, `Dot`, `Glass`, `Media`, `Kbd`, `CloseButton`, styled `NavigationMenu`, styled `Sidebar`, `Typography`, `Grid`/`VirtualGrid`. Quanta is behind only on the **data/enterprise** and **forms-validation** layers.

---

## Plan A — Mechanics upgrades (token structure untouched)

Each item is **additive** and sits above the design-team token system. Source library in brackets.

### Phase 1 — Composition correctness (cheap; patterns already in `COMPONENT_STANDARD.md §2c`)
1. **Preserve the change-event contract** [Base UI] — wrappers forward `(value, eventDetails)` with `reason` + `cancel()`; keep `onValueChange` (live) vs `onValueCommitted` (settled). Never flatten to `(value) =>`.
2. **`createHandle()` detached triggers** [Base UI] — one overlay (Modal/Vault/future Popover/Tooltip) driven by many triggers with typed `payload`.
3. **Publish `useRender` + `mergeProps`** [Base UI] as Quanta's public authoring kit (already used internally in 6 components). Gotcha: `mergeProps` does **not** merge refs.
4. **Canonicalize the data-attribute state + `data-starting-style`/`-ending-style`** animation convention [Base UI] — already used ad-hoc; document it once as the rule.

### Phase 2 — AI-composability registry ⭐ (highest leverage; Kumo's pattern, token-safe)
5. **Machine-readable variant registry** [Kumo] — each recipe/variant option carries a human `description`; codegen `component-registry.json` + `llms.txt` from the existing recipe exports (`button()`, `badge()`, …) and `satisfies Record<>` unions; lint-enforce presence.
   - **Token-safe adaptation:** the registry carries component/variant **metadata only** and references design-team tokens **by name** (`q-*`/recipe output). It emits **zero token values** (unlike Kumo's codegen'd oklch or COSS's embedded `cssVars`).
6. **`resolveVariant(map, key, fallback)` crash-safety** [Kumo] — variant class-map lookups fall back + dev-warn instead of yielding `undefined`. Wraps the existing `SIZE_CLASS`/`VARIANT_CLASS` maps.

### Phase 3 — Escape hatches & list ergonomics
7. **`@higgsfield/quanta/primitives/*`** [Kumo/COSS] — auto-generated re-export of raw Base UI primitives (esp. the ~14 unwrapped ones) for power compositions.
8. **Data-driven `items` prop + function-as-child** [COSS/Base] for Select/Autocomplete/Combobox/Command — "values known before hydration" → SSR-safe + far easier for an LLM to emit.
9. **`LinkProvider`/`useLinkComponent`** [Kumo] — inject the app's router `<Link>` once; consumed by future Breadcrumb/Pagination + Sidebar/NavigationMenu links.
10. *(optional)* **`data-quanta-component`/`-part` scoping attributes** [Kumo] — a class-decoupled CSS-scoping hook for app-level overrides (uses existing classes; no token change).

### Phase 4 — Distribution (evaluate, not urgent)
11. **npm + "blocks" hybrid** [Kumo/COSS] — keep components as the npm package; also ship page-level compositions (PageHeader, ResourceList, confirm-delete — the `quanta-craft` output) as copyable **blocks**. If adopted, emit the shadcn **`registry-item.json`** format so `npx shadcn add` interoperates — but items reference our `q-*` utilities, **not** bundled `cssVars`.
12. *(optional)* **MCP server** for AI docs/patterns [COSS] — a complement to llms.txt/the registry for the "LLM-composable" story.

---

## Plan B — Components, ordered for composing any-difficulty project

Two halves: **B1 — finish what already exists but isn't done** (23 components still under Storybook's
`Components/` group, not yet promoted to `Done/`), then **B2 — build what's missing**.

**Done already (15)** *(Storybook `Done/` group, for reference):* Avatar · Badge · Button · Checkbox ·
Chip · CloseButton · Dropdown · Input · Modal · NavigationMenu · Sidebar · Switch · Tabs · Tag · Toggle.

### B1 — Finish the not-done components (23)

These exist and work; **"done"** = Figma-aligned + the full `Playground`/`Variants`/`RichVariants`
story set + `§2c`/`§2d` compliance, then promoted to the Storybook `Done/` group. Tiered by how
essential each is to composing a screen. Legend: **✚** = add/finish · **✂** = cut/trim.

> **Cross-cutting cleanup (also hits the `Done/` set):** `Dropdown`, `Modal`, `Sidebar` still hand-roll
> a search `<input>` — route them through `Input` (cmdk-style), per `§2d`.

**Finish-Tier 1 — core scaffolding (finish first):**
- **Typography · Icon · Divider** — foundational; ✚ Figma-align + promote (Divider already has a `Figma` story).
- **Card** — every layout. ✚ confirm `surface`/`elevation` parity. ✂ clarify the boundary vs `Glass` (Card = *structured* surface, Glass = *raw frosted* primitive) — keep both, no overlap.
- **Select** — every form/filter. ✚ data-driven `items` + function-as-child (Plan A #8); confirm `ScrollUpArrow`/`ScrollDownArrow` + `alignItemWithTrigger` parity with Base UI.
- **Tooltip · Textarea** — everywhere / forms; ✚ Figma-align + promote.
- **Radio** — forms. ✂ **trim 7 colors → 2 (brand + white) to match Checkbox** (`RadioColor = SlotColor | 'white'` → `'brand' | 'white'`; drop `neutral/success/error/warning/info` + their `q-radio-*` blocks) and move onto the §4a Pattern-2 color table like Checkbox — radio is meant to be "derived 1:1 from checkbox."
- **Media · Grid** — **product-critical for Higgsfield** (generated-media feeds/galleries); ✚ finish + keep `VirtualGrid`. High priority despite being "display."

**Finish-Tier 2 — high-frequency:**
- **Accordion** — settings/FAQ/sidebars; ✚ finish.
- **Autocomplete** — search/filter. ✚ data-driven `items`; clarify its **free-text** role vs the new constrained **Combobox** (+chips) in B2.
- **Progress** — feedback. ✂ review the broad surface (variant `bar/line/dots` × shape `linear/circular` × 5 sizes × slot colors) — drop unused shapes/variants.
- **Loader** — loading. ✂ same — trim the `xxs–lg` range + slot colors to what's actually used.
- **Sonner** — toast; ✚ finish.
- **NotFound** — empty states; ✚ finish (the COSS `Empty` / Kumo `Empty` analog).
- **Slider** — settings. ✚ ensure `onValueCommitted` (settled) parity with Base UI.
- **Vault** — drawers. ✚/✂ **decide snap-points + `SwipeArea`** (Base UI Drawer ships them, vault lacks them): add if mobile sheets need them, else explicitly defer and keep vault minimal.
- **Command (cmdk)** — power search; ✚ finish. *(Already composes `Input` correctly — the §2d model to copy.)*

**Finish-Tier 3 — polish / consolidate:**
- **ButtonGroup** — ✂ scope it as **presentational only**; build the stateful **ToggleGroup** separately (B2) rather than growing ButtonGroup into it.
- **Glass** — brand surface (unique vs all 3 libs); ✚ finish, keep.
- **Kbd** — shortcuts; ✚ finish (already has a `Figma` story).
- **Dot** — ✂ **consolidation candidate:** none of the 3 libs ship a standalone Dot (they use `Badge appearance="dot"`). Decide *keep cheap primitive* vs *fold into Badge* before finishing.

### B2 — Build the missing components

The holes vs the three libraries are the **data/enterprise** layer, the **forms-validation** layer,
and a few **connective overlays**. Several are *compositions*, so a few primitives are force-multipliers.

> **Force-multipliers (build before their dependents):** **Popover → Table → Field/Form → Calendar.**
> DatePicker, filter bars, inline editors, Stat cards, PageHeaders, and most "particles" are
> compositions of these four — most downstream surface for the least work.

**Tier 1 — unblocks whole archetypes:**
1. **Table / DataGrid** — the defining enterprise brick (lists, master-detail, inbox, settings, related lists). Build as a **skin over TanStack Table** (both COSS & Kumo do exactly this). Highest single leverage.
2. **Field + Form + Fieldset + Label** — the forms-validation layer. Quanta already wraps `@base-ui/react/field` *internally* → **expose it.** Gives `data-valid/-invalid/-dirty/-touched` on all controls for free.
3. **Popover** ⭐ — generic anchored surface (inline editors, filter popups, content menus). Also the heaviest raw primitive in the app today.
4. **Pagination** + **Breadcrumb** — table nav + record/detail nav. Small, pure, `render`-prop links.
5. **Date Picker / Calendar** — every form/filter/report (= Popover + Calendar composition).

**Tier 2 — high-frequency:**
6. **Combobox** (or Autocomplete `multiple` + chips) — searchable *constrained* select + token multi-select.
7. **Alert / Banner** — persistent inline status (Sonner is transient only).
8. **Skeleton** — layout-shaped loading (Loader is a spinner, not a placeholder).
9. **Collapsible** — standalone disclosure (+ heavy raw `SurfaceSection` usage).
10. **Toolbar** — chrome above tables/editors (roving focus; composes Button/Toggle/Input via `render`).
11. **Context Menu** — right-click / long-press.
12. **Checkbox Group / Toggle Group** — shared-state control sets.
13. **Charts** — dashboards. Peer-provide ECharts (Kumo's zero-bundle pattern) or token-driven SVG. *(Only Kumo ships these — larger build.)*

**Tier 3 — specialized / vertical (on demand):**
**Number Field**, **OTP Field** (auth/verify flow), **Scroll Area** (infra for dropdowns/sheets/sidebar), **Meter** (gauge ≠ progress), **Alert Dialog** (confirm), **Preview Card** (hover), **Menubar**, **Sheet** (side dialog), **Sensitive Input**, **Code/Shiki**, and composed bricks **Stat/KPI** (Card+Typography+delta), **Stepper/Wizard**, **Timeline**.

---

## Provenance
- **Coverage:** Base UI 37/37 components + 6 handbook + utils; COSS 54/54 components + 4 docs + 2 hooks (`sidebar.md` 404'd server-side, no delta impact); Kumo 44 dirs / 132 files cloned & read in full (site is bot-blocked → GitHub source is authoritative).
- **Already shipped from this research:** `ai/COMPONENT_STANDARD.md` **§2c** (compound-component rules); `ai/AGENTS.md` catalog (added Card, Typography, Icon).
- Plan A items are *adoption decisions* — they graduate into `COMPONENT_STANDARD.md` as rules once built and proven.
