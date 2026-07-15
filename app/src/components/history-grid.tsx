import { JustifiedGallery } from '@/components/gallery'

/**
 * History feed — THE canonical History section for every app: it shows only the
 * CURRENT user's own generations in this app (personal — never other users'
 * work, never a public/community feed), and every History tab/page renders this
 * exact component.
 *
 * It is a virtualized, Flickr-style JUSTIFIED-MASONRY gallery
 * (`@/components/gallery`): variable-width tiles packed into equal-height rows,
 * a bespoke out-of-React layout/windowing engine that renders only the tiles in
 * or near the viewport, user-adjustable column density, hover-to-play videos,
 * fast-scroll placeholders, scroll anchoring and infinite scroll. Dated batch
 * grouping ("Today" / "Yesterday" / …) is preserved as section headers, and one
 * tile is kept in the `generating` state (the pulsing `GenerationCard`). Each
 * ready tile opens the `GenerationDetailModal` lightbox on click.
 *
 * The public `HistoryGrid` export is unchanged so the History tab in
 * `src/layouts/preset.tsx` picks up the gallery automatically.
 */
export function HistoryGrid() {
  return <JustifiedGallery />
}
