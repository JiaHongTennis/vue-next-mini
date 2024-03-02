import { extend, isArray } from "@vue/shared"
import { ComputedRefImpl } from "./computed"
import { createDep, Dep } from "./dep"

export type EffectScheduler = (...args: any[]) => any

// 表示当前被激活的ReactiveEffect
export let activeEffect: ReactiveEffect | undefined

export class ReactiveEffect<T = any> {
  computed?: ComputedRefImpl<T>
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null,
  ) {

  }

  run () {
    // 记录当前的ReactiveEffect
    activeEffect = this
    // 执行传进来的回调函数
    return this.fn()
  }

  stop () {

  }
}

//KeyToDepMap就是一个key值对应的方法，我们需要实现一个key对应多个effect所以需要Dep类型
type KeyToDepMap = Map<any, Dep>
/**
 * 收集所哟依赖的WeakMap 实例:
 * 1.`key`: 响应性对象
 * 2.`value0`: `Map`对象
 *  1.`key`: 响应性对象的指定属性
 *  2.`value`: 指定对象的指定属性的 执行函数
 */
const targetMap = new WeakMap<any, KeyToDepMap>()

// effect配置
export interface ReactiveEffectOptions {
  // 懒执行
  lazy?: boolean
  scheduler?: EffectScheduler
}

export function effect<T = any>(fn: () => T, options?: ReactiveEffectOptions) {
  // 创建ReactiveEffect传入回调函数
  const _effect = new ReactiveEffect(fn)

  // 如果有传入options，则合并
  // 因为在ReactiveEffect的实例中如果存在scheduler则会调用scheduler调度器方法
  if (options) {
    extend(_effect, options)
  }

  
  if (!options || !options.lazy) {
    _effect.run()
  }
}

/**
 * 用于收集依赖的方法
 * @param target
 * @param key 
 */
export function track(target: object, key: unknown) {
  // activeEffect是再effect的回调函数即将执行前的时候才会赋值的对象，因为该effect使用了这个属性所以要收集依赖
  if (!activeEffect) return
  // 尝试从targetMap中根据target获取map
  let depsMap = targetMap.get(target)
  // 如果获取到的 map 不存在，则生成新的 map 对象，并把该对象赋值给对应的 `value`
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  // 为指定map，指定key 设置回调函数
  // depsMap.set(key, activeEffect)
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = createDep()))
  }
  
  // 放到将activeEffect放到Set中
  tarckEffects(dep)
}

/**
 * 利用 dep 依次跟踪指定 key 的所有 effect
 * set函数式一个不重复的数组，所以即便调用多次里面的ReactiveEffect因为地址值一样所以也不会重复
 * @param dep 
 */
export function tarckEffects(dep: Dep) {
  dep.add(activeEffect!)
}

/**
 * 触发依赖的方法
 * @param target 
 * @param key 
 * @param newValue 
 */
export function trigger(target: object, key: unknown, newValue: unknown) {
  // 根据 target 获取存储的 map 实例
  const depsMap = targetMap.get(target)
  // 如果depsMap 不存在，则直接 return
  if (!depsMap) {
    return
  }
  // 依据 key，从depsMap 中取出 value，该 value 是一个dep 类型的数据
  // dep是一个set类型的ReactiveEffect数组
  const dep = depsMap.get(key)
  if (!dep) {
    return
  }
  // 如果存在则调用triggerEffects触发里面的函数
  triggerEffects(dep)
}

/**
 * 依次触发 dep 中保存的依赖
 * @param dep 
 */
export function triggerEffects(dep: Dep) {
  // 是不是数组,Set并不是一个数组，但是Set类型可以使用三点结构来变成数组
  const effects = isArray(dep) ? dep : [...dep]

  // 触发依赖
  // of与forEach的区别在于可以使用break这些
  for (const effect of effects) {
    // 为了解决死循环问题，需要先执行计算属性的依赖，然后再执行普通effect的依赖
    // 判断是否是计算属性的依赖
    if (effect.computed) {
      triggerEffect(effect)
    }
  }
  for (const effect of effects) {
    // 为了解决死循环问题，需要先执行计算属性的依赖，然后再执行普通effect的依赖
    // 判断是否是计算属性的依赖
    if (!effect.computed) {
      triggerEffect(effect)
    }
  }
}

/**
 * 触发指定依赖
 * @param effect 
 */
export function triggerEffect(effect: ReactiveEffect) {
  // 如果有传入调度器的时候则调用调度器，否则调用run
  if (effect.scheduler) {
    effect.scheduler()
  } else {
    effect.run()
  }
}