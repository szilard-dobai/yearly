function firstCharacter(text: string) {
  return Array.from(text)[0] ?? ''
}

export function getInitials(name: string | null | undefined, email: string) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return firstCharacter(email).toUpperCase()

  const first = firstCharacter(words[0])
  const last = words.length > 1 ? firstCharacter(words[words.length - 1]) : ''
  return (first + last).toUpperCase()
}
