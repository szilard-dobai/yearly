import { useState, useCallback, useRef, useEffect } from 'react'

export type StatusState = 'idle' | 'loading' | 'success' | 'error'

interface UseStatusFeedbackOptions {
  resetDelay?: number
}

interface UseStatusFeedbackReturn {
  status: StatusState
  setIdle: () => void
  setLoading: () => void
  setSuccess: () => void
  setError: () => void
  isIdle: boolean
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
}

export function useStatusFeedback(
  options: UseStatusFeedbackOptions = {}
): UseStatusFeedbackReturn {
  const { resetDelay = 3000 } = options
  const [status, setStatus] = useState<StatusState>('idle')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearExistingTimeout()
  }, [clearExistingTimeout])

  const setIdle = useCallback(() => {
    clearExistingTimeout()
    setStatus('idle')
  }, [clearExistingTimeout])

  const setLoading = useCallback(() => {
    clearExistingTimeout()
    setStatus('loading')
  }, [clearExistingTimeout])

  const setSuccess = useCallback(() => {
    clearExistingTimeout()
    setStatus('success')
    timeoutRef.current = setTimeout(() => setStatus('idle'), resetDelay)
  }, [clearExistingTimeout, resetDelay])

  const setError = useCallback(() => {
    clearExistingTimeout()
    setStatus('error')
    timeoutRef.current = setTimeout(() => setStatus('idle'), resetDelay)
  }, [clearExistingTimeout, resetDelay])

  return {
    status,
    setIdle,
    setLoading,
    setSuccess,
    setError,
    isIdle: status === 'idle',
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
  }
}
