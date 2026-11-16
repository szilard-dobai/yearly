import { simulateTranslation } from '@/test/translate'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { installTranslationGuard } from './translation-guard'

describe('installTranslationGuard', () => {
  const { removeChild, insertBefore } = Node.prototype

  beforeAll(() => {
    installTranslationGuard()
  })

  afterAll(() => {
    Node.prototype.removeChild = removeChild
    Node.prototype.insertBefore = insertBefore
  })

  function createButton(text: string) {
    const button = document.createElement('button')
    const textNode = document.createTextNode(text)
    button.append(textNode)
    return { button, textNode }
  }

  it('removes a child as usual', () => {
    const { button, textNode } = createButton('Select country...')

    expect(button.removeChild(textNode)).toBe(textNode)
    expect(button.childNodes).toHaveLength(0)
  })

  it('skips removing a text node that translation already replaced', () => {
    const { button, textNode } = createButton('Select country...')
    simulateTranslation(button)

    expect(() => button.removeChild(textNode)).not.toThrow()
    expect(button).toHaveTextContent('translated: Select country...')
  })

  it('inserts before a child as usual', () => {
    const { button, textNode } = createButton('Select country...')
    const icon = document.createElement('svg')

    button.insertBefore(icon, textNode)

    expect(button.firstChild).toBe(icon)
  })

  it('appends when translation replaced the node to insert before', () => {
    const { button, textNode } = createButton('Select country...')
    simulateTranslation(button)
    const icon = document.createElement('svg')

    expect(() => button.insertBefore(icon, textNode)).not.toThrow()
    expect(button.lastChild).toBe(icon)
  })
})
