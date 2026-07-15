import type { ReactNode } from 'react'
import { useState } from 'react'
import IconChainLink3Outlined from '@material-symbols/svg-400/outlined/link.svg?react'
import IconFolder1Outlined from '@material-symbols/svg-400/outlined/folder.svg?react'
import IconMagicBookOutlined from '@material-symbols/svg-400/outlined/auto_stories.svg?react'
import IconImageOutlined from '@material-symbols/svg-400/outlined/image.svg?react'
import IconMagnifyingGlassOutlined from '@material-symbols/svg-400/outlined/search.svg?react'
import IconNewspaper2Outlined from '@material-symbols/svg-400/outlined/newspaper.svg?react'
import IconPencilOutlined from '@material-symbols/svg-400/outlined/edit.svg?react'
import IconPlusLargeOutlined from '@material-symbols/svg-400/outlined/add.svg?react'
import Sparkles from '@/assets/icon-sparkles-soft.svg?react'
import { Button } from '@higgsfield/quanta/button'
import { Card, card } from '@higgsfield/quanta/card'
import { Composer } from '@/components/composer'
import { Grid } from '@higgsfield/quanta/grid'
import { Icon } from '@higgsfield/quanta/icon'
import { Input } from '@higgsfield/quanta/input'
import { Media } from '@higgsfield/quanta/media'
import { MediaCard } from '@/components/media-card'
import { RailFooter } from '@/components/rail-footer'
import { Select } from '@higgsfield/quanta/select'
import { SettingTrigger } from '@/components/setting-trigger'
import { Tabs } from '@higgsfield/quanta/tabs'
import { Typography } from '@higgsfield/quanta/typography'
import { AssetLibraryModal } from '@/components/asset-library'
import type { AssetSelection } from '@/components/asset-library'
import { UploadField } from '@/components/upload-field'
import { HistoryGrid } from '@/components/history-grid'
import type { TemplateOption } from '@/components/template-modal'
import { TemplateModal } from '@/components/template-modal'

/**
 * Preset app screen template (modeled on the Higgsfield SC App Builder /
 * Main, node 2950:66563). A builder shell: the input panel on the left (cover
 * picker, prompt composer, voice / aspect-ratio / duration setting rows,
 * marketing Generate CTA) and the preset gallery on the right (segmented
 * tabs, search, 3-col media grid). Quanta components + tokens only.
 */

const PRESETS = [
  { title: 'How product works', src: '/presets/how-product-works.png' },
  { title: 'Explain', src: '/presets/explain.png' },
  { title: 'History', src: '/presets/hyper-motion.png' },
  ...Array.from({ length: 9 }, () => ({ title: 'Hyper motion', src: '/presets/hyper-motion.png' })),
]

/** The same presets, shaped for the `TemplateModal` cover picker. */
const PRESET_OPTIONS: TemplateOption[] = PRESETS.map((preset, index) => ({
  id: `${preset.title}-${index}`,
  label: preset.title,
  image: preset.src,
}))

/** Default cover shown before a preset is picked. */
const DEFAULT_COVER = { src: '/presets/cover.png', title: 'How product works' }

/** "How it works in 3 steps" content — the explainer behind the third tab. */
const STEPS: { title: string, description: string, preview: ReactNode }[] = [
  {
    title: 'Pick a preset',
    description: 'Browse the gallery and choose a preset that matches the video you want to make.',
    preview: (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-q-300 border border-dashed border-q-border-subtle px-8">
        <Icon as={IconMagicBookOutlined} size="md" color="secondary" />
        <div className="flex flex-col items-center gap-1 text-center">
          <Typography as="span" variant="body-sm-semi-bold" color="primary" className="uppercase">
            Browse presets
          </Typography>
          <Typography as="span" variant="caption-xs-regular" color="secondary">
            Explain, Hyper motion, and more
          </Typography>
        </div>
      </div>
    ),
  },
  {
    title: 'Add your topic & generate',
    description: 'Type what the video should explain, set voice and duration, then press Generate.',
    preview: (
      <div className="flex h-full items-center justify-center">
        <Button variant="marketingPrimary" size="lg" start={<Sparkles width={18} height={18} />}>
          Generate
        </Button>
      </div>
    ),
  },
  {
    title: 'Get your result',
    description: 'Your video is ready! Preview it, then download and share the final result.',
    preview: (
      <div className="flex h-full items-center justify-center p-6">
        <Media ratio={16 / 9} rounded="md" className="h-full w-auto max-w-full">
          <Media.Image src="/presets/explain.png" alt="Generated result preview" />
        </Media>
      </div>
    ),
  },
]

const VOICES = ['Cillian', 'Nova', 'Atlas', 'Vera']

const DURATIONS = [
  { value: '20s', title: '20 seconds' },
  { value: '30s', title: '30 seconds' },
  { value: '1m', title: '1 minute' },
  { value: '3m', title: '3 minutes' },
  { value: '5m', title: '5 minutes' },
  { value: '10m', title: '10 minutes' },
  { value: 'manual', title: 'Manual', subtitle: 'Choose duration manually' },
]

const RATIOS = [
  { value: '16:9', title: '16:9', subtitle: 'Horizontal' },
  { value: '9:16', title: '9:16', subtitle: 'Vertical' },
]

/** Shared popup placement for the rail pickers — opens into the canvas. */
const PICKER_POPUP = {
  size: 'picker',
  surface: 'solid',
  side: 'right',
  align: 'start',
  sideOffset: 8,
  collisionPadding: 16,
} satisfies Partial<Parameters<typeof Select.Content>[0]>

/** Voice picker — single-line options behind the Voice setting row. */
function VoiceSelect() {
  return (
    <Select.Root>
      <Select.Trigger bare render={<SettingTrigger label="Voice" />}>
        <Select.Value placeholder="Select voice" />
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {VOICES.map(voice => (
          <Select.Item key={voice} value={voice}>
            <Select.ItemText>{voice}</Select.ItemText>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

/** Aspect-ratio picker — two-line options (16:9 Horizontal / 9:16 Vertical). */
function AspectRatioSelect() {
  return (
    <Select.Root defaultValue="16:9">
      <Select.Trigger bare render={<SettingTrigger label="Aspect Ratio" />}>
        <Select.Value placeholder="Select ratio" />
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {RATIOS.map(ratio => (
          <Select.Item key={ratio.value} value={ratio.value}>
            <Select.ItemContent>
              <Select.ItemText>{ratio.title}</Select.ItemText>
              <Select.ItemDescription>{ratio.subtitle}</Select.ItemDescription>
            </Select.ItemContent>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

/** Duration picker — the trigger echoes the short value ("1m"), rows the full title. */
function DurationSelect() {
  return (
    <Select.Root defaultValue="1m">
      <Select.Trigger bare render={<SettingTrigger label="Duration" />}>
        <Select.Value placeholder="Select duration">
          {(value: string) => (value === 'manual' ? 'Manual' : value)}
        </Select.Value>
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {DURATIONS.map(duration => (
          <Select.Item key={duration.value} value={duration.value}>
            {duration.subtitle != null
              ? (
                  <Select.ItemContent>
                    <Select.ItemText>{duration.title}</Select.ItemText>
                    <Select.ItemDescription>{duration.subtitle}</Select.ItemDescription>
                  </Select.ItemContent>
                )
              : <Select.ItemText>{duration.title}</Select.ItemText>}
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

/** Left rail — cover picker, prompt composer, setting rows, Generate CTA. */
function InputPanel() {
  // The cover reflects the preset chosen in the TemplateModal picker.
  const [preset, setPreset] = useState<TemplateOption | null>(null)
  const coverSrc = preset?.image ?? DEFAULT_COVER.src
  const coverTitle = preset?.label ?? DEFAULT_COVER.title

  // The optional reference image, picked from the shared AssetLibraryModal.
  const [reference, setReference] = useState<AssetSelection | null>(null)

  return (
    <aside
      className={card(
        { surface: 'solid', elevation: 'raised' },
        // Figma input rail: 342px = spacing scale × 85.5. Stretch to the viewport
        // height and scroll internally so the sticky RailFooter can pin the
        // Generate CTA when the chosen fields overflow.
        'w-85.5 shrink-0 gap-3 overflow-y-auto border-q-thin border-q-border-subtle p-3',
      )}
    >
      <div className="flex items-center px-2 py-0.5">
        <Typography as="h1" variant="accent-sm-bold" color="brand" className="uppercase">
          Preset Studio
        </Typography>
      </div>

      <TemplateModal
        title="Choose a preset"
        options={PRESET_OPTIONS}
        value={preset?.id}
        onSelect={setPreset}
        trigger={(
          <MediaCard
            render={<button type="button" />}
            ratio="auto"
            frame="thin"
            scrim={false}
            titleVariant="accent"
            className="h-40 shrink-0"
            src={coverSrc}
            alt="Selected preset cover"
            title={coverTitle}
            action={(
              // Passive chip (not a button) — the whole cover is the modal trigger.
              <span className="q-media-card-action">
                Change
                <Icon size="sm" as={IconPencilOutlined} />
              </span>
            )}
          />
        )}
      />

      <Composer
        label="What should the video explain?"
        placeholder="Type a topic, or attach files below"
        actions={
          <>
            <AssetLibraryModal
              trigger={
                <Composer.Action start={<Icon size="sm" as={IconPlusLargeOutlined} />}>
                  Attach files
                </Composer.Action>
              }
            />
            <Composer.Action start={<Icon size="sm" as={IconChainLink3Outlined} />}>
              Link
            </Composer.Action>
          </>
        }
      />

      {/* Reference-image upload — an UploadField that opens the shared
          AssetLibraryModal; picking an asset switches it to the filled state. */}
      {reference == null
        ? (
            <AssetLibraryModal
              onSelect={setReference}
              trigger={(
                <UploadField
                  render={<button type="button" />}
                  icon={IconImageOutlined}
                  title="Add a reference image"
                  subtitle="PNG or JPG, up to 20MB"
                />
              )}
            />
          )
        : (
            <UploadField
              preview={reference.src}
              previewAlt={reference.name}
              onRemove={() => setReference(null)}
            />
          )}

      <VoiceSelect />
      <div className="flex w-full gap-2">
        <AspectRatioSelect />
        <DurationSelect />
      </div>

      <RailFooter>
        <Button
          variant="marketingPrimary"
          size="lg"
          className="w-full"
          end={
            <span className="flex items-center gap-2">
              <Sparkles width={18} height={18} />
              <span className="text-q-body-md-semi-bold">22</span>
            </span>
          }
        >
          Generate
        </Button>
      </RailFooter>
    </aside>
  )
}

/**
 * Preset tile orientation — chosen per app. `horizontal` is the default
 * landscape (16:9) gallery; `vertical` renders portrait (9:16) tiles in a
 * denser grid (Figma vertical presets, node 3322:53945).
 */
export type PresetOrientation = 'horizontal' | 'vertical'

/** Per-orientation grid knobs: column count + the `MediaCard` media ratio. */
const PRESET_GRID_LAYOUT = {
  horizontal: { cols: 3, ratio: 'video' as const },
  vertical: { cols: 4, ratio: 9 / 16 },
} satisfies Record<PresetOrientation, { cols: number, ratio: 'video' | number }>

/** The preset media grid — shared by the Presets and How-it-works tabs. */
function PresetGrid({ orientation = 'horizontal' }: { orientation?: PresetOrientation }) {
  // Default to the first preset for a nicer initial state; clicking selects.
  const [selected, setSelected] = useState(0)
  const layout = PRESET_GRID_LAYOUT[orientation]

  return (
    <Card surface="solid" className="min-h-0 flex-1 overflow-y-auto p-4">
      <Grid cols={layout.cols} gap={4}>
        {PRESETS.map((preset, index) => (
          <MediaCard
            key={`${preset.title}-${index}`}
            render={<button type="button" />}
            frame="none"
            ratio={layout.ratio}
            selected={index === selected}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
            src={preset.src}
            alt={preset.title}
            title={preset.title}
            className="transition-transform duration-200 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
          />
        ))}
      </Grid>
    </Card>
  )
}

/** "How it works in 3 steps" explainer — the third tab's panel content. */
function HowItWorks() {
  return (
    <Card surface="solid" className="min-h-0 flex-1 overflow-y-auto p-6">
      <section className="flex flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <Typography as="h2" variant="accent-lg-bold" color="primary" className="uppercase">
            How it works
            {' '}
            <span className="text-q-text-brand">in 3 steps</span>
          </Typography>
        </header>

        <div className="grid gap-10 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex flex-col gap-4">
              <div className="h-60 overflow-hidden rounded-q-400 bg-q-transparent-light-05">
                {step.preview}
              </div>
              <div className="flex flex-col gap-2">
                <Typography as="h3" variant="accent-xs-bold" color="primary" className="uppercase">
                  {`${index + 1}. ${step.title}`}
                </Typography>
                <Typography as="p" variant="body-sm-regular" color="secondary">
                  {step.description}
                </Typography>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Card>
  )
}

/** Right column — segmented tabs + search over the preset gallery. */
function PresetGallery({ orientation = 'horizontal' }: { orientation?: PresetOrientation }) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* `flex!` — the q-tabs utility hard-sets `display: block`, which would
          otherwise beat this class and kill both the gap and the height chain. */}
      <Tabs.Root variant="segmented" defaultValue="presets" className="flex! min-h-0 flex-1 flex-col gap-3">
        <header className="flex shrink-0 items-center justify-between gap-4">
          <Tabs.List
            items={[
              { value: 'presets', label: 'Presets', start: <Icon size="sm" as={IconMagicBookOutlined} /> },
              { value: 'history', label: 'History', start: <Icon size="sm" as={IconFolder1Outlined} /> },
              { value: 'how-it-works', label: 'How it works', start: <Icon size="sm" as={IconNewspaper2Outlined} /> },
            ]}
          />
          <Input
            placeholder="Search"
            aria-label="Search presets"
            className="w-50"
            start={<Icon size="sm" as={IconMagnifyingGlassOutlined} />}
          />
        </header>

        <Tabs.Panel value="presets" className="flex min-h-0 flex-1 flex-col pt-0">
          <PresetGrid orientation={orientation} />
        </Tabs.Panel>
        <Tabs.Panel value="history" className="flex min-h-0 flex-1 flex-col pt-0">
          <Card surface="solid" className="min-h-0 flex-1 overflow-y-auto p-4">
            <HistoryGrid />
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="how-it-works" className="flex min-h-0 flex-1 flex-col pt-0">
          <HowItWorks />
        </Tabs.Panel>
      </Tabs.Root>
    </section>
  )
}

export interface PresetTemplateProps {
  /**
   * Preset tile orientation — landscape `horizontal` (default) or `vertical`
   * (portrait). Set it per app: `<PresetTemplate presetOrientation="vertical" />`.
   */
  presetOrientation?: PresetOrientation
}

export function PresetTemplate({ presetOrientation = 'horizontal' }: PresetTemplateProps = {}) {
  return (
    <div className="flex h-dvh gap-5 overflow-hidden bg-q-background-primary px-4 py-3">
      <InputPanel />
      <PresetGallery orientation={presetOrientation} />
    </div>
  )
}
