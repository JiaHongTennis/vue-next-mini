import { isOn } from "@vue/shared"
import { patchClass } from "./modules/class"
import { patchDOMProp } from './modules/props'
import { patchAttr } from './modules/attr'
import { patchStyle } from './modules/style'
import { patchEvent } from './modules/event'

// 对props的操作
export const patchProp = ( el: Element, key, prevValue, nextValue) {
  if (key === 'class') {
    // 处理class
    patchClass(el, nextValue)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    // on开头处理事件
    patchEvent(el, key, prevValue, nextValue)
  } else if (shouldSetAsProp(el, key)) {
    // 如果是DOMPrototype属性
    patchDOMProp(el, key, nextValue)
  } else {
    // 如果是Attr属性
    patchAttr(el, key, nextValue)
  }
}

function shouldSetAsProp (el: Element, key: string) {
  // 判断是否是DOMPrototype

  // 我们需要过滤一些特殊的场景，比如form是只读的，以及某些情况下必须通过setAttr
  if (key === 'form') {
    return false
  }

  if (key === 'list' && el.tagName === 'INPUT') {
    return false
  }

  if (key === 'type' && el.tagName === 'TEXTAREA') {
    return false
  }

  // 其余的都可以直接修改
  return key in el
}