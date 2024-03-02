import {
  baseCompile
} from '@vue/compiler-core'

// 导出compile入口方法
export function compile(
  template: string,
  options = {}
) {
  return baseCompile(template, options)
}