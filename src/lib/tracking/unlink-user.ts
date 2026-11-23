import { getFeedbackCollection, getTrackingCollection } from '@/lib/mongodb'

export async function unlinkUserActivity(userId: string) {
  try {
    const [events, feedback] = await Promise.all([
      getTrackingCollection(),
      getFeedbackCollection(),
    ])
    await Promise.all([
      events.updateMany({ userId }, { $unset: { userId: '' } }),
      feedback.updateMany({ userId }, { $unset: { userId: '' } }),
    ])
  } catch (error) {
    console.error('Failed to unlink activity from a deleted account:', error)
  }
}
