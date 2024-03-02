import { ReactiveFlage } from "packages/reactivity/src/reactive"

export const isArray = Array.isArray

export const isObject = (val: unknown) => {
  return (val !== null && typeof val === 'object')
}

// 判断值是否发生改变
export const hasChanged = (value: any, oldValue: any): boolean => {
  return !Object.is(value, oldValue)
}

// 判断是否是函数类型
export const isFunction = (val: unknown): val is Function => {
  return typeof val === 'function'
}

// 合并方法
export const extend = Object.assign

// 空对象常量
export const EMPTY_OBJ: { readonly [key: string]: any } = {}

// 判断是否是reactive
export function isReactive (value): boolean {
  return !!(value && value[ReactiveFlage.IS_REACTIVE])
}

// 判断是否是字符串
export const isString = (val: unknown): val is string => typeof val === 'string'

// 是否以on开头
const onRE = /^on[^a-z]/
export const isOn = (key: string) => onRE.test(key)

