/**
 * Material Symbols replacement for `@higgsfield-ai/icons` (template-only).
 *
 * The vendored `@higgsfield/quanta` components import their glyphs from the
 * private, Nexus-only `@higgsfield-ai/icons` package. Generated websites build on
 * the PUBLIC npm registry and must not depend on the internal registry, so
 * `@higgsfield-ai/icons/*` is aliased to THIS module (see `vite.config.ts`
 * `resolve.alias` + `tsconfig.json` paths). Each export mirrors the
 * `@higgsfield-ai/icons/<Name>` subpath a quanta component imports, mapped to its
 * closest Google Material Symbols glyph (`@material-symbols/svg-400`,
 * Apache-2.0), loaded as a React component via vite-plugin-svgr with
 * `fill: currentColor`, so it drops straight into quanta's `<Icon as={…}>`
 * (which sizes + colors the glyph via CSS tokens on the svg element).
 *
 * The app icon set is Material Symbols OUTLINED (weight 400) — one icon family
 * everywhere; use the `-fill` variants only for very small glyphs that need to
 * read solid. Only the generic UI glyphs the SHIPPED quanta components use are
 * mapped; if a future quanta sync adds a new glyph to a component, add it here
 * (the build fails with an unresolved export otherwise).
 */
import type { IconGlyph } from "@higgsfield/quanta/icon";
import Add from "@material-symbols/svg-400/outlined/add.svg?react";
import Cancel from "@material-symbols/svg-400/outlined/cancel.svg?react";
import Check from "@material-symbols/svg-400/outlined/check.svg?react";
import CheckCircle from "@material-symbols/svg-400/outlined/check_circle.svg?react";
import ChevronLeft from "@material-symbols/svg-400/outlined/chevron_left.svg?react";
import ChevronRight from "@material-symbols/svg-400/outlined/chevron_right.svg?react";
import Circle from "@material-symbols/svg-400/outlined/circle.svg?react";
import Close from "@material-symbols/svg-400/outlined/close.svg?react";
import Folder from "@material-symbols/svg-400/outlined/folder.svg?react";
import Info from "@material-symbols/svg-400/outlined/info.svg?react";
import Keep from "@material-symbols/svg-400/outlined/keep-fill.svg?react";
import KeyboardArrowDown from "@material-symbols/svg-400/outlined/keyboard_arrow_down.svg?react";
import SearchGlyph from "@material-symbols/svg-400/outlined/search.svg?react";
import UnfoldMore from "@material-symbols/svg-400/outlined/unfold_more.svg?react";
import Warning from "@material-symbols/svg-400/outlined/warning.svg?react";

// TYPE BRIDGE, not a runtime change: svgr components are typed against the
// app's @types/react while quanta types glyphs against its own vendored copy
// (`IconGlyph`). Runtime is unaffected — the glyphs just spread props onto
// the <svg> — so re-export each icon cast to quanta's IconGlyph.
const glyph = (icon: unknown): IconGlyph => icon as IconGlyph;

export const IconMagnifyingGlass2Outlined = glyph(SearchGlyph);
export const IconMagnifyingGlassOutlined = glyph(SearchGlyph);
export const IconFolder1Outlined = glyph(Folder);
export const IconCheckmark2MediumOutlined = glyph(Check);
export const IconPlusMediumOutlined = glyph(Add);
export const IconPinFilledThin = glyph(Keep);
export const IconExclamationTriangleOutlined = glyph(Warning);
export const IconCrossMediumOutlined = glyph(Close);
export const IconCircleXOutlined = glyph(Cancel);
export const IconCircleOutlined = glyph(Circle);
export const IconCircleInfoOutlined = glyph(Info);
export const IconCircleCheckOutlined = glyph(CheckCircle);
export const IconChevronRightMediumOutlined = glyph(ChevronRight);
export const IconChevronLeftMediumOutlined = glyph(ChevronLeft);
export const IconChevronGrabberVerticalOutlined = glyph(UnfoldMore);
export const IconChevronDownMediumOutlined = glyph(KeyboardArrowDown);
export const IconChevronBottomOutlined = glyph(KeyboardArrowDown);
