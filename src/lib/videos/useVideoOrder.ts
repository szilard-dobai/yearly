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

interface VideoOrderOptions {
  initial?: OrderSummary | null
  enabled?: boolean
}

export function useVideoOrder(
  orderId: string | null,
  { initial = null, enabled = true }: VideoOrderOptions = {}
) {
  const [order, setOrderState] = useState<OrderSummary | null>(initial)
  const [missing, setMissing] = useState<'not-found' | 'signed-out' | null>(
    null
  )
  const [timedOut, setTimedOut] = useState(false)
  const [round, setRound] = useState(0)
  const fetchedAtRef = useRef<number | null>(null)
  const orderRef = useRef(order)

  useEffect(() => {
    if (initial && fetchedAtRef.current === null) {
      fetchedAtRef.current = Date.now()
    }
  }, [initial])

  const setOrder = useCallback((next: OrderSummary) => {
    fetchedAtRef.current = Date.now()
    orderRef.current = next
    setOrderState(next)
  }, [])

  const shouldPoll =
    enabled &&
    orderId !== null &&
    (round > 0 || !initial || isOrderWorking(initial))

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
        setTimedOut(false)
        if (!isOrderWorking(next)) return
      } catch (error) {
        if (cancelled) return
        if (error instanceof VideoRequestError && error.status === 404) {
          setMissing('not-found')
          return
        }
        if (error instanceof VideoRequestError && error.status === 401) {
          setMissing('signed-out')
          return
        }
      }
      if (Date.now() - startedAt >= ORDER_POLL_LIMIT_MS) {
        setTimedOut(true)
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
    (next?: OrderSummary) => {
      if (next) setOrder(next)
      setRound((value) => value + 1)
    },
    [setOrder]
  )

  const freshOrder = useCallback(async (): Promise<OrderSummary | null> => {
    const current = orderRef.current
    if (
      current &&
      fetchedAtRef.current !== null &&
      Date.now() - fetchedAtRef.current < VIDEO_LINK_FRESH_MS
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

  return { order, missing, timedOut, watch, freshOrder, reload }
}
