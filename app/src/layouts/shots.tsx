import { useEffect, useMemo, useRef, useState } from 'react'
import IconAddPhotoOutlined from '@material-symbols/svg-400/outlined/add_photo_alternate.svg?react'
import IconAutorenewOutlined from '@material-symbols/svg-400/outlined/autorenew.svg?react'
import IconDownloadOutlined from '@material-symbols/svg-400/outlined/download.svg?react'
import IconHighQualityOutlined from '@material-symbols/svg-400/outlined/high_quality.svg?react'
import IconUploadOutlined from '@material-symbols/svg-400/outlined/upload.svg?react'
import Sparkles from '@/assets/icon-sparkles-soft.svg?react'
import { Button } from '@higgsfield/quanta/button'
import { Card } from '@higgsfield/quanta/card'
import { Checkbox } from '@higgsfield/quanta/checkbox'
import { Grid } from '@higgsfield/quanta/grid'
import { Icon } from '@higgsfield/quanta/icon'
import { Media } from '@higgsfield/quanta/media'
import { Typography } from '@higgsfield/quanta/typography'
import { cn } from '@/lib/utils'
import { AssetLibraryModal } from '@/components/asset-library'
import type { AssetSelection } from '@/components/asset-library'
import { BeforeAfterCompare } from '@/components/before-after-compare'
import { GenerationCard } from '@/components/generation-card'
import { GenerationDetailModal } from '@/components/generation-detail'
import { StepRail } from '@/components/step-rail'

/**
 * Shots app screen template — a faithful rebuild of the live Higgsfield "Shots"
 * app (https://higgsfield.ai/apps/shots) in our design system. The real page is
 * a compact, centered 3-step wizard — `Upload → Grid → Upscale` — that takes ONE
 * source image, generates 9 cinematic camera angles, lets the user favorite the
 * best ones, and upscales them to 4K ("Upload one image, get 9 cinematic angles.
 * Select your favorites and upscale to 4K.").
 *
 * Structure + flow are mapped onto Quanta components + our shared `@/components`:
 *   • The numbered wizard header → `StepRail` (a new shared component).
 *   • Step 1 (Upload) → a centered `Card` hero: a `Media` preview whose click
 *     (and the white "Upload image" button) open `AssetLibraryModal`, then a
 *     costed marketing Generate CTA.
 *   • Step 2 (Grid) → a `Grid` of `GenerationCard`s (`state="generating"` while
 *     the angles render, then selectable result tiles that open
 *     `GenerationDetailModal`).
 *   • Step 3 (Upscale) → a `BeforeAfterCompare` original↔4K hero over a grid of
 *     the upscaled favorites.
 *
 * Permanently dark, no app header (the host owns chrome), `q-` tokens only.
 */

/* ── Content ──────────────────────────────────────────────────────────────── */

type Step = 'upload' | 'grid' | 'upscale'

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'grid', label: 'Grid' },
  { id: 'upscale', label: 'Upscale' },
] as const

/** The example source shown before the user uploads their own image. */
const HERO_EXAMPLE = '/presets/cover.png'

const PREVIEWS = [
  '/presets/cover.png',
  '/presets/how-product-works.png',
  '/presets/explain.png',
  '/presets/hyper-motion.png',
] as const

/**
 * The 9 cinematic camera angles Shots derives from one image. Each cycles a
 * local preview asset — the shape (title + prompt) is what matters for the flow.
 */
const ANGLES: { label: string, prompt: string }[] = [
  { label: 'Wide shot', prompt: 'Full-body wide establishing shot, subject centered, cinematic depth.' },
  { label: 'Medium shot', prompt: 'Waist-up medium shot, shallow depth of field, editorial lighting.' },
  { label: 'Close-up', prompt: 'Tight close-up on the face, soft key light, filmic contrast.' },
  { label: 'Extreme close-up', prompt: 'Extreme close-up on the eyes, macro detail, dramatic mood.' },
  { label: 'Over-the-shoulder', prompt: 'Over-the-shoulder framing, foreground bokeh, narrative depth.' },
  { label: 'Low angle', prompt: 'Low-angle hero shot looking up, powerful and imposing.' },
  { label: 'High angle', prompt: 'High-angle shot looking down, vulnerable, wide context.' },
  { label: 'Dutch angle', prompt: 'Tilted Dutch angle, tension and unease, dynamic composition.' },
  { label: "Bird's-eye", prompt: "Top-down bird's-eye view, graphic and geometric staging." },
]

const ANGLE_TILES = ANGLES.map((angle, index) => ({
  ...angle,
  id: `${angle.label}-${index}`,
  src: PREVIEWS[index % PREVIEWS.length],
}))

/** Simulated backend costs, shown inside the marketing CTAs. */
const GRID_COST = 18
const UPSCALE_COST = 12

/** ~2s simulated backend delay for the generate / upscale transitions. */
const SIMULATED_DELAY = 2000

type RenderStage = 'idle' | 'generating' | 'ready'

/* ── Shared CTA slot ──────────────────────────────────────────────────────── */

/** The branded `{sparkles} {credits}` cost slot for a marketing Generate CTA. */
function CostSlot({ credits }: { credits: number }) {
  return (
    <span className="flex items-center gap-2">
      <Sparkles width={14} height={14} />
      <span className="text-q-body-md-semi-bold">{credits}</span>
    </span>
  )
}

/* ── Step 1 — Upload ──────────────────────────────────────────────────────── */

interface UploadStepProps {
  source: string | null
  onUpload: (item: AssetSelection) => void
  onGenerate: () => void
}

function UploadStep({ source, onUpload, onGenerate }: UploadStepProps) {
  const previewSrc = source ?? HERO_EXAMPLE

  return (
    <Card
      surface="solid"
      className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 rounded-q-600 border border-q-border-subtle p-6 text-center"
    >
      {/* The hero preview doubles as an upload trigger — clicking it (or the
          button below) opens the shared AssetLibraryModal. */}
      <AssetLibraryModal
        onSelect={onUpload}
        trigger={(
          <button type="button" className="group relative w-full overflow-hidden rounded-q-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-q-border-focus">
            <Media ratio="video" rounded="md" className="w-full">
              <Media.Image src={previewSrc} alt={source != null ? 'Your source image' : 'Example — two people mid-scene'} />
              <Media.Overlay
                placement="center"
                className="justify-center opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <span className="flex h-9 items-center gap-1.5 rounded-q-full bg-q-transparent-dark-60 px-3 text-q-text-primary backdrop-blur-sm">
                  <Typography as="span" variant="caption-xs-medium" color="primary" className="uppercase">
                    {source != null ? 'Change image' : 'Upload image'}
                  </Typography>
                  <Icon as={IconAddPhotoOutlined} size="sm" />
                </span>
              </Media.Overlay>
            </Media>
          </button>
        )}
      />

      <div className="flex flex-col gap-2">
        <Typography as="h1" variant="accent-xl-bold" color="primary" className="uppercase">
          Shots
        </Typography>
        <Typography as="p" variant="body-md-regular" color="secondary">
          Upload one image, get 9 cinematic angles. Select your favorites and upscale to 4K.
        </Typography>
      </div>

      {source == null
        ? (
            <AssetLibraryModal
              onSelect={onUpload}
              trigger={(
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  start={<Icon as={IconUploadOutlined} size="sm" />}
                >
                  Upload image
                </Button>
              )}
            />
          )
        : (
            <Button
              variant="marketingPrimary"
              size="lg"
              className="w-full"
              onClick={onGenerate}
              end={<CostSlot credits={GRID_COST} />}
            >
              Generate 9 angles
            </Button>
          )}
    </Card>
  )
}

/* ── Step 2 — Grid ────────────────────────────────────────────────────────── */

interface AngleTileProps {
  tile: (typeof ANGLE_TILES)[number]
  selected: boolean
  onToggle: () => void
}

/** A single result tile — a selectable `GenerationCard` that opens the detail modal. */
function AngleTile({ tile, selected, onToggle }: AngleTileProps) {
  // Download is a template stub — no real asset export is wired here.
  const handleDownload = () => {}

  return (
    <GenerationCard
      ratio="portrait"
      src={tile.src}
      alt={tile.label}
      title={tile.label}
      className={cn('group', selected && 'ring-2 ring-q-brand-primary')}
    >
      {/* The tile body opens the shared detail lightbox — a full-bleed trigger
          UNDER the checkbox (they are siblings, never nested, so a click on the
          checkbox toggles selection and never opens the modal). */}
      <GenerationDetailModal
        generation={{ src: tile.src, mediaType: 'image', aspectRatio: 3 / 4, prompt: tile.prompt, fileType: 'PNG' }}
        trigger={(
          <button
            type="button"
            aria-label={`Preview ${tile.label}`}
            className="absolute inset-0 z-10 rounded-q-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-q-border-focus"
          />
        )}
      />

      {/* Favorite/selection control — the Quanta Checkbox (brand, md), matching
          the Figma checkbox states (unchecked 1442:137 / checked 1442:125).
          `checked` mirrors the tile's selected state; the subtle drop shadow
          keeps the unchecked box legible over bright media. The arbitrary
          property recolors the checkbox's own UNCHECKED-hover border token to
          full white — the checked (lime fill) state uses a different rule, so
          it is unaffected. */}
      <Checkbox
        color="brand"
        size="md"
        checked={selected}
        onCheckedChange={onToggle}
        aria-label={selected ? `Unselect ${tile.label}` : `Select ${tile.label}`}
        className="absolute top-2 left-2 z-20 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)] [--q-checkbox-hover-border:var(--hf-color-palette-white)]!"
      />

      {/* Round glass Download button (top-right, mirrors the checkbox) — a real
          accessible button, sibling of the modal trigger and above it (z-20), so
          clicking it downloads without opening the detail modal. Reveals on
          hover/focus like the other tile hover controls. */}
      <button
        type="button"
        aria-label={`Download ${tile.label}`}
        onClick={handleDownload}
        className="absolute top-2 right-2 z-20 flex size-8 items-center justify-center rounded-q-full bg-q-transparent-dark-40 text-q-text-primary opacity-0 backdrop-blur-sm transition-opacity hover:bg-q-transparent-dark-60 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-q-border-focus group-hover:opacity-100"
      >
        <Icon as={IconDownloadOutlined} size="sm" />
      </button>
    </GenerationCard>
  )
}

interface GridStepProps {
  source: string | null
  stage: RenderStage
  selected: Set<string>
  onToggle: (id: string) => void
  onRegenerate: () => void
  onUpscale: () => void
}

function GridStep({ source, stage, selected, onToggle, onRegenerate, onUpscale }: GridStepProps) {
  const generating = stage === 'generating'
  const selectedCount = selected.size

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-q-150">
            <Media ratio="square" rounded="none" className="h-full w-full">
              <Media.Image src={source ?? HERO_EXAMPLE} alt="Source image" />
            </Media>
          </div>
          <div className="flex flex-col">
            <Typography as="h2" variant="accent-sm-bold" color="primary" className="uppercase">
              9 cinematic angles
            </Typography>
            <Typography as="span" variant="body-sm-regular" color="secondary">
              {generating ? 'Rendering your angles…' : 'Select your favorites, then upscale to 4K.'}
            </Typography>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={onRegenerate}
            disabled={generating}
            start={<Icon as={IconAutorenewOutlined} size="sm" />}
          >
            Regenerate
          </Button>
          <Button
            variant="marketingPrimary"
            size="sm"
            onClick={onUpscale}
            disabled={generating || selectedCount === 0}
            end={<CostSlot credits={UPSCALE_COST} />}
          >
            {selectedCount > 0 ? `Upscale ${selectedCount} selected` : 'Upscale selected'}
          </Button>
        </div>
      </header>

      <Grid cols={3} gap={4}>
        {generating
          ? ANGLE_TILES.map(tile => (
              <GenerationCard key={tile.id} state="generating" ratio="portrait" />
            ))
          : ANGLE_TILES.map(tile => (
              <AngleTile
                key={tile.id}
                tile={tile}
                selected={selected.has(tile.id)}
                onToggle={() => onToggle(tile.id)}
              />
            ))}
      </Grid>
    </div>
  )
}

/* ── Step 3 — Upscale ─────────────────────────────────────────────────────── */

/** The finished-tile hover controls — a glass Download button. */
function UpscaleHoverControls() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-center p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
      <Button
        variant="marketingTertiary"
        size="md"
        className="pointer-events-auto"
        start={<Icon as={IconDownloadOutlined} size="sm" />}
      >
        Download 4K
      </Button>
    </div>
  )
}

interface UpscaleStepProps {
  stage: RenderStage
  tiles: (typeof ANGLE_TILES)[number][]
  onUpscale: () => void
}

function UpscaleStep({ stage, tiles, onUpscale }: UpscaleStepProps) {
  const generating = stage === 'generating'
  const ready = stage === 'ready'
  const hero = tiles[0]

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <Typography as="h2" variant="accent-sm-bold" color="primary" className="uppercase">
            Upscale to 4K
          </Typography>
          <Typography as="span" variant="body-sm-regular" color="secondary">
            {generating
              ? 'Upscaling your favorites…'
              : ready
                ? 'Your shots are ready in 4K. Download the ones you love.'
                : `${tiles.length} favorite${tiles.length === 1 ? '' : 's'} ready to upscale.`}
          </Typography>
        </div>

        {!ready
          ? (
              <Button
                variant="marketingPrimary"
                size="sm"
                onClick={onUpscale}
                disabled={generating}
                end={<CostSlot credits={UPSCALE_COST} />}
              >
                Upscale to 4K
              </Button>
            )
          : (
              <Button variant="marketingTertiary" size="md" start={<Icon as={IconDownloadOutlined} size="sm" />}>
                Download all
              </Button>
            )}
      </header>

      {/* Original ↔ 4K comparison hero for the top favorite. */}
      {hero != null
        ? (
            <BeforeAfterCompare
              beforeSrc={hero.src}
              afterSrc={hero.src}
              beforeLabel="Original"
              afterLabel="4K"
              ratio="wide"
              className="w-full"
            />
          )
        : null}

      <Grid cols={3} gap={4}>
        {tiles.map(tile => (
          generating
            ? <GenerationCard key={tile.id} state="generating" ratio="portrait" />
            : (
                <GenerationCard
                  key={tile.id}
                  ratio="portrait"
                  src={tile.src}
                  alt={`${tile.label} — 4K`}
                  title={tile.label}
                  className="group"
                >
                  <span className="pointer-events-none absolute top-2 left-2 z-10 flex items-center gap-1 rounded-q-full bg-q-transparent-dark-60 px-2 py-0.5 backdrop-blur-sm">
                    <Icon as={IconHighQualityOutlined} size="sm" color="primary" />
                    <Typography as="span" variant="caption-xs-medium" color="primary">4K</Typography>
                  </span>
                  <UpscaleHoverControls />
                </GenerationCard>
              )
        ))}
      </Grid>
    </div>
  )
}

/* ── Template ─────────────────────────────────────────────────────────────── */

export interface ShotsTemplateProps {
  /**
   * Optional seed to deep-link the wizard into a given state (also used by the
   * isolated previews). Every field is optional and defaults to the fresh
   * `upload` flow, so `<ShotsTemplate />` is unchanged.
   */
  preview?: {
    step?: Step
    source?: string
    gridStage?: RenderStage
    upscaleStage?: RenderStage
    /** Preselect the first N angle tiles as favorites. */
    selectedCount?: number
  }
}

export function ShotsTemplate({ preview }: ShotsTemplateProps = {}) {
  const [step, setStep] = useState<Step>(preview?.step ?? 'upload')
  const [source, setSource] = useState<string | null>(preview?.source ?? null)
  const [gridStage, setGridStage] = useState<RenderStage>(preview?.gridStage ?? 'idle')
  const [upscaleStage, setUpscaleStage] = useState<RenderStage>(preview?.upscaleStage ?? 'idle')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(ANGLE_TILES.slice(0, preview?.selectedCount ?? 0).map(tile => tile.id)),
  )

  // Simulated-backend timers, created in handlers and cleared on unmount so
  // nothing touches `window` during SSR (same pattern as the app-detail hero).
  const gridTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const upscaleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (gridTimer.current != null) clearTimeout(gridTimer.current)
    if (upscaleTimer.current != null) clearTimeout(upscaleTimer.current)
  }, [])

  const handleUpload = (item: AssetSelection) => setSource(item.src)

  const startGrid = () => {
    setStep('grid')
    setGridStage('generating')
    if (gridTimer.current != null) clearTimeout(gridTimer.current)
    gridTimer.current = setTimeout(() => setGridStage('ready'), SIMULATED_DELAY)
  }

  const regenerate = () => {
    setSelected(new Set())
    setGridStage('generating')
    if (gridTimer.current != null) clearTimeout(gridTimer.current)
    gridTimer.current = setTimeout(() => setGridStage('ready'), SIMULATED_DELAY)
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const goToUpscale = () => {
    setStep('upscale')
    setUpscaleStage('idle')
  }

  const startUpscale = () => {
    setUpscaleStage('generating')
    if (upscaleTimer.current != null) clearTimeout(upscaleTimer.current)
    upscaleTimer.current = setTimeout(() => setUpscaleStage('ready'), SIMULATED_DELAY)
  }

  // Steps the user has unlocked — drives which StepRail markers are clickable.
  const reachable = useMemo(() => {
    const ids: string[] = ['upload']
    if (source != null) ids.push('grid')
    if (gridStage === 'ready' && selected.size > 0) ids.push('upscale')
    return ids
  }, [source, gridStage, selected])

  const selectedTiles = useMemo(
    () => ANGLE_TILES.filter(tile => selected.has(tile.id)),
    [selected],
  )

  const handleStepChange = (id: string) => {
    const next = id as Step
    setStep(next)
    // Entering the grid with no render yet kicks off generation.
    if (next === 'grid' && gridStage === 'idle')
      startGrid()
  }

  return (
    <div className="min-h-dvh bg-q-background-primary">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
        <StepRail
          steps={STEPS.map(s => ({ id: s.id, label: s.label }))}
          current={step}
          reachable={reachable}
          onStepChange={handleStepChange}
        />

        <main>
          {step === 'upload'
            ? <UploadStep source={source} onUpload={handleUpload} onGenerate={startGrid} />
            : step === 'grid'
              ? (
                  <GridStep
                    source={source}
                    stage={gridStage}
                    selected={selected}
                    onToggle={toggleSelect}
                    onRegenerate={regenerate}
                    onUpscale={goToUpscale}
                  />
                )
              : (
                  <UpscaleStep
                    stage={upscaleStage}
                    tiles={selectedTiles.length > 0 ? selectedTiles : ANGLE_TILES.slice(0, 3)}
                    onUpscale={startUpscale}
                  />
                )}
        </main>
      </div>
    </div>
  )
}
