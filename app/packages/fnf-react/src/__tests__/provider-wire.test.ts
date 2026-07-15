import type { GenerationInput } from '@higgsfield/fnf'
import type { FnfObservationEvent } from '@higgsfield/fnf/observability'
import { defineJob, z } from '@higgsfield/fnf/jobs'
import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { costQueryOptions } from '../cost-query'
import { fnfKeys } from '../keys'
import { createFnfReactClients } from '../provider'
import { getWirePreview } from '../wire-preview'
import { createMemoryBackend, createMemoryMediaAdapter, createMemoryProfileAdapter } from './test-utils'

const demo = defineJob({
  jobSetType: 'demo',
  outputType: 'image',
  params: {
    prompt: true,
    settings: {
      aspectRatio: z.wire('aspect_ratio', z.aspectRatio(['1:1', '16:9'])),
    },
  },
})

describe('FnfProvider and client creation', () => {
  it('creates stable SDK clients from explicit adapters', async () => {
    const clients = createFnfReactClients({
      adapter: createMemoryBackend(),
      mediaAdapter: createMemoryMediaAdapter(),
      profileAdapter: createMemoryProfileAdapter({
        user: { id: 'u1', workspace_id: 'w1' },
        workspaces: [{ id: 'w1', name: 'Personal', type: 'private', user_role: 'owner' }],
        currentWorkspaceId: 'w1',
      }),
      jobs: [demo],
      scopeKey: 'u1:w1',
    })

    expect(clients.scopeKey).toBe('u1:w1')
    expect(clients.jobs).toEqual([demo])
    await expect(clients.profileClient.getUser()).resolves.toMatchObject({ id: 'u1', workspaceId: 'w1' })
  })

  it('passes shared observability into created clients', async () => {
    const events: FnfObservationEvent[] = []
    const clients = createFnfReactClients({
      adapter: createMemoryBackend({ cost: 5 }),
      mediaAdapter: createMemoryMediaAdapter(),
      profileAdapter: createMemoryProfileAdapter(),
      jobs: [demo],
      observability: {
        observer: (event) => {
          events.push(event)
        },
        traceId: 'react-trace',
      },
    })

    await clients.jobClient.cost({ model: 'demo', prompt: { instruction: 'private' }, settings: { aspectRatio: '1:1' } })
    await clients.profileClient.getUser()

    expect(clients.observability?.traceId).toBe('react-trace')
    expect(events.map(event => event.name)).toEqual(expect.arrayContaining(['fnf.job.cost', 'fnf.profile.get_user']))
    expect(events.every(event => event.traceId === 'react-trace')).toBe(true)
    expect(JSON.stringify(events)).not.toContain('private')
  })
})

describe('request helpers', () => {
  it('builds a local wire preview or returns a typed SDK error', () => {
    const input: GenerationInput = { model: 'demo', prompt: { instruction: 'hello' }, settings: { aspectRatio: '16:9' } }
    const preview = getWirePreview(input, [demo])

    expect(preview.ok).toBe(true)
    if (preview.ok) {
      expect(preview.jobSetType).toBe('demo')
      expect(preview.params).toMatchObject({ prompt: 'hello', aspect_ratio: '16:9' })
    }

    const bad = getWirePreview({ model: 'missing', settings: {} } as never, [demo])
    expect(bad.ok).toBe(false)
    if (!bad.ok)
      expect(bad.error.code).toBe('unknown_model')
  })

  it('caches cost estimates under scoped request keys', async () => {
    const input = { model: 'demo', prompt: { instruction: 'hello' }, settings: { aspectRatio: '1:1' } } as const
    const client = {
      cost: vi.fn(async () => ({ credits: 3 })),
    }
    const qc = new QueryClient()

    await expect(qc.fetchQuery(costQueryOptions(client, input, { scopeKey: 'u1:w1' }))).resolves.toEqual({ credits: 3 })

    expect(client.cost).toHaveBeenCalledWith(input)
    expect(qc.getQueryData(fnfKeys.cost(input, { scopeKey: 'u1:w1' }))).toEqual({ credits: 3 })
    expect(qc.getQueryData(fnfKeys.cost(input))).toBeUndefined()
  })
})
