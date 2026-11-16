// Browser translation swaps React's text nodes for <font> wrappers, so React can
// remove or insert before a node that is no longer there and crash the page.
// https://github.com/facebook/react/issues/11538
export function installTranslationGuard() {
  if (typeof Node !== 'function') return

  const { removeChild, insertBefore } = Node.prototype

  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T) {
    if (child.parentNode !== this) return child
    return removeChild.call(this, child) as T
  }

  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    node: T,
    child: Node | null
  ) {
    if (child && child.parentNode !== this) {
      return insertBefore.call(this, node, null) as T
    }
    return insertBefore.call(this, node, child) as T
  }
}
