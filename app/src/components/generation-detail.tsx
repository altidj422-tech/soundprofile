import type { ReactElement, ReactNode } from 'react'
import { useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import IconDownloadOutlined from '@material-symbols/svg-400/outlined/download.svg?react'
import IconArrowShareRightOutlined from '@material-symbols/svg-400/outlined/share.svg?react'
import IconChevronTopMediumOutlined from '@material-symbols/svg-400/outlined/keyboard_arrow_up.svg?react'
import IconCircleInfoOutlined from '@material-symbols/svg-400/outlined/info.svg?react'
import IconCloudFilled from '@material-symbols/svg-400/outlined/cloud.svg?react'
import IconCrossMediumOutlined from '@material-symbols/svg-400/outlined/close.svg?react'
import IconDotGrid1x3HorizontalOutlined from '@material-symbols/svg-400/outlined/more_horiz.svg?react'
import IconHeartOutlined from '@material-symbols/svg-400/outlined/favorite.svg?react'
import IconVideoOutlined from '@material-symbols/svg-400/outlined/videocam.svg?react'
import { Avatar } from '@higgsfield/quanta/avatar'
import { Button } from '@higgsfield/quanta/button'
import { glass } from '@higgsfield/quanta/glass'
import { Icon } from '@higgsfield/quanta/icon'
import { Media } from '@higgsfield/quanta/media'
import { Typography } from '@higgsfield/quanta/typography'

/**
 * GenerationDetailModal — the full-screen "Viewer / Image" lightbox that opens
 * when a generation card is clicked (Figma SC App Builder, node 3019:100235).
 *
 * ── Anatomy ──────────────────────────────────────────────────────────────────
 * A full-viewport overlay (NOT a centered card) with three stacked layers:
 *   1. Backdrop — the generation itself, cover-filled, darkened by a scrim and
 *      washed by a heavy backdrop blur so the media reads as frosted glass behind
 *      everything. This is the "lightbox" effect.
 *   2. Stage — the crisp, contained media (image or video) centred in the left
 *      region.
 *   3. Info panel — a frosted glass card pinned to the right holding: an author
 *      row (avatar + name + Share + Close), a collapsible "Details" block
 *      (status / type / size / uploaded / last used + prompt), and a sticky
 *      action footer ("Turn to video" CTA + Download / Like / Share / More).
 *
 * ── Why Base UI Dialog directly (not Quanta `Modal`) ─────────────────────────
 * Quanta's `Modal` paints a centred, width-capped glass CARD (`q-modal`: fixed
 * 50/50 translate, `width: min(...)`, own backdrop-blur, 24px radius). A
 * full-bleed lightbox with an image backdrop + a right-docked panel is a
 * different surface entirely — reusing `Modal.Content` would mean overriding
 * nearly every one of those utilities. So we compose Base UI's `Dialog`
 * primitive (the same one `Modal` wraps — focus trap, scroll lock, escape,
 * a11y, portal, exit-mount timing) directly and skin it with Quanta tokens +
 * Quanta content components (`Media`, `Avatar`, `Button`, `Typography`, `Icon`,
 * and the `glass()` recipe).
 *
 * ── API ──────────────────────────────────────────────────────────────────────
 * Mirrors `AssetLibraryModal({ trigger })`: pass the generation card as
 * `trigger` and (optionally) the `generation` data. Another agent can wire this
 * to the History grid by rendering a card element as the trigger:
 *
 *   <GenerationDetailModal
 *     trigger={<GenerationCard … />}
 *     generation={{ src, mediaType: 'image', author: { name }, prompt, … }}
 *   />
 */

export interface GenerationDetail {
  /** Media source (image or video). Reuse a local `/presets/*` asset. */
  src: string
  /** Renders a `<video>` when `'video'`, otherwise an `<img>`. Default `'image'`. */
  mediaType?: 'image' | 'video'
  /** Poster shown before a video plays. */
  poster?: string
  /** Aspect ratio (width / height) of the crisp preview. Default `2 / 3` (portrait). */
  aspectRatio?: number
  /** Author shown in the panel header. */
  author?: { name: string, role?: string, avatarSrc?: string }
  /** Storage status label (paired with a cloud glyph). */
  status?: string
  /** File type, e.g. `JPG` / `MP4`. */
  fileType?: string
  /** Human file size, e.g. `2.4 MB`. */
  size?: string
  /** When the asset was created / uploaded. */
  uploadedAt?: string
  /** When the asset was last used. */
  lastUsedAt?: string
  /** The generation prompt. */
  prompt?: string
}

export interface GenerationDetailModalProps {
  /** The trigger element (e.g. a generation card). Rendered as the dialog trigger. */
  trigger: ReactElement
  /** Data shown in the viewer. Falls back to a demo generation when omitted. */
  generation?: GenerationDetail
  /** Controlled open state (optional — the dialog self-manages otherwise). */
  open?: boolean
  /** Open-state change callback (optional). */
  onOpenChange?: (open: boolean) => void
  /** Start opened (uncontrolled). Handy for previews. */
  defaultOpen?: boolean
}

const DEMO_GENERATION: Required<Omit<GenerationDetail, 'poster'>> = {
  src: '/presets/how-product-works.png',
  mediaType: 'image',
  aspectRatio: 2 / 3,
  author: { name: 'retro_strawberry', role: 'Author' },
  status: 'Uploaded',
  fileType: 'JPG',
  size: '2.4 MB',
  uploadedAt: '12.05.2026, 01:22',
  lastUsedAt: '12.05.2026, 16:43',
  prompt: 'A model in a translucent floral raincoat standing beside pale horses in a windswept meadow, editorial fashion photography, soft daylight.',
}

/** A single "label ⋯ value" detail row. `value` may embed an icon/node. */
function DetailRow({ label, value }: { label: string, value: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Typography as="span" variant="body-sm-regular" className="shrink-0 text-q-transparent-light-50">
        {label}
      </Typography>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        {typeof value === 'string'
          ? (
              <Typography as="span" variant="body-sm-regular" color="primary" truncate className="text-right">
                {value}
              </Typography>
            )
          : value}
      </div>
    </div>
  )
}

function InfoPanel({ generation }: { generation: GenerationDetail }) {
  const [detailsOpen, setDetailsOpen] = useState(true)
  const data = { ...DEMO_GENERATION, ...generation, author: { ...DEMO_GENERATION.author, ...generation.author } }

  return (
    <aside className="flex h-full w-full flex-col gap-2 p-2">
      {/* Author row */}
      <div className="flex items-center gap-2 p-1">
        <Avatar size="sm" src={data.author?.avatarSrc} alt={data.author?.name} color="mint" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Typography as="span" variant="body-sm-medium" color="primary" truncate>
            {data.author?.name}
          </Typography>
          <Typography as="span" variant="caption-xs-regular" color="secondary" truncate>
            {data.author?.role ?? 'Author'}
          </Typography>
        </div>
        <Dialog.Close
          aria-label="Close"
          className="flex size-8 shrink-0 items-center justify-center rounded-q-full bg-q-transparent-light-05 text-q-icon-primary transition-colors hover:bg-q-transparent-light-10"
        >
          <Icon as={IconCrossMediumOutlined} size="md" />
        </Dialog.Close>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2 rounded-q-300 bg-q-transparent-light-05 p-2">
        <button
          type="button"
          onClick={() => setDetailsOpen(o => !o)}
          className="flex items-center gap-2 px-1 py-1.5"
          aria-expanded={detailsOpen}
        >
          <Icon as={IconCircleInfoOutlined} size="sm" color="secondary" />
          <Typography as="span" variant="label-xs-medium" color="secondary" className="flex-1 text-left uppercase">
            Details
          </Typography>
          <Icon
            as={IconChevronTopMediumOutlined}
            size="sm"
            color="secondary"
            className={detailsOpen ? undefined : 'rotate-180'}
          />
        </button>

        {detailsOpen
          ? (
              <>
                <div className="flex flex-col gap-1 rounded-q-200 bg-q-transparent-light-05 p-3">
                  <DetailRow
                    label="Status"
                    value={(
                      <>
                        <Icon as={IconCloudFilled} size="sm" color="secondary" />
                        <Typography as="span" variant="body-sm-regular" color="primary" truncate>
                          {data.status}
                        </Typography>
                      </>
                    )}
                  />
                  <DetailRow label="Type" value={data.fileType} />
                  <DetailRow label="Size" value={data.size} />
                  <DetailRow label="Uploaded" value={data.uploadedAt} />
                  <DetailRow label="Last used" value={data.lastUsedAt} />
                </div>

                <div className="flex flex-col gap-1 rounded-q-200 bg-q-transparent-light-05 p-3">
                  <Typography as="span" variant="body-sm-regular" className="text-q-transparent-light-50">
                    Prompt
                  </Typography>
                  <Typography as="p" variant="body-sm-regular" color="primary">
                    {data.prompt}
                  </Typography>
                </div>
              </>
            )
          : null}
      </div>

      <span aria-hidden className="flex-1" />

      {/* Actions */}
      <div className="flex flex-col gap-2 p-2">
        <Button
          variant="marketingPrimary"
          size="sm"
          className="w-full"
          start={<Icon as={IconVideoOutlined} size="sm" />}
        >
          Turn to video
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="marketingTertiary"
            size="sm"
            className="flex-1"
            start={<Icon as={IconDownloadOutlined} size="sm" />}
          >
            Download
          </Button>
          <Button variant="marketingTertiary" size="sm" iconOnly aria-label="Like" start={<Icon as={IconHeartOutlined} size="sm" />} />
          <Button variant="marketingTertiary" size="sm" iconOnly aria-label="Share" start={<Icon as={IconArrowShareRightOutlined} size="sm" />} />
          <Button variant="marketingTertiary" size="sm" iconOnly aria-label="More" start={<Icon as={IconDotGrid1x3HorizontalOutlined} size="sm" />} />
        </div>
      </div>
    </aside>
  )
}

export function GenerationDetailModal({ trigger, generation, open, onOpenChange, defaultOpen }: GenerationDetailModalProps) {
  const data = { ...DEMO_GENERATION, ...generation }

  // The stage frame takes the item's OWN aspect ratio and the media fills it
  // with `cover` — so the frame equals the image ratio and there are no
  // letterbox bars. The ratio-correct box is capped to the stage column by the
  // limiting axis: landscape/square is width-driven (q-media's default 100%
  // width), portrait is height-driven — either way max-h/max-w keep it inside
  // the column so it never overflows or slides under the info panel.
  const stageRatio = data.aspectRatio ?? 2 / 3
  const stageFrameClass = stageRatio >= 1
    ? 'max-h-full max-w-full shadow-q-overlay'
    : 'h-full max-h-full w-auto! max-w-full shadow-q-overlay'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="q-modal-backdrop" />
        <Dialog.Popup
          aria-label="Generation preview"
          className="fixed inset-0 z-q-modal flex outline-none transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
        >
          {/* Layer 1 — frosted media backdrop. A darker scrim (dark-80) + a heavy
            * backdrop blur so everything behind the crisp stage reads as a dark,
            * blurred frost. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-q-background-primary">
            <img src={data.src} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-q-transparent-dark-80" />
            <div className="absolute inset-0 backdrop-blur-3xl" />
          </div>

          {/* Layer 2 — crisp stage. min-h-0/min-w-0 + overflow-hidden keep the
            * media inside this flex column so it never bleeds under the panel;
            * the frame carries the item's aspect ratio and the media covers it
            * (no letterbox bars), capped to the column by max-h-full/max-w-full. */}
          <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-6">
            {data.mediaType === 'video'
              ? (
                  <Media ratio={stageRatio} rounded="md" className={stageFrameClass}>
                    <Media.Video src={data.src} poster={data.poster} autoPlayInView loop fit="cover" />
                  </Media>
                )
              : (
                  <Media ratio={stageRatio} rounded="md" className={stageFrameClass}>
                    <Media.Image src={data.src} alt="" fit="cover" />
                  </Media>
                )}
          </div>

          {/* Layer 3 — info panel */}
          <div className="relative flex w-[366px] shrink-0 p-2">
            <div className={glass({ blur: 'md', rounded: '500' }, 'flex min-h-0 flex-1 flex-col overflow-y-auto')}>
              <InfoPanel generation={generation ?? DEMO_GENERATION} />
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Standalone demo — renders its own trigger button so the viewer can be
 * previewed without touching shared templates. Import into `main.tsx`
 * temporarily, or drop anywhere for a visual check.
 */
export function GenerationDetailDemo() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-q-background-primary p-8">
      <GenerationDetailModal
        trigger={<Button variant="primary" size="md">Open generation</Button>}
      />
    </div>
  )
}

export default GenerationDetailDemo
