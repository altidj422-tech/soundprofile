import { useMemo } from 'react'
import { Loader } from '@higgsfield/quanta/loader'
import { Typography } from '@higgsfield/quanta/typography'
import { GalleryTile } from './gallery-tile.tsx'
import { DensityControl } from './density-control.tsx'
import { useJustifiedGallery } from './use-justified-gallery.ts'
import { useReducedMotion } from './use-reduced-motion.ts'
import { makeInitialItems } from './demo-data.ts'
import type { LoadTier } from './types.ts'
import type { GalleryItem } from './types.ts'
import './gallery.css'

/**
 * JustifiedGallery — the virtualized, Flickr-style justified-masonry feed that
 * backs the History tab.
 *
 * Architecture:
 *   • `JustifiedLayoutEngine` (plain TS) owns all layout + windowing math.
 *   • `useJustifiedGallery` wires the engine to scroll / resize / density and
 *     exposes only the visible window of rows.
 *   • This component renders that window as absolutely-positioned `GalleryTile`s
 *     over a fixed-height sizer, so the DOM only ever holds a screenful of tiles
 *     regardless of dataset size.
 */

export interface JustifiedGalleryProps {
  /** The dataset. Defaults to the seeded demo history (with a generating tile). */
  items?: GalleryItem[]
}

const numberFormat = new Intl.NumberFormat('en-US')

export function JustifiedGallery({ items }: JustifiedGalleryProps) {
  const initial = useMemo(() => items ?? makeInitialItems(), [items])
  const reducedMotion = useReducedMotion()

  const {
    viewportRef,
    layout,
    visibleRows,
    scrollTop,
    viewportHeight,
    fastScroll,
    density,
    setDensity,
    itemCount,
    loadingMore,
  } = useJustifiedGallery(initial)

  const viewTop = scrollTop
  const viewBottom = scrollTop + viewportHeight

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex shrink-0 items-center justify-between gap-4 px-0.5">
        <div className="flex items-center gap-2">
          <Typography as="h2" variant="body-sm-semi-bold" color="primary">
            Your generations
          </Typography>
          <Typography as="span" variant="caption-sm-regular" color="tertiary">
            {numberFormat.format(itemCount)}
            {' items'}
          </Typography>
          {loadingMore && (
            <span className="flex items-center gap-1.5 text-q-text-tertiary">
              <Loader variant="circle" size="xs" color="neutral" aria-label="Loading more" />
              <Typography as="span" variant="caption-sm-regular" color="tertiary">
                Loading
              </Typography>
            </span>
          )}
        </div>
        <DensityControl value={density} onChange={setDensity} />
      </header>

      <div ref={viewportRef} className="qg-viewport relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative w-full" style={{ height: layout.totalHeight }}>
          {visibleRows.map((row) => {
            if (row.type === 'header') {
              return (
                <div
                  key={row.key}
                  className="absolute inset-x-0 flex items-end px-0.5 pb-2"
                  style={{ top: row.y, height: row.height }}
                >
                  <Typography as="h3" variant="caption-sm-medium" color="tertiary">
                    {row.label}
                  </Typography>
                </div>
              )
            }
            const rowVisible = row.y < viewBottom && row.y + row.height > viewTop
            const tier: LoadTier = rowVisible ? 'full' : 'near'
            return row.tiles!.map(rect => (
              <GalleryTile
                key={rect.item.id}
                item={rect.item}
                rect={rect}
                top={row.y}
                tier={tier}
                fastScroll={fastScroll}
                reducedMotion={reducedMotion}
              />
            ))
          })}
        </div>
      </div>
    </div>
  )
}
