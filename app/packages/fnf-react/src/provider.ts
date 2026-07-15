'use client'

import type {
  BinaryUploader,
  FnfObservabilityContext,
  FnfObservabilityOptions,
  GenerationBackend,
  JobClient,
  JobEntry,
  MediaBackend,
  MediaClient,
  ProfileBackend,
  ProfileClient,
  ResolveJobRef,
} from '@higgsfield/fnf'
import type { ReactNode } from 'react'
import { createJobClient, createMediaClient, createObservabilityContext, createProfileClient } from '@higgsfield/fnf'
import { createContext, createElement, use, useMemo } from 'react'

export interface FnfReactClientsConfig<Jobs extends readonly JobEntry[] = readonly JobEntry[]> {
  adapter: GenerationBackend
  jobs: Jobs
  mediaAdapter?: MediaBackend
  profileAdapter?: ProfileBackend
  blobUploader?: BinaryUploader
  resolveJob?: ResolveJobRef
  scopeKey?: string
  observability?: FnfObservabilityOptions
}

export interface FnfReactClients<Jobs extends readonly JobEntry[] = readonly JobEntry[]> {
  jobClient: JobClient<Jobs>
  mediaClient: MediaClient
  profileClient: ProfileClient
  jobs: Jobs
  scopeKey?: string
  observability?: FnfObservabilityOptions
}

export type FnfProviderProps<Jobs extends readonly JobEntry[] = readonly JobEntry[]> =
  FnfReactClientsConfig<Jobs> & {
    children: ReactNode
  }

const FnfContext = createContext<FnfReactClients | null>(null)

export function createFnfReactClients<const Jobs extends readonly JobEntry[]>(
  config: FnfReactClientsConfig<Jobs>,
): FnfReactClients<Jobs> {
  const mediaAdapter = config.mediaAdapter ?? (config.adapter as unknown as MediaBackend)
  const profileAdapter = config.profileAdapter ?? (config.adapter as unknown as ProfileBackend)
  const observability = config.observability ? observabilityOptionsFromContext(createObservabilityContext(config.observability)) : undefined
  return {
    jobClient: createJobClient({ adapter: config.adapter, jobs: config.jobs, ...(observability ? { observability } : {}) }),
    mediaClient: createMediaClient({
      mediaAdapter,
      ...(config.blobUploader ? { blobUploader: config.blobUploader } : {}),
      ...(config.resolveJob ? { resolveJob: config.resolveJob } : {}),
      ...(observability ? { observability } : {}),
    }),
    profileClient: createProfileClient({ profileAdapter, ...(observability ? { observability } : {}) }),
    jobs: config.jobs,
    ...(config.scopeKey ? { scopeKey: config.scopeKey } : {}),
    ...(observability ? { observability } : {}),
  }
}

export function FnfProvider<const Jobs extends readonly JobEntry[]>(props: FnfProviderProps<Jobs>) {
  const {
    children,
    adapter,
    jobs,
    mediaAdapter,
    profileAdapter,
    blobUploader,
    resolveJob,
    scopeKey,
    observability,
  } = props
  const value = useMemo(
    () => createFnfReactClients({
      adapter,
      jobs,
      ...(mediaAdapter ? { mediaAdapter } : {}),
      ...(profileAdapter ? { profileAdapter } : {}),
      ...(blobUploader ? { blobUploader } : {}),
      ...(resolveJob ? { resolveJob } : {}),
      ...(scopeKey ? { scopeKey } : {}),
      ...(observability ? { observability } : {}),
    }),
    [adapter, jobs, mediaAdapter, profileAdapter, blobUploader, resolveJob, scopeKey, observability],
  )
  return createElement(FnfContext.Provider, { value }, children)
}

export function useFnf<Jobs extends readonly JobEntry[] = readonly JobEntry[]>(): FnfReactClients<Jobs> {
  const value = use(FnfContext)
  if (!value)
    throw new Error('useFnf must be used inside <FnfProvider>')
  return value as FnfReactClients<Jobs>
}

export function useFnfJobClient<Jobs extends readonly JobEntry[] = readonly JobEntry[]>(): JobClient<Jobs> {
  return useFnf<Jobs>().jobClient
}

export function useFnfMediaClient(): MediaClient {
  return useFnf().mediaClient
}

export function useFnfProfileClient(): ProfileClient {
  return useFnf().profileClient
}

export function useFnfJobs<Jobs extends readonly JobEntry[] = readonly JobEntry[]>(): Jobs {
  return useFnf<Jobs>().jobs
}

export function useFnfScopeKey(): string | undefined {
  return useFnf().scopeKey
}

export function useFnfObservability(): FnfObservabilityOptions | undefined {
  return useFnf().observability
}

export function useOptionalFnfObservability(): FnfObservabilityOptions | undefined {
  return use(FnfContext)?.observability
}

function observabilityOptionsFromContext(ctx: FnfObservabilityContext): FnfObservabilityOptions {
  return {
    ...(ctx.observer ? { observer: ctx.observer } : {}),
    traceId: ctx.traceId,
    ...(ctx.parentId ? { parentId: ctx.parentId } : {}),
    attributes: ctx.attributes,
    ...(ctx.onObserverError ? { onObserverError: ctx.onObserverError } : {}),
    now: ctx.now,
    idFactory: ctx.idFactory,
  }
}
