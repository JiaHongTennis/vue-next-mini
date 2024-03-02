// 这里是封装所有的dom操作,之所以要封装是因为要兼容不同的平台
const doc = (typeof document !== 'undefined' ? document : null) as Document

// 导出nodeOps
export const nodeOps = {
  // 插入指定的el 到 parent 中 anchor 表示插入的位置， 即锚点
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null)
  },

  // 创建指定的 Element
  createElement: (tag): Element => {
    const el = doc.createElement(tag)
    return el
  },

  // 为指定的 Element 设置 text
  setElementText: (el: Element, text) => {
    el.textContent = text
  },
  remove: (child: Element) => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  // 生成文本节点
  createText: text => doc.createTextNode(text),
  setText: (node, text) => {
    // 设置文本节点
    node.nodeValue = text
  },
  createComment: (text) => doc.createComment(text)
}