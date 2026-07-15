# @higgsfield/fnf-react

React bindings for `@higgsfield/fnf` — the layer that makes building a new
Higgsfield-style frontend fast, without leaking the SDK's internals or
inventing restrictions the SDK doesn't have.

AI agents generating React integration code should read `ai/AGENTS.md` first;
it is the operational guide for provider/query/cache/controller patterns.

The split is by shape, not by fashion:

- **Pull-shaped reads → TanStack Query.** Feeds, job sets, single
  generations are request-shaped data; the package ships `queryOptions`
  factories (the v5 library pattern) and a **cache door** instead of its own
  cache. You bring the `QueryClient`.
- **Push-driven processes → controllers.** A submit run and an upload list
  are stateful machines with supersede/abort semantics no request cache
  models; they stay framework-agnostic `ExternalStore` controllers with thin
  `useSyncExternalStore` hooks.
- **Clients come from one provider.** Hosts can inject the SDK adapter once,
  then read stable jobs/media/profile clients from hooks. The package still
  has no auth, billing, routing, copy, or UI opinions.

Design rules this package holds itself to:

- **Errors are state, not throws.** `run.start`/uploads never reject — typed
  `ApiJobError` values land in observable state; per-generation verdicts stay
  on each generation's own `status`. Rendering and policy belong to the app.
- **No invented limits.** Clients are injected through structural ports;
  options pass through verbatim; defaults (the 5s poll cadence, `staleTime`)
  are documented and overridable by spreading over the returned options.
- **Keys are a public contract.** Apps invalidate and read by `fnfKeys` —
  always build keys through the factories, never inline the literals.

## Provider and scope

```tsx
import { createFnfWebAdapter, soulV2Image } from '@higgsfield/fnf'
import { FnfProvider, useFnfJobClient, useFnfProfileClient, useFnfScopeKey } from '@higgsfield/fnf-react'

const adapter = createFnfWebAdapter({ baseUrl, getToken })

// Put TanStack's QueryClientProvider above any query hooks. FnfProvider only
// creates stable SDK clients and carries the registry/scope.
<FnfProvider adapter={adapter} jobs={[soulV2Image]} scopeKey={`${userId}:${workspaceId}`}>
  <WorkspaceApp />
</FnfProvider>

function WorkspaceApp() {
  const jobs = useFnfJobClient()
  const profile = useFnfProfileClient()
  const scopeKey = useFnfScopeKey()
  // pass { scopeKey } into query helpers when you need workspace-separated caches
}
```

Existing keys are unchanged: `fnfKeys.job(id)` is still
`['fnf', 'job', id]`. Scoped variants are additive:
`fnfKeys.job(id, { scopeKey })`, `fnfKeys.jobs(query, { scopeKey })`,
`fnfKeys.profileSnapshot({ scopeKey })`.

## Queries — the pull side

```tsx
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { flattenFeedPages, generationQueryOptions, jobSetQueryOptions, jobsFeedQueryOptions } from '@higgsfield/fnf-react'

// One generation, live until it settles (5s cadence, stops at terminal,
// then immutable). A deep link, a recreate flow, a single tile.
const { data: generation } = useQuery(generationQueryOptions(client, jobId))

// One batch, ONE request per tick for the whole set (client.getSet).
// Realtime glue is one line: an event for the set is
// queryClient.invalidateQueries({ queryKey: fnfKeys.jobSet(id) }).
const { data: members } = useQuery(jobSetQueryOptions(client, jobSetId))

// The feed: cursor pagination, query verbatim to client.list.
const feed = useInfiniteQuery({
  ...jobsFeedQueryOptions(client, { type: 'video' }, { scopeKey }),
  select: flattenFeedPages, // pages → deduplicated list (MapPool semantics)
})
feed.data?.map(g => <Tile key={g.id} generation={g} />)
feed.fetchNextPage(); feed.hasNextPage; feed.isFetchNextPageError
```

The feed is **door-driven**: pages are fresh forever by default
(`staleTime: Infinity`) and change through exactly three moves —
`applyGenerations` (live updates fold in), `prependGenerations` (a fresh
submit appears), `invalidateQueries(fnfKeys.jobs(query))` (the explicit hard
refresh). Spread your own `staleTime` over the options if you want
refetch-on-focus semantics instead.

## The cache door

```tsx
import { applyGenerations, foldGeneration, prependGenerations } from '@higgsfield/fnf-react'

applyGenerations(queryClient, generations, { scopeKey }) // fold into EVERY scoped entry that holds them
prependGenerations(queryClient, { type: 'video' }, run.generations, { scopeKey }) // optimistic head insert, ONE named feed
```

TanStack is a non-normalizing document cache — one generation lives as
copies under many keys. The door makes that safe: every write goes through
`foldGeneration` (terminal anti-regress — a stale read can never roll back a
settled generation; reference stability — an unchanged snapshot keeps the
previous object, so memoized tiles don't re-render). The door **updates, it
never seeds**: unknown ids are ignored, membership belongs to fetches and
`prependGenerations`. Which feeds should show a fresh submit is product
policy — the fan-out stays your explicit call.

## Controllers — the push side

```tsx
import { useAttachments, useGenerationRun } from '@higgsfield/fnf-react'

// Submit: idle → submitting → generating → completed | failed | aborted.
// Starting again supersedes the previous run; every commit folds the live
// snapshots into the query cache through the door (needs a QueryClientProvider).
const run = useGenerationRun(client, { scopeKey })
run.start({ model: 'seedance_2_0', prompt: { instruction }, media: { start_image: refs }, settings })
run.generations; run.error?.code; run.isRunning

// Attachments: files in → previews now → submit-ready MediaRefs out.
// Per-item lifecycle: uploading → ready | blocked (moderation as state) | failed (retryable).
const attachments = useAttachments(media, { upload: { forceIpCheck: true } })
attachments.add([...files], { role: 'start_image' })
const refs = await attachments.settled() // waits out in-flight uploads
```

Attachments measure intrinsic size/duration into `MediaRef.meta` from the
local file (off by `measure: false`) — best-effort by contract, a failed
measurement never fails the upload. `Realtime` + `RefCountPool` stay as the
transport-agnostic channel-sharing pattern (one connection per job set,
refcounted, grace window); wire its `emit` to `invalidateQueries` and the
queries above pick up the rest.

## Profile and workspace

```tsx
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  profileSnapshotQueryOptions,
  switchWorkspaceMutationOptions,
  useFnfProfileClient,
} from '@higgsfield/fnf-react'

const profile = useFnfProfileClient()
const snapshot = useQuery(profileSnapshotQueryOptions(profile, { scopeKey }))

const switchWorkspace = useMutation(
  switchWorkspaceMutationOptions(profile, queryClient, {
    scopeKey,
    nextScopeKey: data => `${data.user?.id}:${data.currentWorkspace?.id}`,
    onWorkspaceChanged: data => updateHostSession(data),
  }),
)
```

`switchWorkspaceMutationOptions` calls the SDK profile client, writes the
returned snapshot into profile caches, and removes generation/cost caches for
the old scope. Host apps remain responsible for Clerk/session metadata,
headers, redirects, and product copy.

## Request helpers

```tsx
import { costQueryOptions, getWirePreview } from '@higgsfield/fnf-react'

const preview = getWirePreview(input, jobs) // local validation + built wire params
const cost = useQuery(costQueryOptions(jobClient, input, { scopeKey, enabled: preview.ok }))
```

Display `cost.data?.credits` directly for model previews. Profile wallet raw
balances are credit-cents, but `profileSnapshot.credits` values from the SDK
profile domain are already normalized display credits.

## What this package deliberately is NOT

- Not a second cache — TanStack owns caching; the package owns the domain
  rules of writing into it.
- Not a UI kit and not product policy — no toasts, no plan gates, no copy.
- Not a second SDK — everything it exposes is the SDK's own domain model
  (`Generation`, `MediaRef`, `ApiJobError`).
