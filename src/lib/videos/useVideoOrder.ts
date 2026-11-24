'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchVideoOrder,
  isOrderWorking,
  type OrderSummary,
  VideoRequestError,
} from './client'

export const ORDER_POLL_MS = 3000
export const ORDER_POLL_LIMIT_MS = 4 * 60 * 1000
export const VIDEO_LINK_FRESH_MS = 8 * 60 * 1000

type Missing = 'not-found' | 'signed-out'

interface VideoOrderOptions {
  initial?: OrderSummary | null
  enabled?: boolean
}

export function useVideoOrder(
  orderId: string | null,
  { initial = null, enabled = true }: VideoOrderOptions = {}
) {
  const [fetched, setFetched] = useState<OrderSummary | null>(null)
  const [missing, setMissing] = useState<{
    id: string
    reason: Missing
  } | null>(null)
  const [timedOut, setTimedOut] = useState<string | null>(null)
  const [watching, setWatching] = useState<{ id: string; round: number }>({
    id: '',
    round: 0,
  })
  const fetchedAtRef = useRef<{ id: string; at: number } | null>(null)

  const start = initial && initial.id === orderId ? initial : null
  const order = fetched && fetched.id === orderId ? fetched : start
  const orderRef = useRef(order)
  useEffect(() => {
    orderRef.current = order
  })

  useEffect(() => {
    if (start && fetchedAtRef.current?.id !== start.id) {
      fetchedAtRef.current = { id: start.id, at: Date.now() }
    }
  }, [start])

  const setOrder = useCallback((next: OrderSummary) => {
    fetchedAtRef.current = { id: next.id, at: Date.now() }
    orderRef.current = next
    setFetched(next)
  }, [])

  const round = watching.id === orderId ? watching.round : 0
  const startWorking = start ? isOrderWorking(start) : true
  const shouldPoll = enabled && orderId !== null && (round > 0 || startWorking)

  useEffect(() => {
    if (!shouldPoll || !orderId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const startedAt = Date.now()

    const tick = async () => {
      try {
        const next = await fetchVideoOrder(orderId)
        if (cancelled) return
        setOrder(next)
        setMissing(null)
        setTimedOut(null)
        if (!isOrderWorking(next)) return
      } catch (error) {
        if (cancelled) return
        if (error instanceof VideoRequestError && error.status === 404) {
          setMissing({ id: orderId, reason: 'not-found' })
          return
        }
        if (error instanceof VideoRequestError && error.status === 401) {
          setMissing({ id: orderId, reason: 'signed-out' })
          return
        }
      }
      if (Date.now() - startedAt >= ORDER_POLL_LIMIT_MS) {
        setTimedOut(orderId)
        return
      }
      timer = setTimeout(tick, ORDER_POLL_MS)
    }

    void tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [shouldPoll, orderId, round, setOrder])

  const watch = useCallback(
    (next: OrderSummary) => {
      setOrder(next)
      setWatching((current) => ({
        id: next.id,
        round: (current.id === next.id ? current.round : 0) + 1,
      }))
    },
    [setOrder]
  )

  const freshOrder = useCallback(async (): Promise<OrderSummary | null> => {
    const current = orderRef.current
    const fetchedAt = fetchedAtRef.current
    if (
      current &&
      fetchedAt?.id === current.id &&
      Date.now() - fetchedAt.at < VIDEO_LINK_FRESH_MS
    ) {
      return current
    }
    if (!orderId) return current
    try {
      const next = await fetchVideoOrder(orderId)
      setOrder(next)
      return next
    } catch {
      return current
    }
  }, [orderId, setOrder])

  const reload = useCallback(async () => {
    if (!orderId) return
    try {
      setOrder(await fetchVideoOrder(orderId))
    } catch {}
  }, [orderId, setOrder])

  return {
    order,
    missing: missing?.id === orderId ? missing.reason : null,
    timedOut: timedOut !== null && timedOut === orderId,
    watch,
    freshOrder,
    reload,
  }
}
