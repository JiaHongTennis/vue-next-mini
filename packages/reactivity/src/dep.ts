import { ReactiveEffect } from "./effect";

// 实现多个响应性需要把ReactiveEffect变成多个,所以需要一个Set类型
export type Dep = Set<ReactiveEffect>

// 生成Dep的方法
export const createDep = (effects?: ReactiveEffect[]) => {
  const dep = new Set<ReactiveEffect>(effects) as Dep
  return dep
}