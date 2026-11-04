import { useEffect, useRef, type RefObject } from 'react'

export const LONG_PRESS_MS = 350
const TOUCH_MOVE_TOLERANCE_PX = 10

interface DayGestureHandlers {
  onTap: (dayKey: string) => void
  onDrag: (
    anchorKey: string,
    focusKey: string,
    method: 'drag' | 'long_press'
  ) => void
}

interface TouchState {
  anchor: string
  focus: string
  startX: number
  startY: number
  active: boolean
  timer: ReturnType<typeof setTimeout>
}

function dayKeyFrom(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>('[data-day]')?.dataset.day ?? null
}

export function useDayGestures(
  ref: RefObject<HTMLElement | null>,
  handlers: DayGestureHandlers,
  enabled = true
) {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return

    let suppressClick = false
    let mouseDrag: { anchor: string; focus: string; moved: boolean } | null =
      null
    let touch: TouchState | null = null

    const cancelTouch = () => {
      if (touch) clearTimeout(touch.timer)
      touch = null
    }

    const handlePointerDown = (event: PointerEvent) => {
      suppressClick = false
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      const key = dayKeyFrom(event.target)
      mouseDrag = key ? { anchor: key, focus: key, moved: false } : null
    }

    const handlePointerOver = (event: PointerEvent) => {
      if (!mouseDrag || event.pointerType !== 'mouse') return
      if ((event.buttons & 1) === 0) {
        mouseDrag = null
        return
      }
      const key = dayKeyFrom(event.target)
      if (!key || key === mouseDrag.focus) return
      mouseDrag.focus = key
      mouseDrag.moved = true
      handlersRef.current.onDrag(mouseDrag.anchor, key, 'drag')
    }

    const handlePointerUp = () => {
      if (mouseDrag?.moved) suppressClick = true
      mouseDrag = null
    }

    const handleTouchStart = (event: TouchEvent) => {
      cancelTouch()
      if (event.touches.length !== 1) return
      const key = dayKeyFrom(event.target)
      if (!key) return
      const point = event.touches[0]
      const state: TouchState = {
        anchor: key,
        focus: key,
        startX: point.clientX,
        startY: point.clientY,
        active: false,
        timer: setTimeout(() => {
          state.active = true
          navigator.vibrate?.(10)
          handlersRef.current.onDrag(key, key, 'long_press')
        }, LONG_PRESS_MS),
      }
      touch = state
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!touch) return
      const point = event.touches[0]
      if (!touch.active) {
        const distance = Math.hypot(
          point.clientX - touch.startX,
          point.clientY - touch.startY
        )
        if (distance > TOUCH_MOVE_TOLERANCE_PX) cancelTouch()
        return
      }
      if (event.cancelable) event.preventDefault()
      const key = dayKeyFrom(
        document.elementFromPoint(point.clientX, point.clientY)
      )
      if (!key || key === touch.focus) return
      touch.focus = key
      handlersRef.current.onDrag(touch.anchor, key, 'long_press')
    }

    const handleTouchEnd = (event: TouchEvent) => {
      const wasActive = touch?.active ?? false
      cancelTouch()
      if (!wasActive) return
      suppressClick = true
      if (event.cancelable) event.preventDefault()
    }

    const handleClick = (event: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false
        return
      }
      const key = dayKeyFrom(event.target)
      if (key) handlersRef.current.onTap(key)
    }

    const handleContextMenu = (event: Event) => {
      if (touch) event.preventDefault()
    }

    element.addEventListener('pointerdown', handlePointerDown)
    element.addEventListener('pointerover', handlePointerOver)
    window.addEventListener('pointerup', handlePointerUp)
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', cancelTouch)
    element.addEventListener('click', handleClick)
    element.addEventListener('contextmenu', handleContextMenu)

    return () => {
      cancelTouch()
      element.removeEventListener('pointerdown', handlePointerDown)
      element.removeEventListener('pointerover', handlePointerOver)
      window.removeEventListener('pointerup', handlePointerUp)
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', cancelTouch)
      element.removeEventListener('click', handleClick)
      element.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [ref, enabled])
}
