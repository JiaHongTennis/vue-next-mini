import { EMPTY_OBJ, hasChanged, isObject, isReactive } from "@vue/shared"
import { ReactiveEffect } from "packages/reactivity/src/effect"
import { queuePreFlushCb } from "./scheduler"

/**
 * 配置对象接口
 */
export interface WatchOptions<immediate = boolean> {
  // 初始化是否执行一次
  immediate?: immediate
  deep?: boolean
}

/**
 * watch主入口
 * @param source 监听的对象 
 * @param cb 回调函数
 * @param options 配置对象
 */
export function watch(source, cb: Function, options?: WatchOptions) {
  return doWatch(source, cb, options)
}

/**
 * watch执行的入口
 */
function doWatch(
  source,
  cb: Function,
  // 结构赋值， 默认是空对象
  { immediate, deep }: WatchOptions = EMPTY_OBJ
) {
  // 声明一个getter
  let getter: () => any

  // 如果是reactive
  if (isReactive(source)) {
    // getter是一个返回source的类型
    getter = () => source
    deep = true
  } else {
    // 否则getter是一个返回空对象的函数
    getter = () => {}
  }
  if (cb && deep) {
    // 这个操作两个地址值会互换
    const baseGetter = getter
    // traverse的作用是访问每个变量以达到数据收集的效果
    getter = () => traverse(baseGetter())
  }

  

  // 定义旧的值
  let oldValue = {}

  /**
   * watch关键函数
   * 函数整体逻辑是调用run函数拿到最新的值，然后再再调用回调函数将新旧值返回出去
   * 再将新值赋值给旧值
   */
  const job = () => {
    if (cb) {
      const newValue = effect.run()
      if (deep || hasChanged(newValue, oldValue)) {
        // 如果一开始就调用那么oldValue会是空对象
        cb(newValue, oldValue)
        // 新的值赋值给旧的
        // 如果监听的是reactive的时候那么oldValue也会也会改变成新值的样子
        oldValue = newValue
      }
    }
  }

  /**
   * 定义调度器
   * queuePreFlushCb是一个异步微任务的回调方法
   * 当同时执行多个数据改变的时候会等待同步代码执行完
   * job已经用hasChanged(newValue, oldValue)判断留新旧值改变过滤了
   * 所以if判断里面只会执行一次
   */
  let scheduler = () => queuePreFlushCb(job)

  /**
   * getter函数被包了一层traverse函数做数据收集
   * new ReactiveEffect会先执行一次getter函数，所以new ReactiveEffect的时候就做好了数据收集
   * 当数据发生改变的时候scheduler会执行
   */
  const effect = new ReactiveEffect(getter, scheduler)
  if (cb) {
    // 默认执行一次直接执行job
    if (immediate) {
      job()
    } else {
      // 不执行的话掉调用run函数保存下旧值
      oldValue = effect.run()
    }
  } else {
    oldValue = effect.run()
  }

  return () => {
    effect.stop()
  }
}

/**
 * watch与effect以及computed不同
 * 我们进行数据收集track的时候需要满足两个条件
 * 第一是有new ReactiveEffect 然后有保存一个activeEffect
 * 第二是执行effect或者是计算属性里面的函数(计算属性函数的执行是在被使用的时候)
 * 当回调函数被执行的时候则里面若有使用到reactive或者ref的时候就会被收集起来，触发setter的时候就会触发依赖
 * 但是watch并没有执行函数，所以需要内部手动递归访问每一个变量以达到收集的效果
 * @param value watch监听的数据
 */
export function traverse (value: unknown) {
  // 是否是对象
  if (!isObject(value)) {
    // 不是的话直接返回
    return value
  }
  for (const key in value as Object) {
    traverse((value as Object)[key])
  }
  return value
}