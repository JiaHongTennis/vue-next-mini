import { reactive } from "@vue/reactivity"
import { isObject } from "@vue/shared"
import { onBeforeMount, onMounted } from "./apiLifecycle"

// 处理组件的options
export function applyOptions (instance) {
  // 拿到options对象
  const options = instance.type
  // 解构出所有的options,此时data是一个函数
  // 包含了生命周期等的option

  // 如果生命周期beforeCreate存在
  if (options.beforeCreate) {
    // 使用callHook调用方法,所以beforeCreate的生命周期在这个阶段调用,this指向data
    callHook(options.beforeCreate, instance.data)
  }

  const {
    data: dataOptions,
    created,
    beforeMount,
    mounted,
  } = options

  if (dataOptions) {
    // 拿到data的返回值函数
    const data = dataOptions()

    // 判断data是否是对象
    if (isObject(data)) {
      // 调用reactive将data变为响应式对象保存到实例里面,这样在调用render的时候可以将data改变一下指向
      instance.data = reactive(data)
    }
  }

  // created的生命周期，此时实是在添加完data的响应式数据之后
  if (created) {
    // 触发created,this指向data
    callHook(created, instance.data)
  }

  /**
   * 这个操作是将生命周期的回调函数注册到组件实例中
   * onBeforeMount onMounted 都是封装对应类型的注册函数
   * 经过registerLifecycleHook这个方法可以吧第二个参数的回调函数注册到第一个参数的函数中对应的类型上去
   * 这样实例化对象里面就保存了对应的回调函数
   */
  registerLifecycleHook(onBeforeMount, beforeMount)
  registerLifecycleHook(onMounted, mounted)

  /**
   * 注册回调统一方法
   * @param register 接收每一个生命周期的注册方法将hook回调注册到对应的instance生命周期上去
   * @param hook 生命周期
   */
  function registerLifecycleHook(
    register: Function,
    hook?: Function
  ) {
    // 这边在注册的hook也改变下this的指向
    register(hook?.bind(instance.data), instance)
  }
}

/**
 * 触发生命周期的函数,在这里主要做的事情是改变hook的this指向
 * @param hook 生命周期
 */
function callHook (hook: Function, proxy: any) {
  hook.bind(proxy)
}