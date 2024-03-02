/**
 * 设置Attr方法
 * @param el 
 * @param key 
 * @param value 
 */
export function patchAttr (el: Element, key: string, value) {
  if (value === null) {
    // 如果value等于null，应该删除掉attr
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, value)
  }
}