import { isFunction } from "@vue/shared";
import { applyOptions } from "./componentOptions";
import { VNode } from "./vnode";
let uid = 0

// 生命hooks的枚举类型
export const enum LifecycleHooks {
  BEFORE_CREATE = 'bc',
  CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm'
}

// 生成组件实例的方法
export function createComponentInstance(
  vnode: VNode
) {
  // 特别注意：组件的type本质上是一个对象包含着render函数
  let type = vnode.type

  // 定义一个组件的实例
  const instance = {
    // 唯一标识
    uid: uid++,
    // vnode
    vnode: vnode,
    // 类型
    type: type,
    // 组件里面最需要渲染的，渲染树
    subTree: null,
    // update函数
    update: null,
    // render函数
    render: null,
    // 生命周期
    bc: null,
    c: null,
    bm: null,
    m: null,
  }

  // 返回一个组件的实例
  return instance
}

// 绑定render
export function  setupComponent (instance) {
  setupStatefulComponent(instance)
}

// 处理setup或者options
function setupStatefulComponent (instance) {
  const Component = instance.type

  // 获取setup参数
  const { setup } = Component

  // 判断是否存在setup选项
  if (setup) {
    // 调用setup然后返回setup返回的额匿名函数
    const setupResult = setup()
    console.log(setupResult)
    // 将setup返回的匿名函数绑定到实例对象的render,并执行下一步
    handleSetupResult(instance, setupResult)
  } else {
    finishComponentSetup(instance)
  }
}

// 将setup返回结果添加进实例的render
export function handleSetupResult(instance, setupResult) {
  if (isFunction(setupResult)) {
    instance.render = setupResult
  }
  // 然后调用finishComponentSetup处理下一步
  finishComponentSetup(instance)
}

// 赋值render的操作
function finishComponentSetup (instance) {
  // 拿到组建的type值，组件的type值是一个包含render的对象
  const Component = instance.type

  // 如果instance.render有值，证明存在setup在里面以及返回了函数了就无需进入
  if (!instance.render) {
    // 如果没有setup就需要组件里面存在render函数,赋值给实例化对象
    instance.render = Component.render
  }

  // 赋值完之后我们取处理Options
  // 在里面绑定了响应式的data返回值
  // 处理生命周期
  applyOptions(instance)
}