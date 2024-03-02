import { isFunction } from "@vue/shared";
import { Dep } from "./dep";
import { ReactiveEffect } from "./effect";
import { trackRefValue, triggerRefValue } from "./ref";

// 计算属性
export function computed (getterOrOptions) {
  let getter

  // 判断第一个参数是否是函数类型
  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
  }

  // 创建一个ComputedRefImpl
  const cRef = new ComputedRefImpl(getter)

  // 返回实例化对象
  return cRef
}

// 计算属性实例化类
export class ComputedRefImpl<T> {
  // 这里是计算属性被使用的时候收集的依赖于计算属性的effect
  public dep?: Dep = undefined
  // 要返回的值
  private _value!: T
  // effect
  public readonly effect: ReactiveEffect<T>
  // 是否死ref值设置为true
  public readonly __v_isRef = true
  //定义一个脏变量
  public _dirty = true

  constructor (getter) {
    // new ReactiveEffect的时候当getter里面所有的变量如果存在reactive或者是ref的时候则会被收集到数据中，那么当数据改变的时候就会触发调度器函数
    this.effect = new ReactiveEffect(getter, () => {
      // 2.这里是一个调度器函数,当触发依赖的时候会执行这边的方法
      if (!this._dirty) {
        // 标注下数据已经脏了
        this._dirty = true
        // 3.调用这个方法会触发依赖函数，那么所有引用到计算属性变量的effect都会执行
        // 4.当effect再次执行的时候，那么会再次执行get value方法，此时我们的脏变量以及改成了true
        triggerRefValue(this)
      }
    })
    this.effect.computed = this
  }

  get value () {
    // 收集计算实行依赖
    // 在effect里面使用ComputedRefImpl那里么ComputedRefImpl里面会有有个dpe保存的是所有依赖的effect
    // 1.当计算属性里面所依赖的值发生改变的时候会触发调度器函数
    // 注意：这里有个很问题，那就是一个effect里面有可能同时需要访问到多次计算属性变量,那么get value有可调用多次
    // 这会导致一个问题是第一次进入到该方法的时候trackRefValue(this)收集的回调时effect的回调但是当this._dirty = true从而调用this.effect.run()的时候
    // activeEffect就会指向this.effect,会导致ref.dep内部有两个不同的回调，所以数据改变的时候，计算属性初始化的调度方法会执行两次
    // 但是当第一个get value执行完毕后，因为访问了计算属性问题activeEffect会变成计算属性，导致会将计算属性的ReactiveEffect关联进来
    // 处理办法: 在triggerRefValue后面执行调度器的时候优先先执行调度器的内容，这会导致_dirty一直都是true而跳过triggerRefValue导致死循环
    trackRefValue(this)
    // 运行计算属性回调函数拿到结果
    // _dirty会做一个缓存的操作
    // 5.再一次执行这里的时候就会发现是false,会再次调用run函数
    if (this._dirty) {
      this._dirty = false
      // 这里执行run方法的时候会执行 activeEffect = this
      // 这样当effect内部使用到计算属性的时候收集的依赖函数实际上就是计算属性初始化的具有调度方法的effect
      // 当数据第一次访问计算属性的时候，就会重新调用属性的方法，那么计算属性内部的响应式数据reactive就会调用track收集this.effect
      this._value = this.effect.run()
    }
    // 返回结果
    return this._value
  }
}