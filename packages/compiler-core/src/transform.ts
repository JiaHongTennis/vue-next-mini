import { NodeTypes } from "./ast"
import { isSingleElementRoot } from "./transforms/hoistStatic"

/**
 * trabsfirm 上下文对象
 */
export interface TransformContext {
  /**
   * AST 根节点
   */
  root
  /**
   * 每次转化时记录的父节点
   */
  parent: ParentNode | null
  /**
   * 每次转化时记录的子节点索引
   */
  childIndex: number
  /**
   * 当前处理的节点
   */
  currentNode
  /**
   * 协助创建 javascript AST 属性 helpers,该属性是一个Map,key 值为Symbol(方法名),表示render函数中创建节点的方法
   */
  helpers: Map<symbol, number>
  // helper主要是配合helpers放东西
  helper<T extends symbol>(name: T): T
  /**
   * 转化方法集合
   */
  nodeTransforms: any
}

/**
 * 创建 transform 上下文
 * @param root 
 * @param param1 
 * @returns 
 */
export function createTransformContext(root, { nodeTransforms = [] }) {
  const context: TransformContext = {
    nodeTransforms,
    root,
    helpers: new Map(),
    currentNode: root,
    parent: null,
    childIndex: 0,
    // helper主要是配合helpers放东西
    helper (name) {
      const count = context.helpers.get(name) || 0
      context.helpers.set(name, count + 1)
      return name
    }
  }

  return context
}

/**
 * 将ast转为javascriptast
 * @param root ast
 * @param options 配置对象
 */
export function transform(root, options) {
  // 这里主要完成两块功能
  // 第一生成上下文
  const context = createTransformContext(root, options)
  // 按照深度优先一次处理 node 节点转化
  traverseNode(root, context)

  // 处理根节点
  createRootCodegen(root)
  // 在第二步执行traverseNode的时候会把helpers存入方法名，我们放到根节点来
  // 通过key 拿到Map的key返回一个数组
  root.helpers = [...context.helpers.keys()]
  root.components = []
  root.directives = []
  root.imports = []
  root.hoists = []
  root.temps = []
  root.cached = []
}

/**
 * 遍历转化节点，转化的过程一定要是深度优先的 (即: 孙 ->子 -> 父)，因为当前节点的状态往往需要根据子节点的情况来确定。
 * 转化的过程分为两个阶段:
 * 1.进入阶段: 存储所有节点的转化函数到 exitFns 中
 * 2，退出阶段: 执行 exitFns 中缓存的转化函数，且一定是倒叙的。因为只有这样才能保证整个处理过程是深度优先的
 * 这里整个逻辑整体来说就是将各种transform函数存储到exitFns中transform内部会返回一个函数
 * 这样就会有闭包在返回函数的时候闭包会存储当前的context的状态可以拿到childIndex currentNode 以及当前的node节点等信息
 * 当这样一来就实现了深度优先调用
 */
export function traverseNode (node, context: TransformContext) {
  // 记录当前正在处理的node
  context.currentNode = node
  // 拿到nodeTransforms
  const { nodeTransforms } = context
  // 构建保存函数的数组
  const exitFns: any = []
  // 接下来往数组存储转化函数
  for (let i = 0; i < nodeTransforms.length; i++) {
    //nodeTransforms[i]返回的一定是闭包的函数
    const onExit = nodeTransforms[i](node, context);
    // onExit就是一个闭包函数
    if (onExit) {
      exitFns.push(onExit)
    }
  }

  // 进入阶段
  // 判断当前节点的类型
  switch (node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      // 如果是element或者是根节点, 那么就需要处理子节点
      traverseChildren(node, context)
      break
  }

  // 退出阶段
  context.currentNode = node
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}

export function traverseChildren (parent, context: TransformContext) {
  // 拿到子节点
  parent.children.forEach((node, index) => {
    context.parent = parent
    context.childIndex = index
    traverseNode(node, context)
  });
}

/**
 * 构建根节点
 */
function createRootCodegen (root) {
  const { children } = root

  // Vue2仅支持单个根节点
  if (children.length === 1) {
    const child = children[0]
    // 判断是否是单个根
    // 判断是否是单个的element的更节点
    // child是单个节点的那个node
    if (isSingleElementRoot(root, child)) {
      // 将根节点下的第一个element的codegenNode拿过来
      root.codegenNode = child.codegenNode
    }
  }
}