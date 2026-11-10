import {
  canAskForFeedback,
  subscribeToFeedbackPrompt,
} from '@/lib/feedback/prompt'
import { useSyncExternalStore } from 'react'

export function useCanAskForFeedback(): boolean {
  return useSyncExternalStore(
    subscribeToFeedbackPrompt,
    () => canAskForFeedback(),
    () => false
  )
}
