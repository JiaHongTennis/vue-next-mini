import { isString } from '@vue/shared'
// 更新style

export function patchStyle(el: Element, prev, next) {
  const style = (el as HTMLElement).style
  // 是否是一个字符串
  const isCssString = isString(next)

  if (next && !isCssString) {
    // 如果新的值存在，并且不是一个字符串
    for (const key in next) {
      // 设置style
      setStyle(style, key, next[key])
    }
  }
  // 如果旧样式并且不是字符串
  if (prev && !isString(prev)) {
    for (const key in prev) {
      // 并且不在新样式中，则删除
      if (next[key] == null) {
        setStyle(style, key, '')
      }
    }
  }
}

function setStyle (
  style: CSSStyleDeclaration,
  name: string,
  val: string | string[]
) {
  style[name] = val
}