import { createVNodeCall, NodeTypes } from "../ast"

export const transformElement = (node, context) => {
  // 返回一个闭包函数
  return function postTransformElement() {
    // 通过闭包的关系我们就可以拿到当前执行的node,以及context上下文
    // 这里本质上跟取上面参数是一样的,因为在调用transform的时候也往context添加了当前的node在currentNode
    node = context.currentNode
    // 判断node类型,因为不管是什么类型的节点都会执行这个闭包方法，所以要过滤
    if (node.type !== NodeTypes.ELEMENT) {
      return
    }
    // 只要是element就会有tag
    const { tag } = node
    let vnodeTag = `"${tag}"`
    let vnodeProps = []
    let vnodeChildren = node.children

    /**
     * 核心新增一个codegenNode
     * 这里的作用是为了后期在第三部执行生成render函数的时候因为组件的render函数返回的是vnode
     * 因此需要构建一个将当前节点通过createVNode的方式创建出来而codegenNode则是将节点的信息记录到ast中去
     * 以便于后期生成render函数
     */
    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren
    )
  }
}