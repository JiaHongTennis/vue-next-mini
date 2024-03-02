import { isArray, isFunction, isObject, isString } from "@vue/shared"
import { normalizeClass } from "packages/shared/src/normalizeProp"
import { ShapeFlags } from "packages/shared/src/shapeFlags"

export interface VNode {
  /**
   * 当前是否是vnode节点
   */
  __v_isVNode: true,
  type: any,
  props: any,
  children: any,
  shapeFlag: number,
  key: any
}

/**
 * 判断是否是vNode
 * @param value 
 * @returns 
 */
export function isVNode (value: any): value is VNode {
  return value ? value.__v_isVNode === true : false
}

// 导出3中Symbol
// 文本类型
export const Text = Symbol('Text')
// 注释类型
export const Comment = Symbol('Comment')
// 片段类型
export const Fragment = Symbol('Fragment')

// 创建虚拟dom方法
export function createVNode (type, props, children) {
  // 先构建好flag
  // 这个是个比较复杂的三元表达式
  // 是否是字符串是的话返回ShapeFlags.ELEMENT否则下一个阶段
  // 是否是对象是的话返回ShapeFlags.STATEFUL_COMPONENT
  // 这里的shapeFlag表示这type的类型
  const shapeFlag = isString(type)
  ? ShapeFlags.ELEMENT : isObject(type)
  ? ShapeFlags.STATEFUL_COMPONENT : 0

  // 然后对props的class以及style进行增强
  // 拿到props的class跟style,由于是简化版我们这边要进行判空
  let { class: klass } = props || {}
  if (klass && !isString(klass)) {
    // 对class进行增强
    props.class = normalizeClass(klass)
  }

  // 创建vnode对象
  return createBaseVNode(type, props, children, shapeFlag)
}

export { createVNode as createElementVNode }

function createBaseVNode (type, props, children, shapeFlag) {
  // 创建vnode对象,先不赋值children
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    shapeFlag,
    // key后期用来做diff算法的时候用的,值取自props
    key: props?.key || null
  } as VNode

  // 创建好vnode之后，我们需要去解析以及标准化当前的children的类型
  normalizeChildren(vnode, children)

  return vnode
}

export function normalizeChildren(vnode: VNode, children: unknown) {
  // 根据当前children的状态来解析,先初始化type = 0
  let type = 0

  // 这里undefined也可以为true
  if (children == null) {
    children = null
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {

  } else if (isFunction(children)) {

  } else {
    // 如果children以上都不是,那我们认为children是一个字符串,我们需要调用String转为字符串
    children = String(children)
    // 标记一下type 的值
    type = ShapeFlags.TEXT_CHILDREN
  }
  // 给vnode添加上children
  vnode.children = children
  // 然后执行按位或等于的运算,类似于保存变量,当执行按位或的时候可以提取出来
  // 或运算是将二进制结合上下结合在一起 01 = 1  00 = 0 11 = 1
  // 5 | 6 二进制加起来为 101 跟 110 = 111 所以结果是7
  // 到这里的type表示children的类型
  vnode.shapeFlag |= type
}

export function isSameVNodeType (n1: VNode, n2: VNode) {
  return n1.type === n2.type && n1.key === n2.key
}

/**
 * 生成标准化的vnode
 * @param child 创建vnode
 */
export function normalizeVNode (child): VNode {
  // 如果当前child是一个对象，代表的意思就是child已经是一个vnode了
  if (typeof child === 'object') {
    // 此时直接把child直接返回
    return cloneIfMounted(child)
  } else {
    // 如果不是
    return createVNode(Text, null, String(child))
  }
}

export function cloneIfMounted(child: VNode): VNode {
  return child
}