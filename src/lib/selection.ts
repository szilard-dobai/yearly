import dayjs from 'dayjs'

export type SelectionMethod = 'tap' | 'drag' | 'long_press' | 'month'

export interface DaySelection {
  anchor: string
  focus: string
  method: SelectionMethod
}

export interface SelectionBounds {
  startKey: string
  endKey: string
}

export function toDayKey(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

export function fromDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getSelectionBounds(selection: DaySelection): SelectionBounds {
  return selection.anchor <= selection.focus
    ? { startKey: selection.anchor, endKey: selection.focus }
    : { startKey: selection.focus, endKey: selection.anchor }
}

export function getSelectionDays(selection: DaySelection): Date[] {
  const { startKey, endKey } = getSelectionBounds(selection)
  const end = dayjs(fromDayKey(endKey))
  const days: Date[] = []
  for (
    let current = dayjs(fromDayKey(startKey));
    !current.isAfter(end, 'day');
    current = current.add(1, 'day')
  ) {
    days.push(current.toDate())
  }
  return days
}

export function isSingleDay(selection: DaySelection): boolean {
  return selection.anchor === selection.focus
}

export function applyTap(
  selection: DaySelection | null,
  key: string
): DaySelection | null {
  if (!selection || !isSingleDay(selection)) {
    return { anchor: key, focus: key, method: 'tap' }
  }
  if (selection.anchor === key) {
    return null
  }
  return { anchor: selection.anchor, focus: key, method: 'tap' }
}

export function getMonthSelection(year: number, month: number): DaySelection {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  return { anchor: toDayKey(first), focus: toDayKey(last), method: 'month' }
}

export function formatSelectionLabel(selection: DaySelection): string {
  const { startKey, endKey } = getSelectionBounds(selection)
  const start = dayjs(fromDayKey(startKey))
  if (startKey === endKey) {
    return start.format('ddd, MMM D')
  }
  const end = dayjs(fromDayKey(endKey))
  const endFormat = start.month() === end.month() ? 'D' : 'MMM D'
  return `${start.format('MMM D')} – ${end.format(endFormat)}`
}
