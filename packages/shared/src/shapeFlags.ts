// 这里采用的是位操作符，位操作符控制的是二进制，每一个变量都有自己的位置
// 当金星按位或运算的时候其实等同于添加， 而进行按位与运算的时候等同于查询

export const enum ShapeFlags {
  /**
   * type = Element
   */
  ELEMENT = 1,
  /**
   * 函数组件
   */
  FUNCTIONAL_COMPONENT = 1 << 1,
  /**
   * 有状态（响应数据）组件
   */
  STATEFUL_COMPONENT = 1 << 2,
  /**
   * children = Text
   */
  TEXT_CHILDREN = 1 << 3,
  /**
   * children = Array
   */
  ARRAY_CHILDREN = 1 << 4,
  /**
   * children = slot
   */
  SLOTS_CHILDREN = 1 << 5,
  TELEPORT = 1 << 6,
  SUSPENSE = 1 << 7,
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEPT_ALIVE = 1 << 9,
  /**
   * 组件：有状态(响应数据)组件 | 函数组件
   */
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
