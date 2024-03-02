import { extend } from "@vue/shared"
import { createRenderer } from "packages/runtime-core/src/renderer"
import { nodeOps } from "./nodeOps"
import { patchProp } from './patchProp'

// 定义一个保存renderer的变量
let renderer

// 传递给createRenderer的参数，由patchProp跟nodeOps合并
const rendererOptions = /*#__PURE__*/ extend({ patchProp }, nodeOps)

// 合并
function ensureRenderer() {
  // 是否存在renderer，不存在则创建一个
  return (
    renderer ||
    (renderer = createRenderer(rendererOptions))
  )
}

// 导出的最终被使用的render函数
export const render = ((...args) => {
  ensureRenderer().render(...args)
}) 
