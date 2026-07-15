# Vendored Higgsfield packages

This directory contains local workspace snapshots synced from the fnf-web
repository. Do not manually edit their source in generated apps unless the task
explicitly asks to patch a package snapshot.

- `@higgsfield/fnf` — SDK core: jobs, media, profile, observability, adapters.
- `@higgsfield/fnf-react` — React provider, TanStack Query options, cache door,
  controllers.
- `@higgsfield/quanta` — Higgsfield design tokens, CSS entries, and React
  components.

To refresh managed snapshots from a local checkout:

```bash
HIGGSFIELD_REPO=/Users/dastantynyshtyk/Documents/fnf-web \
FNF_REF=HEAD \
QUANTA_REF=HEAD \
bun run sync:packages
```

The sync writes `packages/.snapshot.json` with source commits, bundle artifact
name/SHA256, actor, sync mode, and timestamp. After syncing, run `bun install`
at the app root so workspace links and `bun.lock` match the new snapshots.

Before using or editing a vendored package, read its guide:

- `packages/fnf/ai/AGENTS.md`
- `packages/fnf-react/ai/AGENTS.md`
- `packages/quanta/ai/AGENTS.md`

Template-owned infrastructure lives under `app/src/module/**`. The
Supercomputer Design mode child bridge is `app/src/module/design-inspector`.
