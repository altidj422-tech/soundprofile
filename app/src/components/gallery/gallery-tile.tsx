import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import IconPlayArrow from '@material-symbols/svg-400/outlined/play_arrow.svg?react'
import IconVideocam from '@material-symbols/svg-400/outlined/videocam.svg?react'
import { Icon } from '@higgsfield/quanta/icon'
import { GenerationCard } from '@/components/generation-card'
import { GenerationDetailModal } from '@/components/generation-detail'
import type { TileRect } from './justified-engine.ts'
import type { GalleryItem, LoadTier } from './types.ts'

/**
 * One gallery tile. It is absolutely positioned at the engine-computed rect and
 * composed from Quanta primitives:
 *   • `generating` items → `GenerationCard state="generating"` (the pulsing card).
 *   • ready items → a `GenerationCard` (image or hover-to-play video) that is the
 *     trigger of a `GenerationDetailModal`, preserving the click-to-open behavior.
 *
 * Load tiers (quality upgrade by distance) + fast-scroll placeholders are driven
 * by the `tier` / `fastScroll` props the engine layer computes — never by
 * per-tile measurement effects.
 */

export interface GalleryTileProps {
  item: GalleryItem
  rect: TileRect
  /** Row top, in content coordinates (the rect's x is row-relative). */
  top: number
  tier: LoadTier
  fastScroll: boolean
  reducedMotion: boolean
}

function rectStyle(rect: TileRect, top: number, tint: string): CSSProperties {
  return {
    left: rect.x,
    top,
    width: rect.width,
    height: rect.height,
    // Consumed by the .qg-placeholder / .qg-tile background.
    ['--qg-tint' as string]: tint,
  } as CSSProperties
}

/** A cheap solid placeholder — shown during fast flings and before media loads. */
function Placeholder({ shimmer }: { shimmer: boolean }) {
  return <span className="qg-placeholder" data-shimmer={shimmer ? 'true' : 'false'} aria-hidden="true" />
}

/** Still image with a placeholder→full fade and tier-driven load priority. */
function StillMedia({ item, tier, fastScroll }: { item: GalleryItem, tier: LoadTier, fastScroll: boolean }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      <Placeholder shimmer={fastScroll} />
      {!fastScroll && (
        <img
          className="qg-media absolute inset-0 size-full object-cover"
          data-loaded={loaded ? 'true' : 'false'}
          src={item.src}
          alt={item.alt}
          loading={tier === 'full' ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
        />
      )}
    </>
  )
}

/**
 * Hover-to-play video: poster still by default, plays (muted / looped /
 * playsInline) on hover & focus, pauses and resets on leave. Respects reduced
 * motion — when set, the poster stays put and the clip never autoplays on hover.
 */
function HoverVideo({
  item,
  tier,
  fastScroll,
  playing,
  reducedMotion,
}: {
  item: GalleryItem
  tier: LoadTier
  fastScroll: boolean
  playing: boolean
  reducedMotion: boolean
}) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [posterLoaded, setPosterLoaded] = useState(false)
  const active = playing && !reducedMotion

  useEffect(() => {
    const v = ref.current
    if (v == null) return
    if (active) {
      void v.play()?.catch(() => {})
    }
    else {
      v.pause()
      try {
        v.currentTime = 0
      }
      catch {}
    }
  }, [active])

  return (
    <>
      <Placeholder shimmer={fastScroll} />
      {!fastScroll && (
        <img
          className="qg-media absolute inset-0 size-full object-cover"
          data-loaded={posterLoaded ? 'true' : 'false'}
          src={item.src}
          alt={item.alt}
          loading={tier === 'full' ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setPosterLoaded(true)}
          style={{ opacity: active ? 0 : undefined }}
        />
      )}
      {!fastScroll && (
        <video
          ref={ref}
          className="absolute inset-0 size-full object-cover transition-opacity duration-200 ease-out"
          muted
          loop
          playsInline
          preload="none"
          poster={item.src}
          style={{ opacity: active ? 1 : 0 }}
        >
          <source src={item.videoSrc} type="video/mp4" />
        </video>
      )}
      {/* Video affordance — a glass chip: a videocam glyph at rest, a play
          triangle on hover, so the tile always reads as a hover-to-play clip. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-2 top-2 flex size-7 items-center justify-center rounded-q-full bg-q-overlay-hover text-q-icon-primary backdrop-blur-md"
      >
        <Icon as={playing ? IconPlayArrow : IconVideocam} size="sm" />
      </span>
    </>
  )
}

export function GalleryTile({ item, rect, top, tier, fastScroll, reducedMotion }: GalleryTileProps) {
  const [hovered, setHovered] = useState(false)

  if (item.status === 'generating') {
    return (
      <GenerationCard
        state="generating"
        ratio="auto"
        className="qg-tile"
        style={rectStyle(rect, top, item.tint)}
      />
    )
  }

  const isVideo = item.kind === 'video'
  const media = isVideo
    ? (
        <HoverVideo item={item} tier={tier} fastScroll={fastScroll} playing={hovered} reducedMotion={reducedMotion} />
      )
    : (
        <StillMedia item={item} tier={tier} fastScroll={fastScroll} />
      )

  return (
    <GenerationDetailModal
      generation={{
        src: isVideo ? (item.videoSrc ?? item.src) : item.src,
        poster: isVideo ? item.src : undefined,
        mediaType: isVideo ? 'video' : 'image',
        aspectRatio: item.width / item.height,
        prompt: item.prompt,
      }}
      trigger={(
        <GenerationCard
          render={<button type="button" />}
          ratio="auto"
          className="qg-tile group"
          style={rectStyle(rect, top, item.tint)}
          media={media}
          aria-label={`Open generation: ${item.prompt}`}
          onMouseEnter={isVideo ? () => setHovered(true) : undefined}
          onMouseLeave={isVideo ? () => setHovered(false) : undefined}
          onFocus={isVideo ? () => setHovered(true) : undefined}
          onBlur={isVideo ? () => setHovered(false) : undefined}
        />
      )}
    />
  )
}
