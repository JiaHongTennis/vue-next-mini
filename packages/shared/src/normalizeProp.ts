import { isArray, isObject, isString } from "."

/**
 * 对class参数进行增强
 * @param value 
 */
export function normalizeClass(value: unknown): string {
  let res = ''
  if (isString(value)) {
    // 如果是字符串直接返回
    res = value
  } else if (isArray(value)) {
    // 如果是数组循环则递归调用，并拿到结果
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i])
      if (normalized) {
        res += normalized + ' '
      }
    }
  } else if (isObject(value)) {
    // 如果是对象，则判断值是否为true
    for (const name in value as object) {
      if ((value as object)[name]) {
        res += name + ' '
      }
    }
  }
  // 去掉左右的空格
  return res.trim()
}