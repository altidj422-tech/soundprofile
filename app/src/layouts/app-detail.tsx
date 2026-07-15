import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import IconAddPhoto from '@material-symbols/svg-400/outlined/add_photo_alternate.svg?react'
import IconCloudUpload from '@material-symbols/svg-400/outlined/cloud_upload.svg?react'
import IconDownload from '@material-symbols/svg-400/outlined/download.svg?react'
import IconFullScreen from '@material-symbols/svg-400/outlined/fullscreen.svg?react'
import IconPets from '@material-symbols/svg-400/outlined/pets.svg?react'
import IconUnfoldMore from '@material-symbols/svg-400/outlined/unfold_more.svg?react'
import IconVisibilityOff from '@material-symbols/svg-400/outlined/visibility_off.svg?react'
import Sparkles from '@/assets/icon-sparkles-soft.svg?react'
import { Button } from '@higgsfield/quanta/button'
import { Card } from '@higgsfield/quanta/card'
import { Icon } from '@higgsfield/quanta/icon'
import { Media } from '@higgsfield/quanta/media'
import { Typography } from '@higgsfield/quanta/typography'
import { AssetLibraryModal } from '@/components/asset-library'
import { Dropzone, DropzonePreview } from '@/components/dropzone'
import { GenerationCard } from '@/components/generation-card'
import type { TemplateOption } from '@/components/template-modal'
import { TemplateModal } from '@/components/template-modal'

/**
 * App-detail screen template (Figma Apps / Animal App, node 3309:86269). The
 * public landing page for a single Higgsfield "app": a two-column generator hero
 * (inputs on the left, a large preview on the right) and a "how it works in 3
 * steps" explainer. Quanta components + tokens only; the app-specific inputs
 * (`Dropzone`) are a small composition in `@/components`. No app header — the
 * Higgsfield host owns that.
 */

const HERO_PREVIEW = '/presets/cover.png'

/** The image shown once a (simulated) generation finishes. */
const HERO_RESULT = '/presets/explain.png'

/** Right-pane lifecycle: static preview → animating placeholder → finished result. */
type HeroStage = 'idle' | 'generating' | 'result'

const COVERS = [
  '/presets/how-product-works.png',
  '/presets/explain.png',
  '/presets/hyper-motion.png',
  '/presets/cover.png',
] as const

/** Animal presets offered by the "Select Animal" picker (Figma "All Presets"). */
const ANIMALS: TemplateOption[] = [
  { id: 'deer', label: 'Deer', image: COVERS[3] },
  { id: 'dalmatian', label: 'Dalmatian', image: COVERS[0] },
  { id: 'raccoon', label: 'Raccoon', image: COVERS[1] },
  { id: 'lion', label: 'Lion', image: COVERS[2] },
  { id: 'fox', label: 'Fox', image: COVERS[3] },
  { id: 'panda', label: 'Panda', image: COVERS[0] },
  { id: 'owl', label: 'Owl', image: COVERS[1] },
  { id: 'tiger', label: 'Tiger', image: COVERS[2] },
]

const STEPS: { title: string, description: string, preview: ReactNode }[] = [
  {
    title: 'Upload your image',
    description: 'Choose an image or drag and drop a file. Add a portrait, selfie, or any photo with a character.',
    preview: (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-q-300 border border-dashed border-q-border-subtle px-8">
        <Icon as={IconCloudUpload} size="md" color="secondary" />
        <div className="flex flex-col items-center gap-1 text-center">
          <Typography as="span" variant="body-sm-semi-bold" color="primary" className="uppercase">
            Upload image or drag &amp; drop
          </Typography>
          <Typography as="span" variant="caption-xs-regular" color="secondary">
            PNG, JPG or Paste from clipboard
          </Typography>
        </div>
      </div>
    ),
  },
  {
    title: 'Press generate',
    description: 'Click the button and transform your photo according to the preset you\u2019re in.',
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
    description: 'Your image or video is ready! Download and enjoy the final result.',
    preview: (
      <div className="flex h-full items-center justify-center p-6">
        <Media ratio={3 / 4} rounded="md" className="h-full w-auto max-w-full ring-4 ring-white">
          <Media.Image src={COVERS[1]} alt="Generated result preview" />
        </Media>
      </div>
    ),
  },
]

/**
 * The finished-result card's on-hover controls (Figma node 3139:160610): two
 * glass buttons — Download + Full Screen — revealed at the bottom on hover /
 * keyboard focus. Composed into the `GenerationCard` frame via its `children`.
 */
function ResultHoverControls() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
      <Button
        variant="marketingTertiary"
        size="md"
        className="pointer-events-auto"
        start={<Icon as={IconDownload} size="sm" />}
      >
        Download
      </Button>
      <Button
        variant="marketingTertiary"
        size="md"
        className="pointer-events-auto"
        start={<Icon as={IconFullScreen} size="sm" />}
      >
        Full Screen
      </Button>
    </div>
  )
}

/** The generator hero — inputs on the left, a large preview on the right. */
function Hero() {
  // The two input tiles start EMPTY and flip to their filled preview once the
  // user picks an image (via AssetLibraryModal) or an animal (via TemplateModal).
  const [image, setImage] = useState<string | null>(null)
  const [animal, setAnimal] = useState<TemplateOption | null>(null)

  // Right pane state machine: idle preview → generating (animated card) → result.
  // The transition is a simulated backend (no real job); the timer is created in
  // a handler and cleared on unmount, so nothing touches `window` during SSR.
  const [stage, setStage] = useState<HeroStage>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current != null)
      clearTimeout(timerRef.current)
  }, [])

  const handleGenerate = () => {
    if (timerRef.current != null)
      clearTimeout(timerRef.current)
    setStage('generating')
    timerRef.current = setTimeout(() => setStage('result'), 2000)
  }

  return (
    <Card
      surface="solid"
      className="flex flex-col gap-2 rounded-q-600 border border-q-border-subtle p-2 lg:flex-row"
    >
      <div className="flex flex-1 flex-col gap-8 px-4 py-5">
        <div className="flex flex-col gap-2">
          <Typography as="h1" variant="accent-xl-bold" color="primary" className="uppercase">
            Animal App
          </Typography>
          <Typography as="p" variant="body-md-regular" color="secondary">
            Upload your photo and get images of you surrounded by animals.
          </Typography>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-1 gap-3">
            <AssetLibraryModal
              onSelect={item => setImage(item.src)}
              trigger={(
                <Dropzone
                  render={<button type="button" />}
                  icon={IconAddPhoto}
                  title="Upload Image"
                  subtitle="PNG, JPG or Paste from Clipboard"
                  preview={image != null
                    ? <DropzonePreview src={image} alt="Selected image" />
                    : undefined}
                />
              )}
            />
            <TemplateModal
              title="Select Animal"
              options={ANIMALS}
              value={animal?.id}
              onSelect={setAnimal}
              trigger={(
                <Dropzone
                  render={<button type="button" />}
                  border="solid"
                  icon={IconPets}
                  title="Select Animal"
                  subtitle="Choose animals to appear around you"
                  preview={animal != null
                    ? <DropzonePreview src={animal.image} alt={animal.label} label={animal.label} icon={IconPets} />
                    : undefined}
                />
              )}
            />
          </div>

          <Button
            variant="marketingPrimary"
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            end={
              <span className="flex items-center gap-2">
                <Sparkles width={18} height={18} />
                <span className="text-q-body-lg-semi-bold">5</span>
              </span>
            }
          >
            Generate
          </Button>
        </div>
      </div>

      <div className="relative flex-1">
        {stage === 'generating'
          ? (
              <GenerationCard
                state="generating"
                ratio={671 / 560}
                className="h-full w-full"
              />
            )
          : stage === 'result'
            ? (
                <GenerationCard
                  ratio={671 / 560}
                  src={HERO_RESULT}
                  alt="Generated result — person surrounded by animals"
                  className="group h-full w-full"
                >
                  <ResultHoverControls />
                </GenerationCard>
              )
            : (
                <Media ratio={671 / 560} rounded="md" className="h-full w-full">
                  <Media.Image src={HERO_PREVIEW} alt="Person surrounded by animals" />
                  <Media.Overlay placement="center" className="pointer-events-none justify-center">
                    <span className="flex h-9 items-center rounded-q-full bg-q-transparent-dark-40 px-1 text-q-icon-inverse backdrop-blur-sm">
                      <Icon as={IconUnfoldMore} size="sm" className="rotate-90" />
                    </span>
                  </Media.Overlay>
                </Media>
              )}
      </div>
    </Card>
  )
}

/** "How it works in 3 steps" explainer row. */
function Steps() {
  return (
    <section className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <Typography as="h2" variant="accent-lg-bold" color="primary" className="uppercase">
          How it works
          {' '}
          <span className="text-q-text-brand">in 3 steps</span>
        </Typography>
        <Button variant="tertiary" size="sm" start={<Icon as={IconVisibilityOff} size="sm" />}>
          Hide tip
        </Button>
      </header>

      <div className="grid gap-10 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="flex flex-col gap-4">
            <div className="h-60 overflow-hidden rounded-q-400 bg-q-background-secondary">
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
  )
}

export function AppDetailTemplate() {
  return (
    <div className="min-h-dvh bg-q-background-primary">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-6 md:px-8 md:py-8">
        <Hero />
        <Steps />
      </div>
    </div>
  )
}
