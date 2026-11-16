export function simulateTranslation(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

  for (const textNode of textNodes) {
    const outer = document.createElement('font')
    const inner = document.createElement('font')
    inner.textContent = `translated: ${textNode.data}`
    outer.append(inner)
    textNode.replaceWith(outer)
  }
}
