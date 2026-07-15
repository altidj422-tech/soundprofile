import type { ComponentProps, ReactNode } from 'react'
import { useState } from 'react'
import Icon3dBoxTopOutlined from '@material-symbols/svg-400/outlined/deployed_code.svg?react'
import IconBucketOutlined from '@material-symbols/svg-400/outlined/format_color_fill.svg?react'
import IconChainLink3Outlined from '@material-symbols/svg-400/outlined/link.svg?react'
import IconChevronDownSmallOutlined from '@material-symbols/svg-400/outlined/keyboard_arrow_down.svg?react'
import IconDiamondFilled from '@material-symbols/svg-400/outlined/diamond.svg?react'
import IconHomeFilled from '@material-symbols/svg-400/outlined/home.svg?react'
import IconImages1Outlined from '@material-symbols/svg-400/outlined/photo_library.svg?react'
import IconImagesSparkleOutlined from '@material-symbols/svg-400/outlined/auto_awesome_mosaic.svg?react'
import IconPeopleOutlined from '@material-symbols/svg-400/outlined/group.svg?react'
import IconPlusMediumOutlined from '@material-symbols/svg-400/outlined/add.svg?react'
import IconSettingsSliderHorOutlined from '@material-symbols/svg-400/outlined/tune.svg?react'
import IconSidebarHiddenLeftWideOutlined from '@material-symbols/svg-400/outlined/left_panel_close.svg?react'
import IconSparklesTwo2Filled from '@material-symbols/svg-400/outlined/star_shine.svg?react'
import IconTiktokOutlined from '@material-symbols/svg-400/outlined/music_note.svg?react'
import IconWorldOutlined from '@material-symbols/svg-400/outlined/public.svg?react'
import { Icon } from '@higgsfield/quanta/icon'
import { IconTile } from '@/components/icon-tile'
import { Media } from '@higgsfield/quanta/media'
import { PromptBox } from '@/components/prompt-box'
import { Select } from '@higgsfield/quanta/select'
import { Sidebar } from '@higgsfield/quanta/sidebar'
import { Tabs } from '@higgsfield/quanta/tabs'
import { Typography } from '@higgsfield/quanta/typography'
import { AssetLibraryModal } from '@/components/asset-library'
import { TEMPLATES, TemplateCard, TemplatePickerModal } from '@/components/template-picker'

/**
 * "Marketing Studio" screen template — Figma Marketing-Studio (node 7137:108784,
 * before-generation) and Cinema-Studio-V4 (node 21768:60756, after-generation).
 *
 * A product navigation rail (Quanta `Sidebar`) beside a canvas that switches
 * between two states:
 *   • before — a centered marketing hero + the `PromptBox` dock (the NEW Quanta
 *     component) whose settings all open as dropdowns (`Select` + `size="picker"`),
 *     over a 2-column gallery of `TemplateCard`s.
 *   • after  — the generated media grid with the same `StudioPromptBox` on the
 *     glass surface, floating in a dock pinned to the bottom.
 *
 * The prompt box's settings-slider control opens the full `TemplatePickerModal`.
 * A small top-right switch flips between the two states for preview. Quanta
 * components + tokens only.
 */

const COVERS = [
  '/presets/how-product-works.png',
  '/presets/explain.png',
  '/presets/hyper-motion.png',
  '/presets/cover.png',
] as const

/* ── Prompt-box setting dropdowns (the "all settings open as dropdowns" rule) ── */

const PICKER_POPUP = {
  size: 'picker',
  surface: 'solid',
  side: 'bottom',
  align: 'start',
  sideOffset: 8,
  collisionPadding: 16,
} satisfies Partial<Parameters<typeof Select.Content>[0]>

const FORMATS = [
  { value: 'ugc', title: 'UGC', subtitle: 'Creator-style, handheld' },
  { value: 'tiktok', title: 'TikTok', subtitle: 'Fast-cut vertical' },
  { value: 'reels', title: 'Reels', subtitle: 'Instagram vertical' },
  { value: 'commercial', title: 'Commercial', subtitle: 'Polished brand film' },
]

const HOOKS = [
  { value: 'hook', title: 'Hook' },
  { value: 'story', title: 'Story' },
  { value: 'demo', title: 'Product demo' },
  { value: 'testimonial', title: 'Testimonial' },
]

/** A prompt-box pill that opens a compact builder picker (Select, size="picker"). */
function PillSelect({
  defaultValue,
  options,
  start,
  hidden = false,
}: {
  defaultValue: string
  options: { value: string, title: string, subtitle?: string }[]
  start?: ReactNode
  hidden?: boolean
}) {
  if (hidden) return null
  return (
    <Select.Root defaultValue={defaultValue}>
      <Select.Trigger
        bare
        render={(
          <PromptBox.Pill
            start={start}
            end={<Icon as={IconChevronDownSmallOutlined} size="sm" />}
          />
        )}
      >
        <Select.Value>
          {(value: string) => options.find(option => option.value === value)?.title ?? value}
        </Select.Value>
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {options.map(option => (
          <Select.Item key={option.value} value={option.value}>
            {option.subtitle != null
              ? (
                  <Select.ItemContent>
                    <Select.ItemText>{option.title}</Select.ItemText>
                    <Select.ItemDescription>{option.subtitle}</Select.ItemDescription>
                  </Select.ItemContent>
                )
              : <Select.ItemText>{option.title}</Select.ItemText>}
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

/* ── Sidebar (shared by both states) ───────────────────────────────────────── */

function StudioSidebar() {
  return (
    <Sidebar.Root product="marketing-studio" flush>
      <Sidebar.Header>
        <Sidebar.Switcher>
          <Sidebar.Logo>
            <span className="flex size-6 items-center justify-center rounded-q-200 bg-q-brand-primary text-q-text-inverse">
              <Icon as={IconSparklesTwo2Filled} size="sm" />
            </span>
          </Sidebar.Logo>
          <Sidebar.Title>Marketing Studio</Sidebar.Title>
        </Sidebar.Switcher>
        <Sidebar.Toggle><Icon as={IconSidebarHiddenLeftWideOutlined} size="md" /></Sidebar.Toggle>
      </Sidebar.Header>

      <Sidebar.Body>
        <Sidebar.Section>
          <Sidebar.SectionItems>
            <Sidebar.Item selected start={<IconTile as={IconHomeFilled} gradient="blue" />} title="Home" />
            <Sidebar.Item start={<IconTile as={IconImages1Outlined} gradient="teal" />} title="All Generations" />
          </Sidebar.SectionItems>
        </Sidebar.Section>

        <Sidebar.Section>
          <Sidebar.SectionHeader>
            <Sidebar.SectionTitle>Tools</Sidebar.SectionTitle>
          </Sidebar.SectionHeader>
          <Sidebar.SectionItems>
            <Sidebar.Item start={<IconTile as={IconChainLink3Outlined} gradient="blue" />} title="Url to Ad" />
            <Sidebar.Item start={<IconTile as={IconImagesSparkleOutlined} gradient="teal" />} title="Ad Reference" />
            <Sidebar.Item start={<IconTile as={IconTiktokOutlined} gradient="blue" />} title="Manage TikTok" />
          </Sidebar.SectionItems>
        </Sidebar.Section>

        <Sidebar.Section>
          <Sidebar.SectionHeader>
            <Sidebar.SectionTitle>Projects</Sidebar.SectionTitle>
            <Sidebar.SectionActions>
              <Sidebar.ActionButton aria-label="New project"><Icon as={IconPlusMediumOutlined} size="md" /></Sidebar.ActionButton>
            </Sidebar.SectionActions>
          </Sidebar.SectionHeader>
          <Sidebar.SectionItems>
            <Sidebar.Item variant="project" start={<Sidebar.ProjectThumbnail src={COVERS[0]} />} title="Aurora Labs" meta="221" />
            <Sidebar.Item variant="project" start={<Sidebar.ProjectThumbnail src={COVERS[1]} />} title="Pixel Forge" meta="18" onPinChange={() => {}} pinned />
            <Sidebar.Item variant="project" start={<Sidebar.ProjectThumbnail src={COVERS[2]} />} title="Blue Horizon" meta="484" />
            <Sidebar.Item variant="project" start={<Sidebar.ProjectThumbnail src={COVERS[3]} />} title="Nova" meta="156" />
            <Sidebar.Item variant="project" start={<Sidebar.ProjectThumbnail src={COVERS[0]} />} title="Motion Studio" meta="44" />
            <Sidebar.Item variant="project" start={<Sidebar.ProjectThumbnail src={COVERS[1]} />} title="Alpha" meta="449" />
            <Sidebar.Item variant="project" start={<Sidebar.ProjectThumbnail src={COVERS[2]} />} title="Quantum Works" meta="1 234" />
          </Sidebar.SectionItems>
        </Sidebar.Section>
      </Sidebar.Body>

      <Sidebar.Footer>
        <Sidebar.FooterItem variant="promo" start={<Icon as={IconDiamondFilled} size="md" />} title="Pricing" end={<Sidebar.PromoBadge />} />
        <Sidebar.FooterItem variant="login" start={<Icon as={IconPeopleOutlined} size="md" />} title="Login" />
      </Sidebar.Footer>
    </Sidebar.Root>
  )
}

/* ── The prompt box (before-generation, centered/solid) ────────────────────── */

/** Which inline setting controls the prompt box footer shows. */
export interface StudioPromptSettings {
  /** The "+" add-media pill. */
  add?: boolean
  /** The UGC format dropdown. */
  format?: boolean
  /** The Hook dropdown. */
  hook?: boolean
  /** The sliders/settings pill (opens the template picker). */
  tune?: boolean
}

export interface StudioPromptBoxProps {
  /** Show the Product/App generation-mode toggle rail. */
  showModeToggle?: boolean
  /** Show the Product reference upload tile. */
  showProductTile?: boolean
  /** Show the Avatar reference upload tile. */
  showAvatarTile?: boolean
  /** Toggle individual inline setting controls (each defaults on). */
  settings?: StudioPromptSettings
  /** PromptBox surface — `glass` for the floating after-state dock. */
  surface?: ComponentProps<typeof PromptBox.Root>['surface']
  /** Root-pane classes (width / pointer-events); replaces the default width. */
  className?: string
}

/**
 * Studio prompt dock (Figma Marketing-Studio 7259:51362) — a configured
 * composition of the Quanta `PromptBox` parts. Every region is prop-driven and
 * optional: the Product/App toggle, each reference tile, and each inline setting
 * can be switched off independently. Defaults render the full before-state.
 */
function StudioPromptBox({
  showModeToggle = true,
  showProductTile = true,
  showAvatarTile = true,
  settings,
  surface,
  className = 'w-[830px] max-w-full',
}: StudioPromptBoxProps = {}) {
  const { add = true, format = true, hook = true, tune = true } = settings ?? {}
  const [mode, setMode] = useState<'product' | 'app'>('product')

  return (
    <PromptBox.Root surface={surface} className={className}>
      <PromptBox.ModeRail hidden={!showModeToggle}>
        <PromptBox.Mode active={mode === 'product'} onClick={() => setMode('product')} start={<Icon as={Icon3dBoxTopOutlined} size="md" />}>Product</PromptBox.Mode>
        <PromptBox.Mode active={mode === 'app'} onClick={() => setMode('app')} start={<Icon as={IconWorldOutlined} size="md" />}>App</PromptBox.Mode>
      </PromptBox.ModeRail>

      <PromptBox.Body>
        <PromptBox.Field placeholder="Describe the scene you imagine..." aria-label="Describe the scene you imagine" />
        <PromptBox.Actions>
          {add
            ? (
                <AssetLibraryModal
                  trigger={(
                    <PromptBox.Pill iconOnly aria-label="Add media" start={<Icon as={IconPlusMediumOutlined} size="sm" />} />
                  )}
                />
              )
            : null}
          <PillSelect hidden={!format} start={<Icon as={IconBucketOutlined} size="sm" />} defaultValue="ugc" options={FORMATS} />
          <PillSelect hidden={!hook} start={<Icon as={IconBucketOutlined} size="sm" />} defaultValue="hook" options={HOOKS} />
          {tune
            ? (
                <TemplatePickerModal
                  trigger={(
                    <PromptBox.Pill iconOnly aria-label="Template settings" start={<Icon as={IconSettingsSliderHorOutlined} size="sm" />} />
                  )}
                />
              )
            : null}
        </PromptBox.Actions>
      </PromptBox.Body>

      <PromptBox.Uploads hidden={!showProductTile && !showAvatarTile}>
        <PromptBox.Upload hidden={!showProductTile} label="Product" />
        <PromptBox.Upload hidden={!showAvatarTile} label="Avatar" />
      </PromptBox.Uploads>

      <PromptBox.Generate cost={3} oldCost={12} />
    </PromptBox.Root>
  )
}

const HERO_GLOW =
  'radial-gradient(60% 80% at 50% 0%, rgba(209,254,23,0.10) 0%, rgba(209,254,23,0.03) 40%, transparent 70%)'

const GALLERY_TABS = [
  { value: 'all', label: 'All' },
  { value: 'tiktok', label: 'TikTok', start: <Icon size="sm" as={IconTiktokOutlined} /> },
  { value: 'ugc', label: 'UGC' },
  { value: 'commercial', label: 'Commercial' },
]

/** Before-generation canvas: hero → prompt box → template gallery. */
function BeforeState() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[600px]" style={{ backgroundImage: HERO_GLOW }} />

      <div className="relative flex w-full flex-col items-center gap-12 px-6 pb-16 pt-16">
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <Typography as="span" variant="accent-xs-bold" color="secondary" className="text-[1rem]! leading-[1.25rem]! uppercase opacity-60">
              Marketing Studio
            </Typography>
            <Typography as="h1" variant="headline-lg-bold" color="primary" className="max-w-[420px] text-center uppercase">
              Turn any product into a video ad
            </Typography>
          </div>
          <StudioPromptBox />
        </div>

        <div className="flex w-full max-w-[900px] flex-col items-center gap-5">
          <Tabs.Root variant="pill" defaultValue="all">
            <Tabs.List items={GALLERY_TABS} />
          </Tabs.Root>
          <div className="grid w-full grid-cols-2 gap-5">
            {TEMPLATES.map(template => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── After-generation state (Cinema Studio V4) ─────────────────────────────── */

const RESULTS: { src: string, alt: string, ratio: number }[] = [
  { src: COVERS[3], alt: 'Portrait in a corridor', ratio: 3 / 4 },
  { src: COVERS[0], alt: 'Street at dusk', ratio: 3 / 4 },
  { src: COVERS[1], alt: 'Concrete stairwell', ratio: 3 / 4 },
  { src: COVERS[2], alt: 'Neon portrait', ratio: 3 / 4 },
  { src: COVERS[3], alt: 'Studio portrait', ratio: 3 / 4 },
  { src: COVERS[1], alt: 'Waterfront', ratio: 3 / 4 },
  { src: COVERS[2], alt: 'Iced coffees', ratio: 3 / 4 },
  { src: COVERS[0], alt: 'Fur hat portrait', ratio: 3 / 4 },
  { src: COVERS[3], alt: 'Window light', ratio: 3 / 4 },
  { src: COVERS[1], alt: 'Cyclist in a suit', ratio: 3 / 4 },
]

/**
 * The floating bottom-center generation dock — the SAME `StudioPromptBox` as
 * the before-state (mode rail, prompt field, add/format/hook/tune pills,
 * upload tiles, Generate), on the glass surface, pinned to the bottom.
 */
function AfterPromptDock() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
      <StudioPromptBox surface="glass" className="pointer-events-auto w-[900px] max-w-full border-none" />
    </div>
  )
}

const AFTER_TABS = [
  { value: 'history', label: 'History', start: <Icon size="sm" as={IconImages1Outlined} /> },
  { value: 'community', label: 'Community', start: <Icon size="sm" as={IconWorldOutlined} /> },
]

function AfterState() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between p-4">
        <Tabs.Root variant="pill" defaultValue="history">
          <Tabs.List items={AFTER_TABS} />
        </Tabs.Root>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-40">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {RESULTS.map((item, index) => (
            <Media key={index} ratio={item.ratio} rounded="md" className="w-full">
              <Media.Image src={item.src} alt={item.alt} />
            </Media>
          ))}
        </div>
      </div>

      <AfterPromptDock />
    </div>
  )
}

/* ── Root template + preview switch ────────────────────────────────────────── */

export type StudioState = 'before' | 'after'

export interface StudioTemplateProps {
  /** Which canvas to show. Uncontrolled preview switch drives it when omitted. */
  state?: StudioState
}

const STATE_TABS = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
]

/** Fixed top-right switch to preview both Studio states without extra routing. */
function StateSwitch({ value, onChange }: { value: StudioState, onChange: (next: StudioState) => void }) {
  return (
    <div className="fixed right-4 top-3 z-50">
      <Tabs.Root variant="segmented" value={value} onValueChange={v => onChange(v as StudioState)}>
        <Tabs.List items={STATE_TABS} />
      </Tabs.Root>
    </div>
  )
}

export function StudioTemplate({ state }: StudioTemplateProps) {
  const [internal, setInternal] = useState<StudioState>('before')
  const active = state ?? internal
  const canvas: ReactNode = active === 'before' ? <BeforeState /> : <AfterState />

  return (
    <div className="flex h-dvh overflow-hidden bg-q-background-primary">
      <StudioSidebar />
      <main className="relative flex min-w-0 flex-1 flex-col">
        {canvas}
      </main>
      {state == null ? <StateSwitch value={active} onChange={setInternal} /> : null}
    </div>
  )
}
