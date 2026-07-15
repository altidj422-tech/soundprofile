import type { MediaRef } from '../types'
import type { MediaContext, MediaGetOptions } from './types'
import { observeAsync } from '../observability'
import { REF_TYPE_BY_UPLOAD } from './types'

interface RawMedia {
  id?: string
  url?: string
  type?: string
}

/**
 * Get a single media item by id. The backend route is per-type (image/video/
 * audio), so the type must be supplied — the adapter routes on it. Normalizes
 * the raw payload to a `MediaRef` usable as a job input: the backend's own
 * discriminator wins (fetched media can carry a job type like
 * `nano_banana_job`, valid on the wire), else the plane's input type — the
 * same vocabulary upload produces, so get-then-submit matches upload-then-submit.
 */
export async function getMedia(ctx: MediaContext, id: string, type: MediaGetOptions['type']): Promise<MediaRef> {
  return observeAsync(ctx.observability, 'fnf.media.get', { media_id: id, media_type: type }, async () => {
    const raw = (await ctx.mediaAdapter.getMedia({ id, type }) ?? {}) as RawMedia
    return {
      id: raw.id ?? id,
      type: raw.type ?? REF_TYPE_BY_UPLOAD[type],
      ...(raw.url ? { url: raw.url } : {}),
    }
  }, {
    successAttributes: ref => ({ ref_type: ref.type }),
  })
}
