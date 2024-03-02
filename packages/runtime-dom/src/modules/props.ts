/**
 * 设置DOMPrototype方法
 * @param el 
 * @param key 
 * @param value 
 */
export function patchDOMProp(
  el: any,
  key: string,
  value: any,
) {
  try {
    el[key] = value
  } catch (error) {
    
  }
}