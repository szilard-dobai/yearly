import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDeploymentSnapshotId } from './snapshot'

describe('getDeploymentSnapshotId', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('has none outside a Vercel build', () => {
    vi.stubEnv('VIDEO_SNAPSHOT_ID', '')
    expect(getDeploymentSnapshotId()).toBe(null)
  })

  it('uses VIDEO_SNAPSHOT_ID for local renders', () => {
    vi.stubEnv('VIDEO_SNAPSHOT_ID', 'snap_local')
    expect(getDeploymentSnapshotId()).toBe('snap_local')
  })
})
