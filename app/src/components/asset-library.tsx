import type { ChangeEvent, ReactElement } from 'react'
import { useRef } from 'react'
import IconMagnifyingGlassOutlined from '@material-symbols/svg-400/outlined/search.svg?react'
import IconPlusMediumOutlined from '@material-symbols/svg-400/outlined/add.svg?react'
import { Avatar } from '@higgsfield/quanta/avatar'
import type { AvatarColor } from '@higgsfield/quanta/avatar'
import { Button } from '@higgsfield/quanta/button'
import { Icon } from '@higgsfield/quanta/icon'
import { Media } from '@higgsfield/quanta/media'
import { Modal } from '@higgsfield/quanta/modal'
import { Tabs } from '@higgsfield/quanta/tabs'
import { Typography } from '@higgsfield/quanta/typography'

/**
 * Asset Library modal — Figma SC App Builder "Share Modal" (node 2125:15262).
 * THE app-wide asset picker: EVERY "+" / upload / attach / add-media action in
 * every app opens this modal (never a custom picker). A glass modal with a tab
 * menu header (Uploads / Image Generations / …), a segmented "All | Personal"
 * toolbar with Search, and a 5-col element grid (New Element tile + media
 * cards). Quanta components + tokens only.
 *
 *   <AssetLibraryModal
 *     onSelect={item => setImage(item.src)}
 *     trigger={<Dropzone render={<button type="button" />} … />}
 *   />
 *
 * IMPORTANT: `trigger` is rendered AS the modal trigger (Base UI `render`
 * prop), so the element MUST spread incoming props (`onClick`, `ref`, aria)
 * onto a real DOM node — Quanta components and `@/components/*` all do. A
 * custom component that drops unknown props will silently not open the modal;
 * wrap it in a plain `<button type="button">` if needed. See
 * `@/components/AGENTS.md` for the full wiring contract.
 */

const THUMBS = [
  '/presets/how-product-works.png',
  '/presets/explain.png',
  '/presets/hyper-motion.png',
  '/presets/cover.png',
]

const HEADER_TABS = [
  { value: 'uploads', label: 'Uploads' },
  { value: 'image', label: 'Image Generations' },
  { value: 'video', label: 'Video Generations' },
  { value: 'liked', label: 'Liked' },
]

type ElementItem = {
  name: string
  type: string
  src: string
  badge?: string
  badgeColor?: AvatarColor
}

const ELEMENTS: ElementItem[] = [
  { name: '@Ultraviolet', type: 'Location', src: THUMBS[0], badge: 'T', badgeColor: 'pink' },
  { name: '@Ultraviolet', type: 'Character', src: THUMBS[1], badge: 'C', badgeColor: 'mint' },
  { name: '@Ultraviolet', type: 'Location', src: THUMBS[2] },
  { name: '@Ultraviolet', type: 'Location', src: THUMBS[3] },
  { name: '@Ultraviolet', type: 'Location', src: THUMBS[2], badge: 'G', badgeColor: 'mint' },
  { name: '@Ultraviolet', type: 'Location', src: THUMBS[1], badge: 'A', badgeColor: 'blue' },
  { name: '@Ultraviolet', type: 'Location', src: THUMBS[0] },
  { name: '@Ultraviolet', type: 'Location', src: THUMBS[0] },
  { name: '@Ultraviolet', type: 'Location', src: THUMBS[0] },
]

/* ── Toolbar ────────────────────────────────────────────────────────────────── */

function AssetToolbar() {
  return (
    <div className="flex shrink-0 items-center gap-2 bg-q-transparent-light-05 p-2">
      <div className="flex flex-1 items-center gap-2 px-1">
        <Tabs.Root variant="pill" defaultValue="all">
          <Tabs.List
            items={[
              { value: 'all', label: 'All' },
              { value: 'personal', label: 'Personal' },
            ]}
          />
        </Tabs.Root>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="tertiary" size="sm" start={<Icon as={IconMagnifyingGlassOutlined} size="sm" />}>
          Search
        </Button>
      </div>
    </div>
  )
}

/* ── Grid ───────────────────────────────────────────────────────────────────── */

function NewElementCard({ onSelect }: { onSelect?: (item: AssetSelection) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Hidden dismiss trigger so a picked file closes the modal via the SAME
  // Base UI Close path the grid cards use (we can't click the visible tile
  // to close because the file dialog resolves asynchronously in `onChange`).
  const closeRef = useRef<HTMLButtonElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file != null) {
      onSelect?.({ name: file.name, type: file.type || 'Upload', src: URL.createObjectURL(file) })
      closeRef.current?.click()
    }
    // Reset so picking the same file again still fires `onChange`.
    event.target.value = ''
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center gap-1.5 rounded-q-400 p-1"
      >
        <div className="flex h-24 w-full items-center justify-center rounded-q-300 border border-q-border-subtle bg-q-transparent-light-05">
          <span className="flex size-10 items-center justify-center rounded-q-full bg-q-transparent-light-05 shadow-q-raised-sm">
            <Icon as={IconPlusMediumOutlined} size="md" color="primary" />
          </span>
        </div>
        <div className="px-1 py-0.5">
          <Typography as="span" variant="caption-sm-semi-bold" color="primary">
            Upload
          </Typography>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <Modal.Close ref={closeRef} aria-hidden tabIndex={-1} className="hidden" />
    </>
  )
}

function ElementCard({ name, type, src, badge, badgeColor, onSelect }: ElementItem & { onSelect?: (item: AssetSelection) => void }) {
  const className = 'flex flex-col gap-1.5 rounded-q-400 p-1 text-left transition-colors hover:bg-q-transparent-light-05'
  const children = (
    <>
      <Media ratio="auto" rounded="md" className="h-24 w-full">
        <Media.Image src={src} alt={name} />
        {badge != null
          ? (
              <span className="absolute bottom-1.5 left-1.5 z-10">
                <Avatar size="xxs" color={badgeColor} alt={badge} />
              </span>
            )
          : null}
      </Media>
      <div className="flex flex-col gap-0.5 px-1 py-0.5">
        <Typography as="span" variant="caption-sm-semi-bold" color="primary" truncate>
          {name}
        </Typography>
        <Typography as="span" variant="caption-sm-regular" color="secondary" truncate>
          {type}
        </Typography>
      </div>
    </>
  )

  // With an `onSelect`, picking a card closes the modal and reports the choice;
  // without one it stays a passive tile (the original gallery behaviour).
  return onSelect != null
    ? (
        <Modal.Close className={className} onClick={() => onSelect({ name, type, src })}>
          {children}
        </Modal.Close>
      )
    : (
        <button type="button" className={className}>
          {children}
        </button>
      )
}

function AssetGrid({ onSelect }: { onSelect?: (item: AssetSelection) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-q-transparent-light-05 p-2">
      <div className="grid grid-cols-5 gap-3">
        <NewElementCard onSelect={onSelect} />
        {ELEMENTS.map((item, index) => (
          <ElementCard key={`${item.name}-${index}`} {...item} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

/* ── Modal ──────────────────────────────────────────────────────────────────── */

/** A picked library element, reported by `AssetLibraryModal.onSelect`. */
export interface AssetSelection {
  name: string
  type: string
  src: string
}

export interface AssetLibraryModalProps {
  /** The trigger element (e.g. a Composer.Action). Rendered as the Modal trigger. */
  trigger: ReactElement
  /** Fired with the chosen element when a grid card is picked (closes the modal). */
  onSelect?: (item: AssetSelection) => void
}

export function AssetLibraryModal({ trigger, onSelect }: AssetLibraryModalProps) {
  return (
    <Modal.Root>
      <Modal.Trigger render={trigger} />
      <Modal.Content size="xl">
        <Modal.Header flush className="px-2 py-1">
          <Tabs.Root variant="pill" defaultValue="uploads" className="flex-1">
            <Tabs.List items={HEADER_TABS} />
          </Tabs.Root>
          <Modal.CloseButton />
        </Modal.Header>

        <div className="flex h-[595px] flex-col gap-px overflow-clip rounded-q-400">
          <AssetToolbar />
          <AssetGrid onSelect={onSelect} />
        </div>
      </Modal.Content>
    </Modal.Root>
  )
}
