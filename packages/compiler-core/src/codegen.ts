import { isArray, isString } from "@vue/shared"
import { NodeTypes } from "./ast"
import { helperNameMap } from "./runtimeHelpers"
import { getVNodeHelper } from "./utils"

// 这个是嵌套在数组map函数里面的通过symbol取出真正的方法名，并且拼接为对象属性`fun: _fun`的字符串
const aliasHelper = (s: symbol) => `${helperNameMap[s]}: _${helperNameMap[s]}`

function createCodegenContext (ast) {
  const context = {
    // 函数字符串
    code: '',
    // 全局变量字符串
    runtimeGlobalName: 'Vue',
    // 源码(这个不知道有啥用)
    source: ast.loc.source,
    // 缩放级别
    indentLevel: 0,
    // 是否是SSR
    isSSR: false,
    // helper函数可以通过ast.helpers中的数组取出真正的执行函数名
    helper(key) {
      return `_${helperNameMap[key]}`
    },
    push(code) {
      context.code += code
    },
    // 进
    indent() {
      newline(++context.indentLevel)
    },
    // 缩
    deindent(withoutNewLine = false) {
      newline(--context.indentLevel)
    },
    // 换行
    newline() {
      newline(context.indentLevel)
    }
  }

  function newline(n: number) {
    context.code += '\n' + `  `.repeat(n)
  }

  return context
}

// 将javascript AST内容拼接为一个render函数的方法
/**
 * resFun = () => {
 *  const _Vue = Vue
 *  return function render(_ctx, _cache) {
 *  const { createElementVNode: _createElementVNode } = _Vue
 *    return _createElementVNode("div", [], ["hello word"])
 *  }
 * }
 * generate方法返回的本质上就是resFun方法
 * 这个方法会将Vue通过闭包的方式保存在内部返回的render函数内
 * 那么根据当前的ast对象内部就会有了对应的createElementVNode方法
 * createElementVNode本质上就是vnode中的createVNode也就是创建vnode的方法
 * 所以返回的render函数本质上就是组件的render方法
 * 所以javascript AST对象本质上就是将codegenNode转化为createVNode的参数来创建vnode
 * @param ast 
 * @returns 
 */
export function generate(ast) {
  // 创建上下文对象
  const context = createCodegenContext(ast)
  // 结构处上下文对象的方法
  const { push, indent, deindent, newline } = context

  // 接下来处理context.code中的函数字符串拼接
  // 处理前置代码
  genFunctionPreamble(context)
  // 函数名称
  const functionName = 'render'
  // 参数
  const args = ['_ctx', '_cache']
  const signature = args.join(', ')
  push(`function ${functionName}(${signature}) {`)
  // 换行
  newline()
  // 进两格
  indent()
  const hasHelpers = ast.helpers.length > 0
  if (hasHelpers) {
    // 如果helpers有函数则取从_Vue取出函数
    push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = _Vue`)
    push('\n')
    newline()
  }
  newline()
  // 拼接返回值
  push(`return `)
  
  if (ast.codegenNode) {
    // 这里其实就是将ast中的codegenNode转为创建vnode的函数
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }

  // 换行
  newline()
  // 缩两格
  deindent()

  // 结尾补上}
  push('}')

  return {
    ast,
    code: context.code
  }
}

// 处理节点转化为创建vnode的函数字符串添加进code
function genNode(node, context) {
  // 判断节点类型
  switch (node.type) {
    // 这个表示这element节点
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
    // 这个表示文本节点
    case NodeTypes.TEXT:
      // 如果是文本节点则直接返回
      genText(node, context)
      break
  }
}

// 处理vnode
function genVNodeCall (node, context) {
  // 取出push方法
  const { push, helper } = context
  // node里面所有的的信息
  const {
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    disableTracking,
    isComponent
  } = node
  // 处理好返回函数的函数名
  const callHelper = getVNodeHelper(context.isSSR, isComponent)
  push(helper(callHelper) + `(`)
  // 处理参数,这里会将参数从后向前判断如果为null则去掉，参数的顺序是按照vnode创建的顺序添加的
  const args = genNullableArgs([tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    disableTracking])
  // 这里是将参数处理为字符串，有的参数是数组我们需要转为字符串"[a, b, c]"的形式
  genNodeList(args, context)
  // 参数闭合
  push(')')
}

// 处理参数根据数组内参数类型的不同分别拼接成对应的字符串
function genNodeList (nodes, context) {
  const { push, newline } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    
    if (isString(node)) {
      // 如果是字符串,则直接放入
      push(node)
    } else if (isArray(node)) {
      genNodeListAsArray(node, context)
    } else {
      genNode(node, context)
    }

    // 如果当前不是nodes的左后一个则嘉茹，分割
    if (i < nodes.length - 1) {
      push(`, `)
    }
  }
}

// 处理返回函数的参数
function genNullableArgs(args: any[]) {
  let i = args.length
  while (i--) {
    if (args[i] != null) break
  }
  return args.slice(0, i + 1).map(arg => arg || `null`)
}

// 处理数组类型的字符串参数
function genNodeListAsArray(nodes, context) {
  context.push('[')
  genNodeList(nodes, context)
  context.push(']')
}

// 处理文本节点
function genText(node, context) {
  context.push(JSON.stringify(node.content))
}

function genFunctionPreamble (context) {
  const { push, runtimeGlobalName, newline } = context
  const VueBinding = runtimeGlobalName
  // 这里不是很理解为什么不直接拿runtimeGlobalName
  push(`const _Vue = ${VueBinding}\n`)

  // 换行
  newline()
  push(`return `)
}