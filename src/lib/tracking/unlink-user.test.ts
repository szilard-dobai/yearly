import { beforeEach, describe, expect, it, vi } from 'vitest'
import { unlinkUserActivity } from './unlink-user'

const events = { updateMany: vi.fn() }
const feedback = { updateMany: vi.fn() }

vi.mock('@/lib/mongodb', () => ({
  getTrackingCollection: () => Promise.resolve(events),
  getFeedbackCollection: () => Promise.resolve(feedback),
}))

describe('unlinkUserActivity', () => {
  beforeEach(() => {
    events.updateMany.mockReset().mockResolvedValue({ modifiedCount: 3 })
    feedback.updateMany.mockReset().mockResolvedValue({ modifiedCount: 1 })
  })

  it('removes the account ID from its events and feedback', async () => {
    await unlinkUserActivity('user-1')

    const unlink = [{ userId: 'user-1' }, { $unset: { userId: '' } }]
    expect(events.updateMany).toHaveBeenCalledWith(...unlink)
    expect(feedback.updateMany).toHaveBeenCalledWith(...unlink)
  })

  it('logs instead of throwing when MongoDB fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    events.updateMany.mockRejectedValue(new Error('down'))

    await expect(unlinkUserActivity('user-1')).resolves.toBeUndefined()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
