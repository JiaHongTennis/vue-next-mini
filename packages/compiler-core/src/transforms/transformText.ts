import { NodeTypes } from "../ast"
import { isText } from "../utils"

/**
 * 将相邻的文本节点和表达式合并成一个表达式
 * 例如 :
 * <div>hello {{ msg }}</div>
 * 1. hello: TEXT 文本节点
 * 2. {{ msg }}: INTERPOLATION 表达式节点
 * 这两个节点在生成 render 图数时，需要被合并: 'hello' + _toDisplayString(_ctx.msg)
 * 那么在合并时就要多出来这个 + 加号
 * 例如:
 * children:[
 *  { TEXT 文本节点 },
 *  “ + ”,
 *  { INTERPOLATION 表达式节点 }
 * ]
 * @param node node节点
 * @param context context对象
 * @returns 
 */
export const transformText = (node, context) => {
  // 判断节点类型
  if (
    node.type === NodeTypes.ROOT ||
    node.type === NodeTypes.ELEMENT ||
    node.type === NodeTypes.FOR ||
    node.type === NodeTypes.IF_BRANCH
  ) {
    // 返回匿名函数
    return () => {
      const children = node.children
      let currentContainer

      for (let i = 0; i < children.length; i++) {
        // 拿到children的第一个
        const child = children[i]
        // 判断第一个是否是字符串
        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            // 是的话取出下一个，继续判断是否是字符串
            const next = children[j]

            if (!currentContainer) {
              // 如果第一次currentContainer不存在则直接赋值
              // 通过createCompoundExpression创建复合表达式的节点
              currentContainer = children[i] = createCompoundExpression([child], child.loc)
            }
            
            if (isText(next)) {
              // 当存在next的时候，证明currentContainer以及存在并且存在children=[child]
              currentContainer.children.push(' + ', next)
              // 处理好后删除
              children.splice(j, 1)
              j--
            } else {
              // 如果第一个节点是文本，第二个不是则不需要合并
              currentContainer = undefined
              break
            }
          }
        }
      }
    }
  }
}

export function createCompoundExpression (children, loc) {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    loc,
    children
  }
}

