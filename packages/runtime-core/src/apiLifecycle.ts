import { LifecycleHooks } from "./component"

/**
 * 
 * @param type 组件实例对象里面保存的方法回调函数的key
 * @param hook 回调函数本身
 * @param target 组件实例化对象
 */
export function injectHook (type: LifecycleHooks, hook: Function, target) {
  // 如果实例对象存在则将方法添加进来
  if (target) {
    target[type] = hook
  }
}

// 创建生命周期注册方法的统一地方
export const createHook = (lifecycle: LifecycleHooks) => {
  // 对外暴露出一个方法,这个方法就是被registerLifecycleHook里面所调用会传进来对应的回调函数跟组件实例对象
  // 通过injectHook的方法吧hook注册到target
  // 接收的lifecycle就是组件实例对象里面保存的key
  /**
   * hook 回调函数
   * target 实例对象
   */
  return (hook, target) => injectHook(lifecycle, hook, target)
}

// 导出每一个生命周期的注册方法
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)