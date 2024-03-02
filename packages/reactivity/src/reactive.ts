import { isObject } from '@vue/shared'
import {
  mutableHandlers
} from './baseHandlers'

/**
 * 响应性 Map 缓存对象
 * key: target
 * val: proxy
 */
export const reactiveMap = new WeakMap<object, any>()

/**
 * 为复杂数据类型，创建响应性对象
 * @param target 被代理对象
 * @returns 代理对象
 */
export function reactive(target: object) {
  // 返回一个创建reactive对象的方法
  return createReactiveObject(
    target,
    mutableHandlers,
    reactiveMap
  )
}

// 定义一个reactive的美剧类型
export const enum ReactiveFlage {
  IS_REACTIVE = '__v_isReactive'
}

/**
 * 创建响应性对象
 * @param target 被代理对象
 * @param baseHandlers 
 * @param proxyMap 
 * @returns 
 */
function createReactiveObject(
  target: Object,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<object, any>
) {
  // 如果该实例已经被代理，则直接读取即可
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 未被代理则生成proxy 实例
  const proxy = new Proxy(target, baseHandlers)

  // 标记类型是reactive
  proxy[ReactiveFlage.IS_REACTIVE] = true

  // 缓存代理对象
  proxyMap.set(target, proxy)
  return proxy
}

// 判断是否是对象，如果是的话转化为
export const toReactive = <T extends unknown>(value: T): T => {
  // 如果是对象的话就调用reactive转化
  return isObject(value) ? reactive(value as object) : value
}