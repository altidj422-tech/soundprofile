import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import IconAccessibilityNew from '@material-symbols/svg-400/outlined/accessibility_new.svg?react'
import IconApparel from '@material-symbols/svg-400/outlined/apparel.svg?react'
import IconAspectRatio from '@material-symbols/svg-400/outlined/aspect_ratio.svg?react'
import IconCheckroom from '@material-symbols/svg-400/outlined/checkroom.svg?react'
import IconFolder from '@material-symbols/svg-400/outlined/folder.svg?react'
import IconNewspaper from '@material-symbols/svg-400/outlined/newspaper.svg?react'
import IconPencil from '@material-symbols/svg-400/outlined/edit.svg?react'
import IconPerson from '@material-symbols/svg-400/outlined/person.svg?react'
import IconSearch from '@material-symbols/svg-400/outlined/search.svg?react'
import IconStyler from '@material-symbols/svg-400/outlined/styler.svg?react'
import IconWallpaper from '@material-symbols/svg-400/outlined/wallpaper.svg?react'
import Sparkles from '@/assets/icon-sparkles-soft.svg?react'
import { Accordion } from '@higgsfield/quanta/accordion'
import { Button } from '@higgsfield/quanta/button'
import { Card, card } from '@higgsfield/quanta/card'
import { Grid } from '@higgsfield/quanta/grid'
import { Icon } from '@higgsfield/quanta/icon'
import { Input } from '@higgsfield/quanta/input'
import { Loader } from '@higgsfield/quanta/loader'
import { Select } from '@higgsfield/quanta/select'
import { Tabs } from '@higgsfield/quanta/tabs'
import { Typography } from '@higgsfield/quanta/typography'
import { AssetLibraryModal } from '@/components/asset-library'
import type { AssetSelection } from '@/components/asset-library'
import { GenerationCard } from '@/components/generation-card'
import { GenerationDetailModal } from '@/components/generation-detail'
import { HistoryGrid } from '@/components/history-grid'
import { MediaCard } from '@/components/media-card'
import { RailFooter } from '@/components/rail-footer'
import { SettingTrigger } from '@/components/setting-trigger'
import { TemplateModal } from '@/components/template-modal'
import type { TemplateOption } from '@/components/template-modal'
import { UploadField } from '@/components/upload-field'

/**
 * AI Stylist app screen template — a rebuild of the live Higgsfield "AI Stylist"
 * app (https://higgsfield.ai/apps/ai-stylist) in our design system. The real
 * page's promise: "Upload your own clothes or mix and match from presets. Change
 * poses, backgrounds, and try on complete outfits instantly."
 *
 * Structure & flow mapped onto our components (Quanta + `@/components/*`, dark,
 * no host chrome):
 *   • Left settings rail (`StylistRail`) — compact & focused: the PRIMARY input
 *     (upload your photo, `UploadField` → `AssetLibraryModal`) and the PRIMARY
 *     action (costed marketing Generate CTA) stay visible, while every secondary
 *     choice — the outfit (`MediaCard` cover → `TemplateModal` + own-clothes
 *     `UploadField`), pose / background / aspect-ratio (`SettingTrigger` +
 *     `Select`) — is COLLAPSED under a titled `Accordion` section and expands on
 *     demand (progressive disclosure, mirroring the ref's grouped option lists).
 *   • Right workspace (`StylistGallery`) — segmented `Tabs` + search over four
 *     panels: an outfit-preset gallery (`MediaCard` grid, mix-and-match), the
 *     live generation Results canvas (`GenerationCard` generating → result grid
 *     opening `GenerationDetailModal`), personal History (`HistoryGrid`), and a
 *     "how it works in 3 steps" explainer.
 *
 * This is a full workspace shell (rail + gallery), so it fills the viewport
 * rather than the centered `max-w-7xl` page.
 */

/** Preview covers reused across the outfit gallery, presets picker and results. */
const COVERS = [
  '/presets/cover.png',
  '/presets/explain.png',
  '/presets/hyper-motion.png',
  '/presets/how-product-works.png',
] as const

/** Outfit presets — the "mix and match from presets" gallery + cover picker. */
const OUTFITS: TemplateOption[] = [
  { id: 'old-money', label: 'Old Money', image: COVERS[0] },
  { id: 'streetwear', label: 'Streetwear', image: COVERS[1] },
  { id: 'evening-gown', label: 'Evening Gown', image: COVERS[2] },
  { id: 'business', label: 'Business Casual', image: COVERS[3] },
  { id: 'summer-linen', label: 'Summer Linen', image: COVERS[1] },
  { id: 'denim', label: 'Denim on Denim', image: COVERS[0] },
  { id: 'athleisure', label: 'Athleisure', image: COVERS[2] },
  { id: 'boho', label: 'Boho Chic', image: COVERS[3] },
  { id: 'leather', label: 'Leather Jacket', image: COVERS[1] },
  { id: 'trench', label: 'Trench Coat', image: COVERS[0] },
  { id: 'cocktail', label: 'Cocktail Dress', image: COVERS[2] },
  { id: 'techwear', label: 'Techwear', image: COVERS[3] },
]

/** The default cover shown before an outfit is picked. */
const DEFAULT_OUTFIT: TemplateOption = { id: 'old-money', label: 'Old Money', image: COVERS[0] }

const POSES = ['Natural', 'Full body', 'Walking', 'Seated', 'Three-quarter', 'Profile']

const BACKGROUNDS = [
  { value: 'studio', title: 'Studio', subtitle: 'Clean seamless backdrop' },
  { value: 'street', title: 'City street', subtitle: 'Editorial street style' },
  { value: 'runway', title: 'Runway', subtitle: 'Catwalk lighting' },
  { value: 'beach', title: 'Beach', subtitle: 'Golden-hour coastline' },
  { value: 'cafe', title: 'Café', subtitle: 'Warm interior' },
  { value: 'keep', title: 'Keep original', subtitle: 'Use your photo\u2019s background' },
]

const RATIOS = [
  { value: '3:4', title: '3:4', subtitle: 'Portrait' },
  { value: '1:1', title: '1:1', subtitle: 'Square' },
  { value: '9:16', title: '9:16', subtitle: 'Story' },
]

/** The styled looks revealed once a (simulated) generation finishes. */
const RESULT_LOOKS = [
  {
    src: COVERS[0],
    prompt: 'Full-body editorial portrait of the subject in a tailored old-money ensemble, soft studio light, 3:4 fashion photography.',
  },
  {
    src: COVERS[2],
    prompt: 'The same subject styled in a flowing evening gown, three-quarter pose against a runway backdrop, dramatic rim light.',
  },
  {
    src: COVERS[1],
    prompt: 'Street-style look with layered outerwear, natural walking pose on a city street, overcast daylight.',
  },
  {
    src: COVERS[3],
    prompt: 'Business-casual outfit, seated pose in a warm café interior, shallow depth of field.',
  },
]

/** Right-pane generation lifecycle for the Results canvas. */
type Stage = 'idle' | 'generating' | 'result'

/** Shared popup placement for the rail pickers — opens into the workspace. */
const PICKER_POPUP = {
  size: 'picker',
  surface: 'solid',
  side: 'right',
  align: 'start',
  sideOffset: 8,
  collisionPadding: 16,
} satisfies Partial<Parameters<typeof Select.Content>[0]>

/** Pose picker — single-line options behind the Pose setting row. */
function PoseSelect() {
  return (
    <Select.Root defaultValue="Natural">
      <Select.Trigger bare render={<SettingTrigger label="Pose" start={<Icon size="sm" as={IconAccessibilityNew} />} />}>
        <Select.Value placeholder="Select pose" />
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {POSES.map(pose => (
          <Select.Item key={pose} value={pose}>
            <Select.ItemText>{pose}</Select.ItemText>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

/** Background picker — two-line options (title + description). */
function BackgroundSelect() {
  return (
    <Select.Root defaultValue="studio">
      <Select.Trigger bare render={<SettingTrigger label="Background" start={<Icon size="sm" as={IconWallpaper} />} />}>
        <Select.Value placeholder="Select background">
          {(value: string) => BACKGROUNDS.find(b => b.value === value)?.title ?? value}
        </Select.Value>
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {BACKGROUNDS.map(background => (
          <Select.Item key={background.value} value={background.value}>
            <Select.ItemContent>
              <Select.ItemText>{background.title}</Select.ItemText>
              <Select.ItemDescription>{background.subtitle}</Select.ItemDescription>
            </Select.ItemContent>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

/** Aspect-ratio picker — two-line options (3:4 Portrait / 1:1 Square / 9:16 Story). */
function AspectRatioSelect() {
  return (
    <Select.Root defaultValue="3:4">
      <Select.Trigger bare render={<SettingTrigger label="Aspect Ratio" start={<Icon size="sm" as={IconAspectRatio} />} />}>
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

interface StylistRailProps {
  outfit: TemplateOption
  onOutfitChange: (outfit: TemplateOption) => void
  busy: boolean
  onGenerate: () => void
}

/**
 * Left settings rail — compact & focused (see `../layouts/AGENTS.md`): the
 * PRIMARY input (your photo) and the PRIMARY action (Generate) stay visible;
 * every secondary/optional choice (outfit, pose, background, aspect ratio) is
 * COLLAPSED under a titled `Accordion` section and expands on demand, mirroring
 * the live AI Stylist's grouped option lists. All sections start collapsed and
 * `multiple={false}` keeps at most one open at a time.
 */
function StylistRail({ outfit, onOutfitChange, busy, onGenerate }: StylistRailProps) {
  // Your photo — the subject to restyle (picked from the shared AssetLibraryModal).
  const [photo, setPhoto] = useState<AssetSelection | null>(null)
  // Your own clothes — the optional "upload your own garment" input.
  const [garment, setGarment] = useState<AssetSelection | null>(null)

  return (
    <aside
      className={card(
        { surface: 'solid', elevation: 'raised' },
        // Figma input rail width: 342px = spacing scale × 85.5. Stretch to the
        // viewport height and scroll internally so the sticky RailFooter can pin
        // the Generate CTA when the chosen fields overflow.
        'w-85.5 shrink-0 gap-3 overflow-y-auto border-q-thin border-q-border-subtle p-3',
      )}
    >
      <div className="flex flex-col gap-1 px-2 py-0.5">
        <Typography as="h1" variant="accent-sm-bold" color="brand" className="uppercase">
          AI Stylist
        </Typography>
        <Typography as="p" variant="caption-xs-regular" color="secondary">
          Restyle your photo into any outfit, pose and background.
        </Typography>
      </div>

      {/* PRIMARY input — your photo, always visible (the subject to restyle). */}
      {photo == null
        ? (
            <AssetLibraryModal
              onSelect={setPhoto}
              trigger={(
                <UploadField
                  render={<button type="button" />}
                  icon={IconPerson}
                  title="Upload your photo"
                  subtitle="A clear portrait or full-body shot"
                />
              )}
            />
          )
        : (
            <UploadField
              preview={photo.src}
              previewAlt={photo.name}
              onRemove={() => setPhoto(null)}
            />
          )}

      {/* Secondary choices — collapsed by default, one open at a time. */}
      <Accordion.Root variant="separated" size="sm">
        {/* The outfit: mix and match from presets… or upload your own clothes. */}
        <Accordion.Item value="outfit">
          <Accordion.Trigger start={<Icon size="sm" as={IconCheckroom} />}>
            Outfit
          </Accordion.Trigger>
          <Accordion.Panel contentClassName="flex flex-col gap-3">
            <TemplateModal
              title="Choose an outfit"
              options={OUTFITS}
              value={outfit.id}
              onSelect={onOutfitChange}
              trigger={(
                <MediaCard
                  render={<button type="button" />}
                  ratio="auto"
                  frame="thin"
                  scrim={false}
                  titleVariant="accent"
                  className="h-40 shrink-0"
                  src={outfit.image}
                  alt={`${outfit.label} outfit`}
                  title={outfit.label}
                  action={(
                    <span className="q-media-card-action">
                      Change
                      <Icon size="sm" as={IconPencil} />
                    </span>
                  )}
                />
              )}
            />
            {garment == null
              ? (
                  <AssetLibraryModal
                    onSelect={setGarment}
                    trigger={(
                      <UploadField
                        render={<button type="button" />}
                        border="solid"
                        icon={IconApparel}
                        title="Or upload your own clothes"
                        subtitle="PNG or JPG of a garment, up to 20MB"
                      />
                    )}
                  />
                )
              : (
                  <UploadField
                    preview={garment.src}
                    previewAlt={garment.name}
                    onRemove={() => setGarment(null)}
                  />
                )}
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="pose">
          <Accordion.Trigger start={<Icon size="sm" as={IconAccessibilityNew} />}>
            Pose
          </Accordion.Trigger>
          <Accordion.Panel contentClassName="flex flex-col gap-3">
            <PoseSelect />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="background">
          <Accordion.Trigger start={<Icon size="sm" as={IconWallpaper} />}>
            Background
          </Accordion.Trigger>
          <Accordion.Panel contentClassName="flex flex-col gap-3">
            <BackgroundSelect />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="ratio">
          <Accordion.Trigger start={<Icon size="sm" as={IconAspectRatio} />}>
            Aspect ratio
          </Accordion.Trigger>
          <Accordion.Panel contentClassName="flex flex-col gap-3">
            <AspectRatioSelect />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>

      <RailFooter>
        <Button
          variant="marketingPrimary"
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={onGenerate}
          start={busy ? <Loader size="xs" color="neutral" /> : undefined}
          end={
            busy
              ? undefined
              : (
                  <span className="flex items-center gap-2">
                    <Sparkles width={14} height={14} />
                    <span className="text-q-body-md-semi-bold">8</span>
                  </span>
                )
          }
        >
          {busy ? 'Styling\u2026' : 'Generate'}
        </Button>
      </RailFooter>
    </aside>
  )
}

interface OutfitGalleryProps {
  selectedId: string
  onSelect: (outfit: TemplateOption) => void
}

/** The outfit-preset gallery — portrait tiles, click to select (mix and match). */
function OutfitGallery({ selectedId, onSelect }: OutfitGalleryProps) {
  return (
    <Card surface="solid" className="min-h-0 flex-1 overflow-y-auto p-4">
      <Grid cols={4} gap={4}>
        {OUTFITS.map(outfit => (
          <MediaCard
            key={outfit.id}
            render={<button type="button" />}
            frame="none"
            ratio={3 / 4}
            selected={outfit.id === selectedId}
            aria-pressed={outfit.id === selectedId}
            onClick={() => onSelect(outfit)}
            src={outfit.image}
            alt={`${outfit.label} outfit`}
            title={outfit.label}
            className="transition-transform duration-200 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
          />
        ))}
      </Grid>
    </Card>
  )
}

/** The Results canvas — idle empty state → generating → styled result grid. */
function ResultsPanel({ stage, outfit }: { stage: Stage, outfit: TemplateOption }) {
  if (stage === 'idle') {
    return (
      <Card surface="solid" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="flex items-center justify-center rounded-q-full bg-q-transparent-light-05 p-4">
          <Icon as={IconStyler} size="lg" color="secondary" />
        </span>
        <div className="flex max-w-sm flex-col gap-1">
          <Typography as="h2" variant="body-md-semi-bold" color="primary">
            Your styled looks will appear here
          </Typography>
          <Typography as="p" variant="body-sm-regular" color="secondary">
            Upload your photo, pick an outfit, then press Generate to try on a
            complete look instantly.
          </Typography>
        </div>
      </Card>
    )
  }

  return (
    <Card surface="solid" className="min-h-0 flex-1 overflow-y-auto p-4">
      <Grid cols="auto-fit" minColWidth="14rem" gap={4}>
        {stage === 'generating'
          ? RESULT_LOOKS.map((_, index) => (
              <GenerationCard key={index} state="generating" ratio={3 / 4} />
            ))
          : RESULT_LOOKS.map((look, index) => (
              <GenerationDetailModal
                key={index}
                generation={{
                  src: look.src,
                  mediaType: 'image',
                  aspectRatio: 3 / 4,
                  prompt: look.prompt,
                  fileType: 'JPG',
                  author: { name: 'AI Stylist', role: 'Generated look' },
                }}
                trigger={(
                  <GenerationCard
                    render={<button type="button" />}
                    ratio={3 / 4}
                    src={look.src}
                    alt={`${outfit.label} styled look ${index + 1}`}
                    className="group cursor-pointer"
                  />
                )}
              />
            ))}
      </Grid>
    </Card>
  )
}

/** "How it works in 3 steps" explainer — the fourth tab's panel content. */
const STEPS: { title: string, description: string, preview: ReactNode }[] = [
  {
    title: 'Upload your photo',
    description: 'Add a clear portrait or full-body shot — this is the person we\u2019ll restyle.',
    preview: (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-q-300 border border-dashed border-q-border-subtle px-8">
        <Icon as={IconPerson} size="md" color="secondary" />
        <div className="flex flex-col items-center gap-1 text-center">
          <Typography as="span" variant="body-sm-semi-bold" color="primary" className="uppercase">
            Upload your photo
          </Typography>
          <Typography as="span" variant="caption-xs-regular" color="secondary">
            Portrait, selfie or full-body shot
          </Typography>
        </div>
      </div>
    ),
  },
  {
    title: 'Pick or upload an outfit',
    description: 'Mix and match from the outfit presets, or upload your own clothes to try on.',
    preview: (
      <div className="flex h-full items-center justify-center gap-3 p-6">
        <Icon as={IconCheckroom} size="md" color="secondary" />
        <Icon as={IconApparel} size="md" color="secondary" />
      </div>
    ),
  },
  {
    title: 'Generate your look',
    description: 'Set the pose and background, then press Generate to try on the complete outfit.',
    preview: (
      <div className="flex h-full items-center justify-center">
        <Button variant="marketingPrimary" size="lg" end={<Sparkles width={14} height={14} />}>
          Generate
        </Button>
      </div>
    ),
  },
]

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

type WorkspaceTab = 'outfits' | 'results' | 'history' | 'how-it-works'

interface StylistGalleryProps {
  tab: WorkspaceTab
  onTabChange: (tab: WorkspaceTab) => void
  stage: Stage
  outfit: TemplateOption
  onOutfitSelect: (outfit: TemplateOption) => void
}

/** Right column — segmented tabs + search over the workspace panels. */
function StylistGallery({ tab, onTabChange, stage, outfit, onOutfitSelect }: StylistGalleryProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* `flex!` — the q-tabs utility hard-sets `display: block`, which would
          otherwise beat this class and kill both the gap and the height chain. */}
      <Tabs.Root
        variant="segmented"
        value={tab}
        onValueChange={value => onTabChange(value as WorkspaceTab)}
        className="flex! min-h-0 flex-1 flex-col gap-3"
      >
        <header className="flex shrink-0 items-center justify-between gap-4">
          <Tabs.List
            items={[
              { value: 'outfits', label: 'Outfits', start: <Icon size="sm" as={IconCheckroom} /> },
              { value: 'results', label: 'Results', start: <Icon size="sm" as={IconStyler} /> },
              { value: 'history', label: 'History', start: <Icon size="sm" as={IconFolder} /> },
              { value: 'how-it-works', label: 'How it works', start: <Icon size="sm" as={IconNewspaper} /> },
            ]}
          />
          <Input
            placeholder="Search outfits"
            aria-label="Search outfits"
            className="w-50"
            start={<Icon size="sm" as={IconSearch} />}
          />
        </header>

        <Tabs.Panel value="outfits" className="flex min-h-0 flex-1 flex-col pt-0">
          <OutfitGallery selectedId={outfit.id} onSelect={onOutfitSelect} />
        </Tabs.Panel>
        <Tabs.Panel value="results" className="flex min-h-0 flex-1 flex-col pt-0">
          <ResultsPanel stage={stage} outfit={outfit} />
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

export function AiStylistTemplate() {
  const [outfit, setOutfit] = useState<TemplateOption>(DEFAULT_OUTFIT)
  const [tab, setTab] = useState<WorkspaceTab>('outfits')
  const [stage, setStage] = useState<Stage>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current != null)
      clearTimeout(timerRef.current)
  }, [])

  const handleGenerate = () => {
    if (timerRef.current != null)
      clearTimeout(timerRef.current)
    setStage('generating')
    setTab('results')
    timerRef.current = setTimeout(() => setStage('result'), 2200)
  }

  return (
    <div className="flex h-dvh gap-5 overflow-hidden bg-q-background-primary px-4 py-3">
      <StylistRail
        outfit={outfit}
        onOutfitChange={setOutfit}
        busy={stage === 'generating'}
        onGenerate={handleGenerate}
      />
      <StylistGallery
        tab={tab}
        onTabChange={setTab}
        stage={stage}
        outfit={outfit}
        onOutfitSelect={setOutfit}
      />
    </div>
  )
}
