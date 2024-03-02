// 对class进行打补丁的才做
export function patchClass(el: Element, value: string | null) {
  if (value === null) {
    // 如果value === null,则删除class
    el.removeAttribute('class')
  } else {
    // 否则设置class
    el.className = value
  }
}
