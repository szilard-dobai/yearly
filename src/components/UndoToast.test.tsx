import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UndoToast, { UNDO_TOAST_DURATION_MS } from './UndoToast'

describe('UndoToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the message and undoes on request', () => {
    const onUndo = vi.fn()
    render(
      <UndoToast
        message="Added France to 3 days"
        onUndo={onUndo}
        onDismiss={vi.fn()}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Added France to 3 days'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('hides the undo action when there is nothing to undo', () => {
    render(<UndoToast message="Already added" onDismiss={vi.fn()} />)

    expect(
      screen.queryByRole('button', { name: 'Undo' })
    ).not.toBeInTheDocument()
  })

  it('dismisses itself after a few seconds', () => {
    const onDismiss = vi.fn()
    render(<UndoToast message="Done" onUndo={vi.fn()} onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(UNDO_TOAST_DURATION_MS - 1)
    })
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('keeps its timer when the parent re-renders with a new callback', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(
      <UndoToast message="Done" onUndo={vi.fn()} onDismiss={first} />
    )

    act(() => {
      vi.advanceTimersByTime(UNDO_TOAST_DURATION_MS / 2)
    })
    rerender(<UndoToast message="Done" onUndo={vi.fn()} onDismiss={second} />)
    act(() => {
      vi.advanceTimersByTime(UNDO_TOAST_DURATION_MS / 2)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
