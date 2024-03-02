import { track, trigger } from './effect'

const get = createGetter()
const set = createSetter()

function createGetter () {
  return function get (target: object, key: string | symbol, receiver: object) {
    /**
     * Reflect.get = target.key 第三个参数是指定this为receiver
     * Reflect一般是跟Proxy结合的，receiver是Proxy返回的代理对象本身,主要处理的是代理对象中对象内部方法依旧以来代理对象的属性的时候
     * 那么当前的get方法需要调用多次,例如下面当访问对象中的joinName的时候当前方法应该被调用3次
     * {
     *  name1: '鸡',
     *  name2: '篮球',
     *  get joinName () {
     *    return this.name1 + this.name2
     *  }}
     */
    const res = Reflect.get(target, key, receiver)
    
    // 收集依赖的方法
    track(target, key)

    return res
  }
}

function createSetter () {
  return function set (target: object, key: string | symbol, value: unknown, receiver: object) {
    const result = Reflect.set(target, key, value, receiver)
    trigger(target, key, value)

    return result
  }
}


/**
 * 响应性的 handler
 */
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set
}