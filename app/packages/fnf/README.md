# @higgsfield/fnf

Isomorphic generation + media + profile client shared across web, server,
Figma, and Adobe UXP. The core is zero-I/O: it depends only on
transport-agnostic backend ports. You hand it a concrete **adapter** and the
SDK handles validation, bidirectional param codecs, submission, polling, media
upload/resolve, profile/workspace reads, and the typed error catalog.

See `docs/superpowers/specs/2026-06-05-generation-core-design.md` for the design (note
the drift banner at its top — the implemented API is what this README and `src/` show).

## Quick start

All normal configuration goes through constructors. The SDK itself is
adapter-based and does not force one backend origin for every host. Supercomputer
generated apps use `https://fnf.internal` by policy, while product apps,
dev sandboxes, service integrations, tests, and future hosts can choose the
adapter/transport that matches their backend contract.

Built-in adapters:

- `createFnfWebAdapter({ baseUrl, getToken })` — in-app: user-scoped Clerk
  Bearer auth (`getToken` is an async token source). Pass `workspaceId` when a
  host wants explicit workspace scoping through the `hf-workspace-id` header.
- `createDevFnfWebAdapter({ userId, workspaceId })` — dev backend only: sends
  the `hf-dev-user-id` header, acting on behalf of that user (honored by the
  backend only on non-prod); the base URL defaults to `DEV_FNF_BASE_URL`.
- `createWorkflowPlatformAdapter({ baseUrl: 'https://fnf.internal' })`
  — the ONE adapter bundled in this package (`@higgsfield/fnf/workflow-platform`),
  so generated-app hosts that vendor only `@higgsfield/fnf` are self-sufficient.
  Generated-app/Supercomputer path: sends logical operations through only
  `/user`, `/workspaces`, and `/jobs`; the platform behind fnf.internal owns
  final internal routing. Generated apps should not pass tokens or alternate
  backend URLs.

If you are building another web app with a different approved backend endpoint,
do not copy the generated-app restriction blindly. Use the matching adapter
(`createFnfWebAdapter`, `createDevFnfWebAdapter`, `createAppsMarketplaceAdapter`)
or implement the backend ports with a custom adapter/transport.

```ts
import { createJobClient } from '@higgsfield/fnf/client'
import { createProfileClient } from '@higgsfield/fnf/profile'
import { nanoBanana2, seedance2_0 } from '@higgsfield/fnf/jobs'
import { createWorkflowPlatformAdapter } from '@higgsfield/fnf/workflow-platform'

const adapter = createWorkflowPlatformAdapter({
  baseUrl: 'https://fnf.internal',
})
// For non-generated hosts, replace the adapter above with the adapter that
// matches that host's backend/auth contract.
const client = createJobClient({
  adapter,
  jobs: [nanoBanana2, seedance2_0], // the source of per-model autocomplete
})
const profile = createProfileClient({ profileAdapter: adapter })

// Submit (does not wait for completion). `model` autocompletes to a registered
// jobSetType and `settings` is typed to that model's schema.
const { generations } = await client.submit({
  model: 'nano_banana_2',
  prompt: { instruction: 'a blue cat' },
  settings: { aspectRatio: '1:1', resolution: '2k' },
})

// Poll the batch to terminal states. Throws JobTimeoutError if a job does not
// reach a terminal status within poll.timeoutMs (default 600000ms).
const [done] = await client.wait(generations)
console.log(done.status, done.results?.rawUrl)

// Profile/workspace reads share the same adapter.
const snapshot = await profile.getSnapshot()
console.log(snapshot.user?.email, snapshot.credits?.totalAvailableCredits)

// Regenerate is just submitting the parsed input back. The read model carries
// `model: string`, so cast onto the typed submit input (it is runtime-validated).
await client.submit(done.input as Parameters<typeof client.submit>[0])
```

### Offline / tests

`createMemoryBackend()` (from `@higgsfield/fnf-adapters`) is an in-process
backend (no network) that completes jobs immediately — use it for tests, demos,
and offline development.

```ts
import { createMemoryBackend } from '@higgsfield/fnf-adapters'

const client = createJobClient({ adapter: createMemoryBackend(), jobs: [nanoBanana2] })
```

## Three domains, separate factories

The SDK is one package with three capability families. They are **separate
factories** behind **separate entry points**, so a jobs-only frontend does not
need to pull media/profile code unless it imports those entries:

```ts
import { createJobClient } from '@higgsfield/fnf/client'  // submit/adjust/get/poll/wait/cancel/list/cost
import { nanoBanana2 } from '@higgsfield/fnf/jobs'          // the model catalog + defineJob toolkit
import { createMediaClient } from '@higgsfield/fnf/media' // get/list/resolve/upload
import { createProfileClient } from '@higgsfield/fnf/profile' // user/workspaces/wallet/credits/switch
import { createWorkflowPlatformAdapter } from '@higgsfield/fnf/workflow-platform'

const adapter = createWorkflowPlatformAdapter({
  baseUrl: 'https://fnf.internal',
})
// Replace this adapter in product/dev/custom hosts as needed.
const media = createMediaClient({ mediaAdapter: adapter })
const profile = createProfileClient({ profileAdapter: adapter })
const ref = await media.get('m1', 'image') // get-by-id is per-type
const upload = await media.upload({ source: fileBytes, filename: 'cat.png' })
const credits = await profile.getCredits()
```

The seam between them: media ops produce a `MediaRef`, which drops into
`client.submit({ media: { <role>: ref } })`. Upload produces; submit consumes.

## Surface

**Jobs** (`createJobClient`, `@higgsfield/fnf/client`; model catalog at `@higgsfield/fnf/jobs`):
- `submit` / `safeSubmit` — submit `count` jobs (a client-side fan-out; a model's
  `batchSize` setting is a separate, per-job wire param — total outputs =
  `count × batchSize`). A partial fan-out failure returns the successes plus a
  structured `failed: ApiJobErrorJSON[]` and a display `warning`. `safeSubmit`
  returns a serializable `{ ok, ... } | { ok: false, error }` for Comlink/iframe
  boundaries instead of throwing.
- Confirmation gate: hosts that submit on behalf of a user must pass `confirm`
  (a `ConfirmSubmit`) to the adapter factory — a confirmation modal, minimally a
  `window.confirm` wrapper. `submit` runs it once per submission after
  validation, before any network call; a resolved string token is sent as
  top-level `confirmation_token` on the create request; a rejection aborts with
  the typed `confirmation_rejected` error (user declined — branch on
  `error.code`, don't treat as failure).
- `adjust(input, kinds)` — opt-in normalization: snaps the requested kinds
  (`'near-aspect-ratio'`, `'near-duration'`) to the nearest allowed values and
  returns `{ input, adjustments }`. `submit` itself never normalizes — it sends
  settings as provided (the backend clamps).
- `get` / `poll` / `wait` — fetch and poll to terminal status; `onProgress` fires
  on every poll tick; `poll`/`wait` throw `JobTimeoutError` (carrying the
  last-known generation) on deadline. While the scheduler reports inactive
  (backgrounded tab) the poll timeout does not tick down. Generations sharing a
  `jobSetId` are polled as ONE set via the adapter's optional `getJobSet`
  (one request per tick per batch) — which is also what enforces the fnf IP
  gate: a `completed` job whose `ip_check_finished` is still false maps to the
  non-terminal `ip_detect` and keeps polling (those fields exist only on the
  `/job-sets/{id}` payload).
- Cancellation: `poll`/`wait` (and `upload` on the media half) take
  `signal?: AbortSignal` and stop at the next checkpoint with the typed
  `JobAbortedError` (code `'aborted'`); `cancel(id)` cancels SERVER-side via
  `PUT /jobs/{id}/cancel` — only `queued` jobs are cancellable, and the
  backend refunds the credits. Adapters without `cancelJob` throw typed
  `cancel_not_supported`.
- Targeting: `folderId` (wire `folder_id`) files the generation into a folder;
  `parentId` (wire `parent_id`) links a derived job (upscale/outpaint/…) to its
  source job set — read back via `generation.parentJobSetId`, list children via
  `list({ parentId })`.
- `list` / `cost` — list past generations; estimate display credits. `list` rides
  `GET /jobs` (cursor feed; the prod route has no `parentId` filter — that
  query throws typed `not_supported`). `cost` answers from a local
  `credits(input)` calculator when the job declares one, else asks the
  backend. Local calculators return product-display credits, not wallet
  credit-cents: Seedance 2.0 `5s × 4.5 credits/s` displays as `23`.
  Backend-only cost routes can still return their route's native shape; handle
  typed `not_supported` for generic tooling.

**Media** (`createMediaClient`, `@higgsfield/fnf/media`):
- `get` — get one media by id (per-type route).
- `list` — list uploaded media (no prod route — the fnf adapters throw typed `not_supported`).
- `resolve` — normalize URLs / structured refs (and, with an injected `resolveJob`, job ids) into `MediaRef`s.
- `upload` — bytes → presign → PUT → confirm → submit-ready `MediaRef` (one call). `uploadFromUrl`
  downloads then uploads — NOTE: the default fetcher is NOT SSRF-hardened; in a
  server/untrusted-URL context inject a `BinaryUploader` whose `fetchBytes`
  enforces private-IP rejection, redirect policy, and byte caps. `getUploadUrl`/`confirm` expose the steps; `safeUploadMedia` is the
  no-throw variant. The binary PUT runs through an injected `BinaryUploader`
  (`createFetchUploader()` by default) so it works under Node / browser / Figma / UXP.
  The fnf adapters route each kind to its product upload plane (`/media/batch`,
  `/video`, `/audio`) and the ref carries the matching discriminator
  (`media_input` / `video_input` / `audio_input`); `extra` rides into the
  presign/confirm bodies (the product sends `force_ip_check`/`surface` there).

```ts
const ref = (await media.upload({ source: fileBytes, filename: 'cat.png' })).ref
await jobClient.submit({ model: 'nano_banana_2', media: { image: [ref] }, prompt: { instruction: 'restyle' }, settings: { aspectRatio: '1:1' } })
```

Strict browser/server bridge rule: do not put `File`, `Blob`, `ArrayBuffer`,
`Uint8Array`, base64 strings, or arrays of bytes into JSON request bodies or
`createServerFn` input. Upload browser files with multipart `FormData` to an
app-local `POST /api/media/upload` route, read `await file.arrayBuffer()`
server-side, call `media.upload({ source: new Uint8Array(buffer), ... })`, and
return only the `MediaRef`. A later generation request should send
prompt/settings/refs only. Invalid JSON-shaped upload sources fail early with
`invalid_media_source`.

Every operation is also a free function over a shared context (`createContext` for jobs,
`createMediaContext` for media), so you can call `submit(ctx, input)` without the full client.

**Profile** (`createProfileClient`, `@higgsfield/fnf/profile`):
- `getUser()` — current account/user profile, camelCase fields such as
  `workspaceId`, `workspaceType`, `workspaceRole`, `planType`,
  `billingPeriod`, `totalPlanCredits`.
- `listWorkspaces()` / `getCurrentWorkspace()` — workspace list/details,
  camelCase fields such as `clerkOrganizationId`, `avatarUrl`, `isOwner`.
- `getWallet()` — raw wallet balances from `/workspaces/wallet`, still in
  backend credit-cent units.
- `getCredits({ includeOnDemand? })` — wallet-first normalized display
  credits. Display values are divided by 100; the `raw` property keeps the
  original credit-cent values.
- `getSnapshot()` — composed `{ user, workspaces, currentWorkspace, wallet,
  credits }`.
- `switchWorkspace({ workspaceId })` — posts backend workspace context and
  returns a fresh snapshot. Host apps remain responsible for mirroring the
  choice into Clerk/session metadata or adapter header state.

## Adapters (the transport boundary)

Three ports: `GenerationBackend` (`createJobs`/`getJob`/`listJobs`/`estimateCost`,
plus the optional host-injected `confirm` submission gate),
`MediaBackend` (`getMedia`/`listMedia`, plus optional `getUploadUrl`/
`confirmMedia`), and `ProfileBackend` (`getUser`/`listWorkspaces`/
`getCurrentWorkspace`/`getWorkspaceWallet`/`switchWorkspace`). Every generation
adapter factory below accepts a `confirm` option and surfaces it on the port;
hosts submitting for a user must provide it (modal, or minimally a
`window.confirm` wrapper — see the confirmation-gate bullet under Surface).
Pick or write a concrete adapter:

- `createFnfWebAdapter` — the product fnf surface (`POST /jobs/{type}` /
  `POST /jobs/v2/{type}`, `GET /jobs/{id}`, `POST /media/batch` presign,
  `POST /media/{id}/upload` confirm, `GET /input-{type}s/{id}`, `GET /user`,
  `GET /workspaces`, `GET /workspaces/details`, `GET /workspaces/wallet`,
  `POST /workspaces/context`) with Bearer auth via an injected async
  `getToken`. One object satisfies all ports, so it plugs into
  `createJobClient`, `createMediaClient`, and `createProfileClient`.
- `createDevFnfWebAdapter` — the dev flavor of the same surface: the
  `hf-dev-user-id` header (`userId`) against the dev backend.
- `createWorkflowPlatformAdapter` — the fnf.internal Workflow Platform surface
  for generated apps and Supercomputer flows. It does not know model-specific
  fnf routes: submit/cost/cancel/media operations go through static `/jobs/*`
  routes such as `POST /jobs/submit`, reads go through static `/jobs/*` and
  `/workspaces/*` routes, and profile reads go through `/user`. Generated apps
  should use `baseUrl: 'https://fnf.internal'` server-side and should not pass
  `getToken`, `Authorization`, dev user ids, or service secrets.
- Custom adapters/transports — for other approved web apps or endpoint surfaces,
  implement the `GenerationBackend`, `MediaBackend`, and `ProfileBackend` ports
  instead of hardcoding route logic in UI code.
- `createMemoryBackend` / `createMemoryMediaAdapter` / `createMemoryProfileAdapter`
  — in-process test/offline stubs.
- Adobe UXP needs a Comlink-based adapter (UXP webviews forbid direct `fetch`); none
  ships yet — implement the ports over the host bridge.

## Defining a job

```ts
import { defineJob, z } from '@higgsfield/fnf'

export const myModel = defineJob({
  jobSetType: 'my_model', // the only identity the backend needs (POST /jobs)
  outputType: 'image',
  // `params` mirrors the backend wire `params` object: the prompt/media
  // envelopes (serialized by their codecs) plus the scalar settings fields.
  params: {
    prompt: true, // opt in to the standard prompt group; omit if the job takes no prompt
    media: { field: 'input_images', format: 'unwrapped', roles: ['image'] }, // omit if no media
    settings: {
      aspectRatio: z.wire('aspect_ratio', z.aspectRatio(['1:1', '16:9'])), // typed camelCase, snake_case on the wire
      resolution: z._default(z.enum(['1k', '2k', '4k']), '1k'),
    },
  },
})
```

`prompt`/`media` appear in the typed submit input **only when the job declares them**,
and `media` keys are narrowed to the declared `roles`. A settings key is its own wire
key unless tagged with `z.wire('wire_name', schema)`.

### Serialization lifecycle (`finalize` / `restore`)

One pipeline, two optional job-level hooks:

```
submit: input → codecs + settings assemble the wire body → finalize(wire, input) → POST
get:    stored params → restore(params) overlay → codecs + settings parse → input
```

`finalize` is the job's last touch on the assembled body — derive fields
(seedance folds `mode` into the wire `model`), compute width/height, inject
the constants the product surface always sends (soul's `version: 3`). When a
finalize DELETES or renames a settings key, declare `restore` — its inverse —
returning the wire-keyed entries to overlay on stored params, so
get-then-resubmit round-trips the original settings instead of falling back
to schema defaults (a fetched fast generation must resubmit as fast).

### Media rules (cardinality + intrinsic meta)

`media.counts` caps refs per role; `media.rules` holds cross-role combinators —
cardinality (`requiresOneOf`, `atLeastOneOf`, `maxTotal`) and **meta rules** that
judge a ref's intrinsic size/duration (`dimensionsWithin`, `durationsWithin`):

```ts
rules: [
  requiresOneOf('audio', ['image', 'video']),           // audio-only unsupported
  maxTotal(['image', 'start_image', 'end_image'], 9),
  dimensionsWithin(['image'], { minSide: 300, maxSide: 6000, ratio: [0.4, 2.5] }),
  durationsWithin(['video', 'audio'], { each: [2, 15], total: 15 }),
],
```

Meta rules read `MediaRef.meta` (`width`/`height`/`durationSec`) and SKIP refs
whose meta is unknown — meta is local knowledge, the backend re-validates
regardless. Meta also drives the product's `auto` aspect-ratio resolution: with
a measured first image attached, seedance/nano-banana-2 snap `auto` to the
closest concrete ratio exactly like the app does (without meta, the documented
fallbacks apply). Populate it from data the app already has, or opt in to the
async measurement step before validating/submitting (mirrors `adjust`):

```ts
import { createDomMediaMetaResolver, resolveMediaMeta } from '@higgsfield/fnf/media'

const measured = await resolveMediaMeta(input, createDomMediaMetaResolver())
await client.submit(measured) // meta rules now judge every ref
```

`meta` never reaches the wire — the codec serializes only `id`/`type`/`url`.

## Current model catalog highlights

The root and `@higgsfield/fnf/jobs` barrels export the current SDK catalog.
Public settings are camelCase and mapped to backend wire names with `z.wire`.

Image models:
- `soulV2Image` (`text2image_soul_v2`) and `soulCinemaImage`
  (`soul_cinematic`)
- `gptImage2` (`gpt_image_2`)
- `seedreamV4_5`
- `nanoBanana2` (`nano_banana_2`) and `nanoBananaFlash`
  (`nano_banana_flash`)
- `recraftV41Image`

Video models:
- `seedance2_0` with `settings.mode: 'std' | 'fast'`
- `kling3_0`, `kling3MotionControl`
- `happyHorse`
- `grokImagine`, `grokImagineV15`
- `veo3_1Lite`
- `wan27`

Upscale apps:
- `topazImageUpscale`, `topazImageGenerativeUpscale`,
  `nanoBanana2Upscale`
- `topazVideoUpscale`, `higgsfieldVideoUpscale`,
  `soraEnhanceVideo`, `bytedanceVideoUpscale`

When adding a model, keep the product parity contract: declare params under
`src/jobs`, export from `src/jobs/index.ts` and the root barrel, map wire names
with `z.wire`, add validations/media limits/defaults/credits, update adapter
route/body behavior when needed, and add product-parity tests plus typed API
coverage.
