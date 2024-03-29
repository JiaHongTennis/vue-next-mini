export const CREATE_ELEMENT_VNODE = Symbol('createElementVNode')
export const CREATE_VNODE = Symbol('createVNode')

export const helperNameMap: Record<symbol, string> = {
  [CREATE_ELEMENT_VNODE]: 'createElementVNode',
  [CREATE_VNODE]: 'createVNode'
}