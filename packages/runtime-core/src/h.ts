import { isArray, isObject } from "@vue/shared";
import { isVNode, VNode, createVNode } from "./vnode";

/**
 * 创建虚拟dom函数入口,主要针对参数处理，然后调用创建虚拟DOM的方法
 * @param type 
 * @param propsOrChildren 
 * @param children 
 * @returns 
 */
export function h (type: any, propsOrChildren?: any, children?: any): VNode {
  // 获取参数的长度
  const l = arguments.length
  // 
  if (l === 2) {
    // 如果长度是2，意味着当前值传递了两个参数，第二个参数可能是props也可能是children
    // 所以需要对第二个参数进行判断
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // 如果是一个对象,并且是一个VNode,那么VNode只能用于children
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      // 如果不是vnode那么久把第二个参数当成props
      return createVNode(type, propsOrChildren, [])
    } else {
      // 如果连对象都不是，则当成children
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if (l > 3) {
      // 如果长度大于3，则拿到3后面的所有参数的数组
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVNode(children)) {
      // 如果刚好等于3
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }
}