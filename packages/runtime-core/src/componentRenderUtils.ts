import { ShapeFlags } from "packages/shared/src/shapeFlags"
import { normalizeVNode } from "./vnode"

// 挂载组件
export function renderComponentRoot (instance) {
  // 拿到组件实例里面保存的vnode 跟 render
  const { vnode, render } = instance

  let result

  try {
    // 判断vnode是否是组件
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      // 组件的render函数返回的是vnode
      // result得到了一个vnode
      // 这里是render函数调用的地方，我们在之前绑定了响应式的data对象,调用call将this指向该对象
      // 但是在setup中如果声明在setup函数内的数据也不会受this的影响，比较使用的过程中不需要通过this，而声明在data中的变量setup也能拿到
      // 在这之前我们已经对data中的数据进行了reactive监听，在这里调用render函数会使用data数据会被收集，如果在setup中我们会主动使用reactive也会在这里被收集
      result = normalizeVNode(render!.call(instance.data))
    }
  } catch (error) {
    console.log(error)
  }

  // 将vnode返回出去
  return result
}