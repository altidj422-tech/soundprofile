'use client'

import type { ComponentPropsWithRef, ReactElement, ReactNode, Ref } from 'react'
import { useRender } from '@base-ui/react/use-render'
import IconCloseOutlined from '@material-symbols/svg-400/outlined/close.svg?react'
import { Icon, type IconGlyph } from '@higgsfield/quanta/icon'
import { Media } from '@higgsfield/quanta/media'
import { Typography } from '@higgsfield/quanta/typography'
import { cn } from '@/lib/utils'

/**
 * UploadField — the rail-style upload field (Figma SC App Builder "Media upload",
 * node 3322:51742 → the `image-field`). THE upload field for creation rails /
 * input panels (e.g. the `InputPanel` in `src/layouts/preset.tsx`): a rail-width,
 * bordered tile whose empty state is an icon-in-a-rounded-chip over a bold title +
 * muted description, and whose filled state is a white-ringed media preview with a
 * floating remove (X) button. Quanta primitives (`Icon`, `Media`, `Typography`) +
 * `q-` tokens only.
 *
 * This is DISTINCT from `@/components/dropzone` (the app-detail hero tile — bare
 * icon, small centered preview, no remove). Use `UploadField` for the rail; use
 * `Dropzone` for the app-detail generator hero.
 *
 * Like every upload surface in the template, the field is ONLY the trigger UI — it
 * must open `AssetLibraryModal` from `@/components/asset-library` (never a custom
 * picker). Pass the empty field as the modal `trigger`, and render the filled
 * field with `preview` + `onRemove` once an asset is picked:
 *
 * ```tsx
 * import { AssetLibraryModal } from '@/components/asset-library'
 * import { UploadField } from '@/components/upload-field'
 * import IconImageOutlined from '@material-symbols/svg-400/outlined/image.svg?react'
 *
 * const [asset, setAsset] = useState<{ src: string, name: string } | null>(null)
 *
 * {asset == null
 *   ? (
 *       <AssetLibraryModal
 *         onSelect={item => setAsset(item)}
 *         trigger={(
 *           <UploadField
 *             render={<button type="button" />}
 *             icon={IconImageOutlined}
 *             title="Upload a reference"
 *             subtitle="PNG or JPG, up to 20MB"
 *           />
 *         )}
 *       />
 *     )
 *   : (
 *       <UploadField
 *         preview={asset.src}
 *         previewAlt={asset.name}
 *         onRemove={() => setAsset(null)}
 *       />
 *     )}
 * ```
 *
 * `border` picks the outline: `dashed` (the primary upload target, default) or
 * `solid` (a secondary picker). The host swaps via `render` — keep the default
 * `<div>` for the passive filled tile, or render a `<button>` for the empty
 * trigger (it gains hover + focus affordances from the classes).
 *
 * Effects are pixel-matched to Figma: the field glass surface + sheen (field
 * node 3313:51351) and the icon chip's border / dual drop shadow / inner glow
 * (chip node 3313:51410). Those shadow values have no exact `q-` token, so they
 * are kept as literal values; every color / radius / spacing uses `q-` tokens.
 */

export type UploadFieldBorder = 'dashed' | 'solid'

const BORDER_CLASS = {
  dashed: 'border-dashed',
  solid: 'border-solid',
} satisfies Record<UploadFieldBorder, string>

export type UploadFieldProps = Omit<ComponentPropsWithRef<'div'>, 'title'> & {
  /** Leading glyph shown in the rounded chip above the text (empty state). */
  icon?: IconGlyph
  /** Bold primary line (empty state). */
  title?: ReactNode
  /** Muted helper line under the title (empty state). */
  subtitle?: ReactNode
  /** Outline style — `dashed` upload target (default) or `solid` picker. */
  border?: UploadFieldBorder
  /**
   * Filled state. Pass a picked image `src` (rendered as a white-ringed `Media`
   * preview) or a custom node. When set, the icon / title / subtitle empty state
   * is replaced by the preview.
   */
  preview?: ReactNode
  /** Alt text for the string `preview` image. */
  previewAlt?: string
  /**
   * Show the floating remove (X) button over the filled tile. Fired when it is
   * clicked. Only rendered together with `preview`.
   */
  onRemove?: () => void
  /** Swap the host element (e.g. an interactive `<button>` for the modal trigger). */
  render?: ReactElement
}

export function UploadField({
  icon,
  title,
  subtitle,
  border = 'dashed',
  preview,
  previewAlt = '',
  onRemove,
  className,
  render,
  ref,
  ...props
}: UploadFieldProps) {
  const interactive = render != null
  const filled = preview != null

  const previewNode = typeof preview === 'string'
    ? (
        <div className="overflow-hidden rounded-q-300 border-2 border-white shadow-q-raised">
          <Media ratio="video" rounded="none" className="w-44 max-w-full">
            <Media.Image src={preview} alt={previewAlt} />
          </Media>
        </div>
      )
    : preview

  return useRender({
    render,
    defaultTagName: 'div',
    ref: ref as Ref<Element> | undefined,
    props: {
      className: cn(
        // Figma field 3313:51351: 1.5px white-10% outline, white-10% glass +
        // 12px backdrop blur, radius/400, drop shadow + inner sheen.
        'relative flex min-h-36 flex-1 flex-col items-center justify-center gap-3 rounded-q-400 border-[1.5px] border-q-border-default bg-q-transparent-light-10 px-4 pt-6 pb-5 text-center backdrop-blur-md transition-colors shadow-[0px_2px_4px_-0.5px_rgba(0,0,0,0.12),inset_0px_2px_3px_0px_rgba(255,255,255,0.05)]',
        BORDER_CLASS[border],
        interactive && 'cursor-pointer hover:border-q-border-strong hover:bg-q-transparent-light-15 focus-visible:outline-2 focus-visible:outline-q-border-focus',
        className,
      ),
      children: filled
        ? (
            <>
              {previewNode}
              {onRemove != null
                ? (
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={onRemove}
                      className="absolute top-2 right-2 flex items-center justify-center rounded-q-200 bg-q-transparent-dark-40 p-1.5 backdrop-blur-md transition-colors hover:bg-q-transparent-dark-60 focus-visible:outline-2 focus-visible:outline-q-border-focus"
                    >
                      <Icon as={IconCloseOutlined} size="sm" color="primary" />
                    </button>
                  )
                : null}
            </>
          )
        : (
            <>
              {icon != null
                ? (
                    // Figma icon chip 3313:51410: white-5% fill, #c5c5c5-30% ring,
                    // dual drop shadow + inner bottom glow, full-round.
                    <span className="flex items-center justify-center rounded-q-full border border-[#c5c5c54d] bg-q-transparent-light-05 p-2.5 shadow-[0px_20.533px_10.266px_0px_rgba(0,0,0,0.09),0px_5.059px_5.654px_0px_rgba(0,0,0,0.1),inset_0px_-0.298px_5.356px_0px_rgba(185,185,185,0.35)]">
                      <Icon as={icon} size="md" color="primary" />
                    </span>
                  )
                : null}
              <div className="flex flex-col items-center gap-1">
                {title != null
                  ? (
                      <Typography as="span" variant="body-md-medium" color="primary">
                        {title}
                      </Typography>
                    )
                  : null}
                {subtitle != null
                  ? (
                      <Typography as="span" variant="body-sm-medium" color="secondary">
                        {subtitle}
                      </Typography>
                    )
                  : null}
              </div>
            </>
          ),
      ...props,
    },
  })
}
