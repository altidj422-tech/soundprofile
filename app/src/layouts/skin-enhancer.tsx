import { useEffect, useRef, useState } from 'react'
import IconAddOutlined from '@material-symbols/svg-400/outlined/add.svg?react'
import IconCloudUploadOutlined from '@material-symbols/svg-400/outlined/cloud_upload.svg?react'
import IconCompareOutlined from '@material-symbols/svg-400/outlined/compare.svg?react'
import IconDownloadOutlined from '@material-symbols/svg-400/outlined/download.svg?react'
import IconFullScreenOutlined from '@material-symbols/svg-400/outlined/fullscreen.svg?react'
import IconRefreshOutlined from '@material-symbols/svg-400/outlined/refresh.svg?react'
import IconTuneOutlined from '@material-symbols/svg-400/outlined/tune.svg?react'
import IconUploadOutlined from '@material-symbols/svg-400/outlined/upload.svg?react'
import Sparkles from '@/assets/icon-sparkles-soft.svg?react'
import { Button } from '@higgsfield/quanta/button'
import { Card, card } from '@higgsfield/quanta/card'
import { Grid } from '@higgsfield/quanta/grid'
import { Icon } from '@higgsfield/quanta/icon'
import { Loader } from '@higgsfield/quanta/loader'
import { Media } from '@higgsfield/quanta/media'
import { Select } from '@higgsfield/quanta/select'
import { Typography } from '@higgsfield/quanta/typography'
import { AssetLibraryModal } from '@/components/asset-library'
import type { AssetSelection } from '@/components/asset-library'
import { BeforeAfterCompare } from '@/components/before-after-compare'
import { GenerationCard } from '@/components/generation-card'
import { GenerationDetailModal } from '@/components/generation-detail'
import { HistoryGrid } from '@/components/history-grid'
import { SettingTrigger } from '@/components/setting-trigger'

/**
 * Skin Enhancer app template — modeled on the live Higgsfield "Skin Enhancer"
 * app (https://higgsfield.ai/apps/skin-enhancer). The real page centers on a
 * single card: a before/after comparison slider (original ↔ enhanced) over the
 * "SKIN ENHANCER" title, a one-line subtitle, and a white "Upload Media" CTA,
 * with an "Apps / Skin Enhancer" breadcrumb and a floating "+" rail on the left.
 *
 * Rebuilt entirely in our design system (Quanta components + `q-` tokens + our
 * shared `@/components/*`): the compare interaction is the new
 * `@/components/before-after-compare`; uploads open the shared
 * `AssetLibraryModal`; the busy state is `<GenerationCard state="generating" />`;
 * opening a result uses `GenerationDetailModal`; personal history is the shared
 * `HistoryGrid`. Permanently dark, no app header (the Higgsfield host owns it).
 *
 * Flow: idle demo compare → Upload Media → pick enhancement strength → Enhance
 * → generating → before/after result (+ full-screen detail) → personal history.
 */

/** Demo assets standing in for a real portrait / enhanced pair. */
const DEMO_BEFORE = '/presets/cover.png'
const DEMO_AFTER = '/presets/how-product-works.png'

/** The (simulated) enhanced output shown once a generation finishes. */
const ENHANCED_RESULT = '/presets/explain.png'

/** Credit cost surfaced inside the Enhance CTA. */
const ENHANCE_COST = 4

/** Hero lifecycle: demo compare → uploaded portrait → busy → before/after result. */
type Stage = 'idle' | 'ready' | 'generating' | 'result'

const STRENGTHS = [
  { value: 'subtle', title: 'Subtle', subtitle: 'Light retouch, keeps texture' },
  { value: 'balanced', title: 'Balanced', subtitle: 'Even skin, natural look' },
  { value: 'strong', title: 'Strong', subtitle: 'Maximum smoothing' },
]

const STEPS = [
  {
    title: 'Upload your portrait',
    description: 'Add a selfie or portrait — a clear, well-lit face gives the best enhancement.',
    icon: IconCloudUploadOutlined,
  },
  {
    title: 'Pick a strength & enhance',
    description: 'Choose how much to retouch, then press Enhance to refine skin texture and tone.',
    icon: IconTuneOutlined,
  },
  {
    title: 'Compare & download',
    description: 'Drag the slider to compare original and enhanced, then download your result.',
    icon: IconCompareOutlined,
  },
]

/** Shared popup placement for the strength picker. */
const PICKER_POPUP = {
  size: 'picker',
  surface: 'solid',
  side: 'bottom',
  align: 'start',
  sideOffset: 8,
  collisionPadding: 16,
} satisfies Partial<Parameters<typeof Select.Content>[0]>

/** Enhancement-strength picker — two-line options behind a `SettingTrigger` row. */
function StrengthSelect() {
  return (
    <Select.Root defaultValue="balanced">
      <Select.Trigger bare render={<SettingTrigger label="Enhancement" />}>
        <Select.Value placeholder="Select strength" />
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {STRENGTHS.map(strength => (
          <Select.Item key={strength.value} value={strength.value}>
            <Select.ItemContent>
              <Select.ItemText>{strength.title}</Select.ItemText>
              <Select.ItemDescription>{strength.subtitle}</Select.ItemDescription>
            </Select.ItemContent>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

/** The Enhance generation CTA — marketing primary, cost shown as `{label} {✦} {credits}`. */
function EnhanceButton({ busy, onClick }: { busy?: boolean, onClick?: () => void }) {
  return (
    <Button
      variant="marketingPrimary"
      size="lg"
      className="w-full"
      disabled={busy}
      onClick={onClick}
      start={busy ? <Loader size="xs" color="neutral" /> : undefined}
      end={busy
        ? undefined
        : (
            <span className="flex items-center gap-2">
              <Sparkles width={14} height={14} />
              <span className="text-q-body-md-semi-bold">{ENHANCE_COST}</span>
            </span>
          )}
    >
      {busy ? 'Enhancing' : 'Enhance'}
    </Button>
  )
}

/** The centered generator card — the app's hero, mirroring the live page. */
function EnhancerCard() {
  // The portrait picked from the shared AssetLibraryModal.
  const [image, setImage] = useState<AssetSelection | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current != null)
      clearTimeout(timerRef.current)
  }, [])

  const handleUpload = (item: AssetSelection) => {
    setImage(item)
    setStage('ready')
  }

  const handleEnhance = () => {
    if (timerRef.current != null)
      clearTimeout(timerRef.current)
    setStage('generating')
    timerRef.current = setTimeout(() => setStage('result'), 2200)
  }

  const handleReset = () => {
    if (timerRef.current != null)
      clearTimeout(timerRef.current)
    setImage(null)
    setStage('idle')
  }

  const beforeSrc = image?.src ?? DEMO_BEFORE

  return (
    <Card
      surface="solid"
      className="flex w-full max-w-md flex-col items-center gap-6 rounded-q-600 border border-dashed border-q-border-subtle p-6 md:p-8"
    >
      {/* Visual — demo compare / uploaded portrait / generating / result compare. */}
      <div className="w-full max-w-70">
        {stage === 'idle'
          ? (
              <BeforeAfterCompare
                beforeSrc={DEMO_BEFORE}
                afterSrc={DEMO_AFTER}
                beforeAlt="Original portrait"
                afterAlt="Enhanced portrait"
                ratio={4 / 5}
              />
            )
          : stage === 'ready'
            ? (
                <Media ratio={4 / 5} rounded="md" className="w-full">
                  <Media.Image src={beforeSrc} alt={image?.name ?? 'Your portrait'} />
                </Media>
              )
            : stage === 'generating'
              ? <GenerationCard state="generating" ratio={4 / 5} generatingLabel="Enhancing" className="w-full" />
              : (
                  <BeforeAfterCompare
                    beforeSrc={beforeSrc}
                    afterSrc={ENHANCED_RESULT}
                    beforeAlt="Your original portrait"
                    afterAlt="Enhanced portrait"
                    beforeLabel="Original"
                    afterLabel="Enhanced"
                    ratio={4 / 5}
                  />
                )}
      </div>

      {/* Title + subtitle — always present, like the live hero. */}
      <div className="flex flex-col items-center gap-2 text-center">
        <Typography as="h1" variant="accent-xl-bold" color="primary" className="uppercase">
          Skin Enhancer
        </Typography>
        <Typography as="p" variant="body-md-regular" color="secondary">
          Upload your images to enhance skin texture and quality.
        </Typography>
      </div>

      {/* Action zone — swaps with the lifecycle stage. */}
      <div className="flex w-full flex-col gap-3">
        {stage === 'idle'
          ? (
              <AssetLibraryModal
                onSelect={handleUpload}
                trigger={(
                  <Button variant="secondary" size="lg" className="w-full" start={<Icon as={IconUploadOutlined} size="sm" />}>
                    Upload Media
                  </Button>
                )}
              />
            )
          : stage === 'result'
            ? (
                <>
                  <div className="flex gap-2">
                    <Button variant="marketingTertiary" size="lg" className="flex-1" start={<Icon as={IconDownloadOutlined} size="sm" />}>
                      Download
                    </Button>
                    <GenerationDetailModal
                      generation={{
                        src: ENHANCED_RESULT,
                        mediaType: 'image',
                        aspectRatio: 4 / 5,
                        fileType: 'JPG',
                        prompt: 'Skin enhancement — even tone, refined texture, natural retouch.',
                      }}
                      trigger={(
                        <Button variant="marketingTertiary" size="lg" iconOnly aria-label="Open full screen" start={<Icon as={IconFullScreenOutlined} size="sm" />} />
                      )}
                    />
                  </div>
                  <Button variant="ghost" size="md" className="w-full" onClick={handleReset} start={<Icon as={IconRefreshOutlined} size="sm" />}>
                    Enhance another photo
                  </Button>
                </>
              )
            : (
                // ready / generating — strength picker + Enhance CTA.
                <>
                  <StrengthSelect />
                  <EnhanceButton busy={stage === 'generating'} onClick={handleEnhance} />
                  {stage === 'ready'
                    ? (
                        <AssetLibraryModal
                          onSelect={handleUpload}
                          trigger={(
                            <Button variant="ghost" size="sm" className="w-full" start={<Icon as={IconUploadOutlined} size="sm" />}>
                              Change photo
                            </Button>
                          )}
                        />
                      )
                    : null}
                </>
              )}
      </div>
    </Card>
  )
}

/** Left rail — a floating "+" that opens the asset library (mirrors the live page). */
function AddRail() {
  return (
    <aside className="hidden shrink-0 md:block">
      <AssetLibraryModal
        trigger={(
          <button
            type="button"
            aria-label="Add media"
            className={card(
              { surface: 'solid' },
              'flex size-14 items-center justify-center rounded-q-250 border border-q-border-subtle text-q-icon-secondary transition-colors hover:border-q-border-strong hover:text-q-icon-primary focus-visible:outline-2 focus-visible:outline-q-border-focus',
            )}
          >
            <Icon as={IconAddOutlined} size="md" />
          </button>
        )}
      />
    </aside>
  )
}

/** "How it works in 3 steps" explainer row. */
function Steps() {
  return (
    <section className="flex flex-col gap-8">
      <Typography as="h2" variant="accent-lg-bold" color="primary" className="uppercase">
        How it works
        {' '}
        <span className="text-q-text-brand">in 3 steps</span>
      </Typography>
      <div className="grid gap-8 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="flex flex-col gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-q-400 bg-q-background-secondary">
              <Icon as={step.icon} size="md" color="secondary" />
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
  )
}

/** Personal history — the current user's own enhancements, via the shared grid. */
function History() {
  return (
    <section className="flex flex-col gap-6">
      <Typography as="h2" variant="accent-lg-bold" color="primary" className="uppercase">
        Your enhancements
      </Typography>
      <HistoryGrid />
    </section>
  )
}

export function SkinEnhancerTemplate() {
  return (
    <div className="min-h-dvh bg-q-background-primary">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-6 md:px-8 md:py-8">
        {/* Hero — floating "+" rail beside the centered generator card. */}
        <div className="flex justify-center gap-6">
          <AddRail />
          <EnhancerCard />
          {/* Spacer mirrors the rail width so the card stays visually centered. */}
          <div aria-hidden className="hidden w-14 shrink-0 md:block" />
        </div>

        <Steps />
        <History />
      </div>
    </div>
  )
}
