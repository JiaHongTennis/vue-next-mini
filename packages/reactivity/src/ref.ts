import { hasChanged } from "@vue/shared"
import { createDep, Dep } from "./dep"
import { activeEffect, tarckEffects, triggerEffects } from "./effect"
import { toReactive } from "./reactive"

// Ref类型
export interface Ref<T = any> {
  value: T
}

// ref主函数
export function ref (value?: unknown) {
  // 调用创建Ref方法，浅层复制暂时先死
  return createRef(value, false)
}

export function createRef (rawValue: unknown, shallow: boolean) {
  // 判断是否是ref对象
  if (isRef(rawValue)){
    // 如果是Ref的话则直接返回
    return rawValue
  }
  // 否则的话生成一个RefImpl类型对象
  return new RefImpl(rawValue, shallow)
}

// RefImpl类
class RefImpl<T> {
  // 原始数据
  private _rawValue: T
  // 内部保存的代理对象(如果不是复杂数据类型其实还是值本身)
  private _value: T

  // Dep
  public dep?: Dep = undefined

  // readonly为只读属性
  constructor(value: T, public readonly __v_isShallow: boolean) {
    // 保存原始数据
    this._rawValue = value
    // 如果所ref所传的值是对象，那么本质上ref的响应性是reactive完成的
    this._value = __v_isShallow ? value : toReactive(value)
  }

  get value () {
    // 创建ref.dep并关联effect
    /**
     * 因为ref有可能是一个非引用类型的值，这个时候无法使用Proxy来代理,所以ref返回的属性需要给回一个value的方法来
     * 通过trackRefValue来主动收集依赖，并将依赖保存到当前的实例化对象中
     */
    trackRefValue(this)

    return this._value
  }

  set value (newVal) {
    if (hasChanged(newVal, this._rawValue)) {
      // 发生改变赋值新值
      this._rawValue = newVal
      this._value = toReactive(newVal)
      // 触发ref依赖
      triggerRefValue(this)
    }
  }
}

/**
 * 创建ref.dep对象关联effect
 * @param ref
 */
export function trackRefValue(ref) {
  console.log('收集了trackRefValue')
  debugger
  // 如果不是在effect中触发的话,那么activeEffect=false不会经过这个判断进入后面的effect收集
  if (activeEffect) {
    tarckEffects(ref.dep || (ref.dep = createDep()))
  }
}

/**
 * 触发依赖
 */
export function triggerRefValue (ref) {
  console.log('触发了triggerRefValue')
  if (ref.dep) {
    triggerEffects(ref.dep)
  }
}

// 判断是否是ref对象方法,is 是ts的类型守卫
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}