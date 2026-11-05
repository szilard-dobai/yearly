import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PATCH } from './route'

const collection = {
  findOneAndUpdate: vi.fn(),
}
const notifyFeedbackToSlack = vi.fn()

vi.mock('@/lib/mongodb', () => ({
  getFeedbackCollection: () => Promise.resolve(collection),
}))

vi.mock('@/lib/feedback/slack', () => ({
  notifyFeedbackToSlack: (...args: unknown[]) => notifyFeedbackToSlack(...args),
}))

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (callback: () => unknown) => callback(),
}))

const ID = '6728b8f0c2a4e1d2f3a4b5c6'

const storedFeedback = {
  deviceId: 'device-123',
  rating: 4,
  message: 'Add more colours',
  source: 'post_export',
  country: 'DE',
}

function patchRequest(body: unknown, id = ID) {
  return PATCH(
    new Request(`http://localhost/api/feedback/${id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'sec-fetch-site': 'same-origin',
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )
}

describe('PATCH /api/feedback/[id]', () => {
  beforeEach(() => {
    notifyFeedbackToSlack.mockReset()
    collection.findOneAndUpdate.mockReset().mockResolvedValue(storedFeedback)
  })

  it('adds a message and sends it to Slack', async () => {
    const response = await patchRequest({
      deviceId: 'device-123',
      message: '  Add more colours ',
    })

    expect(response.status).toBe(200)
    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'device-123' }),
      {
        $set: { message: 'Add more colours', updatedAt: expect.any(Date) },
      },
      { returnDocument: 'after' }
    )
    expect(notifyFeedbackToSlack).toHaveBeenCalledWith(
      storedFeedback,
      'message_added'
    )
  })

  it('does not notify Slack when only the rating changes', async () => {
    const response = await patchRequest({ deviceId: 'device-123', rating: 2 })

    expect(response.status).toBe(200)
    expect(notifyFeedbackToSlack).not.toHaveBeenCalled()
  })

  it('returns 404 when the feedback cannot be edited', async () => {
    collection.findOneAndUpdate.mockResolvedValue(null)

    const response = await patchRequest({
      deviceId: 'someone-else',
      message: 'Hello',
    })

    expect(response.status).toBe(404)
    expect(notifyFeedbackToSlack).not.toHaveBeenCalled()
  })
})
