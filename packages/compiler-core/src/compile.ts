import { extend } from "@vue/shared"
import { baseParse } from "./parse"
import { transform } from "./transform"
import { transformElement } from "./transforms/transformElement"
import { transformText } from "./transforms/transformText"
import { generate } from './codegen'

// compile方法入口
export function baseCompile(
  template: string,
  options = {}
) {

  // 通过 parse 方法进行解析，得到AST
  const ast = baseParse(template)

  // 将ast转为javascript
  transform(ast, extend(options, {
    // 默认参数
    // 里面包含了transformxxx的函数
    nodeTransforms: [transformElement, transformText]
  }))

  console.log('ast', ast)

  return generate(ast)
}