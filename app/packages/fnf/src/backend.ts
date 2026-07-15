/**
 * The transport-agnostic ports the client cores depend on. Operations are
 * expressed as intent ("create these jobs", "get this media") — NOT as HTTP
 * requests. An HTTP/REST adapter (`createDevFnfWebAdapter`)
 * is one implementation; a websocket, a different service, or in-process code
 * can implement the same port without the core knowing or caring.
 *
 * There are two independent ports so the two halves of the SDK bundle
 * independently: jobs (`GenerationBackend`) and media (`MediaBackend`).
 *
 * Each method resolves the raw response payload, or throws an `ApiJobError`
 * (the adapter maps its own failures — HTTP status codes via `errorFromResponse`,
 * socket errors, etc. — onto the typed error catalog).
 */

import type { OutputType } from './types'

export interface JobListQuery {
  // Derive from OutputType (not a duplicated literal) so this port stays in sync
  // with the public `ListOptions.type` (also OutputType). Hardcoding the union
  // here drifts the moment OutputType grows (e.g. "audio"), breaking the
  // ListOptions -> JobListQuery assignment in client/list.ts with TS2322.
  type?: OutputType
  cursor?: string | number
  size?: number
  /** List only the derived children of this job set (e.g. its upscales). */
  parentId?: string
  /** Only jobs in these wire statuses (e.g. 'queued', 'completed'). Repeatable. */
  status?: string | string[]
  /** Only these job set types (registry `jobSetType` strings). Repeatable. */
  model?: string | string[]
}

export interface MediaListQuery {
  type: 'image' | 'video' | 'audio'
  cursor?: string | number
  size?: number
}

export interface MediaGetQuery {
  id: string
  type: 'image' | 'video' | 'audio'
}

export interface SwitchWorkspaceRequest {
  workspaceId: string
}

/**
 * What the host's confirmation gate sees before a generation goes out: the
 * resolved job type and the final wire params (validation has already passed).
 */
export interface ConfirmSubmitRequest {
  jobSetType: string
  params: Record<string, unknown>
}

/**
 * Host-injected confirmation gate, run by `submit` once per submission AFTER
 * validation/wire-building and BEFORE any network call. Resolve to proceed —
 * optionally with an opaque confirmation token, which the adapter forwards on
 * the create request (`confirmationToken`). Reject (or throw) to abort the
 * submit; non-`ApiJobError` rejections surface as the typed
 * `confirmation_rejected` error. A trivial implementation can wrap
 * `window.confirm`; a modal flow resolves the promise with its token.
 */
export type ConfirmSubmit = (req: ConfirmSubmitRequest) => Promise<string | void>

/**
 * THE combined adapter shape for a full fnf backend — one object that satisfies
 * all three ports, so it plugs into `createJobClient({ adapter })`,
 * `createMediaClient({ mediaAdapter })`, and `createProfileClient` alike.
 * Concrete implementations live in `@higgsfield/fnf-adapters`.
 */
export interface FnfAdapter extends GenerationBackend, MediaBackend, ProfileBackend {}

/** The jobs port: create/read/list generations and estimate cost. */
export interface GenerationBackend {
  createJobs: (req: { jobSetType: string, params: Record<string, unknown>, confirmationToken?: string }) => Promise<unknown>
  getJob: (id: string) => Promise<unknown>
  /**
   * OPTIONAL — fetch ALL jobs of a job set in one request, normalized to the
   * same shape as `getJob`. When present, `wait`/`poll` group generations by
   * `jobSetId` and poll per SET instead of per job — one request per tick for
   * a whole batch — and gate fields (the fnf `ip_check_finished` IP gate) are
   * seen every tick even on adapters whose per-job read lacks them (the
   * fnf-web adapter carries the gate on both reads).
   */
  getJobSet?: (id: string) => Promise<unknown>
  listJobs: (query: JobListQuery) => Promise<unknown>
  estimateCost: (req: { jobSetType: string, params: Record<string, unknown> }) => Promise<unknown>
  /**
   * OPTIONAL — cancel a running job server-side (the client-side `signal` only
   * stops polling; the backend job keeps burning credits without this). Adapters
   * whose backend has no cancel route omit it; `cancelGeneration` then throws
   * `cancel_not_supported`.
   */
  cancelJob?: (id: string) => Promise<unknown>
  /**
   * OPTIONAL — the host-injected confirmation gate (see `ConfirmSubmit`).
   * Adapters don't implement this themselves; they surface the callback the
   * host passed at construction (`confirm` option). Absent → submits proceed
   * unconfirmed.
   */
  confirm?: ConfirmSubmit
}

export interface UploadUrlRequest {
  type: 'image' | 'video' | 'audio'
  filename?: string
  contentType?: string
  extra?: Record<string, unknown>
}

export interface ConfirmMediaRequest {
  mediaId: string
  type: 'image' | 'video' | 'audio'
  filename?: string
  jobId?: string
  forceIpCheck?: boolean
  forceNsfwCheck?: boolean
  startSeconds?: number
  endSeconds?: number
  extra?: Record<string, unknown>
}

/**
 * The media port: get/list media, plus the JSON control plane of uploads —
 * `getUploadUrl` (presign) and `confirmMedia`. These two are OPTIONAL so a
 * read-only media adapter need not implement them; `uploadMedia` throws
 * `UploadNotSupportedError` when they're absent. The binary transfer itself is
 * NOT a method here — it's raw bytes to a storage host (not JSON), handled by a
 * separate injected `BinaryUploader`.
 */
export interface MediaBackend {
  getMedia: (query: MediaGetQuery) => Promise<unknown>
  listMedia: (query: MediaListQuery) => Promise<unknown>
  getUploadUrl?: (req: UploadUrlRequest) => Promise<unknown>
  confirmMedia?: (req: ConfirmMediaRequest) => Promise<unknown>
}

/**
 * The profile port: account/workspace/wallet reads plus backend workspace
 * context switching. Host apps that also mirror workspace choice into an
 * identity provider (Clerk unsafeMetadata/session reload in fnf-web) should do
 * that outside this SDK port.
 */
export interface ProfileBackend {
  getUser: () => Promise<unknown>
  listWorkspaces: () => Promise<unknown>
  getCurrentWorkspace: () => Promise<unknown>
  getWorkspaceWallet: () => Promise<unknown>
  switchWorkspace: (req: SwitchWorkspaceRequest) => Promise<unknown>
}
