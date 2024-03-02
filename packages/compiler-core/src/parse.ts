import { ElementTypes, NodeTypes } from "./ast"

export interface ParserContext {
  // 就是模板字符串
  source: string
}

const enum TagType {
  Start,
  End
}

function createParserContext (content: string): ParserContext {
  return {
    source: content
  }
}

/**
 * 生成根节点
 * @param children 
 * @returns 
 */
export function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children,
    loc: {}
  }
}

// 生成ast对象方法
export function baseParse(
  content: string,
  options = {}
) {
  // 生成context上下文对象
  const context = createParserContext(content)
  // const start = getCursor(context)
  // return createRoot(
  //   parseChildren(context, TextModes.DATA, []),
  //   getSelection(context, start)
  // )
  // 构建出解析子节点的对象
  const children = parseChildren(context, [])

  // 放入到根节点并返回
  return createRoot(children)
}

/**
 * 解析context上下文对象返回解析后的nodes
 * @param context 上下文对象
 */
function parseChildren (context: ParserContext, ancestors) {
  const nodes = []

  // 通过while来解析模板
  // 通过isEnd来判断是否结束，目前能知道的是当context.source里面的字符串等于空的时候没得解析就会跳出
  while (!isEnd(context, ancestors)) {
    // 取出模板
    const s = context.source

    let node

    if (startsWith(s, '{{')) {
      // 是否是模板字符串{{
    } else if (s[0] === '<') {
      // 是否为<是的话表示标签的开始符号
      // 正则匹配一下是否<后面是字母
      // /i (忽略大小写)
      // /g (全文查找出现的所有匹配字符)
      // /m (多行查找)
      // /gi(全文查找、忽略大小写)
      // /ig(全文查找、忽略大小写)
      if (/[a-z]/i.test(s[1])) {
        // 拿到node
        node = parseElement(context, ancestors)
      }
    }

    if (!node) {
      // node值为undefined,意味着模板字符串s既不是标签开始，也不是模板字符串
      // 那么就是文本节点
      node = parseText(context)
    }

    pushNode(nodes, node)
  }

  return nodes
}

// 添加到nodes
function pushNode (nodes, node) {
  nodes.push(node)
}

function parseElement (context: ParserContext, ancestors) {
  // 处理好开始标签,返回处理后的结果
  const element = parseTag(context, TagType.Start)

  // 将element丢进去ancestors,在parseChildren内部执行isEnd的时候会去除element.tag判断是否是结束标签
  // 如果是结束标签则中断,这里目前已知的是起到二次校验单额作用
  // 这里主要是处理标签中间内容部分也就是<tag>处理子节点children</tag>
  // 所以调用parseChildren去继续解析
  ancestors.push(element)
  const children = parseChildren(context, ancestors)
  // 校验完之后再去除element
  ancestors.pop()
  element.children = children

  // 处理结束标签
  // 判断是否是结束标签</开头
  if (startsWithEndTagOpen(context.source, element.tag)) {
    // 如果是的话则调用parseTag这个会处理掉tab节点并返回element
    // 但是当前这里并没有接收element，唯一渠道的作用是去掉了context的</tag>标签
    parseTag(context, TagType.End)
  }
  
  // 处理完成最终返回element
  return element
}

/**
 * 处理文本节点
 * @param context 
 */
function parseText (context: ParserContext) {
  // 定义特殊的额字符白名单
  const endTokens = ['<', '{{']

  // 初始化默认长度等于文本自身
  let endIndex = context.source.length

  // 循环判断是否有特殊字符，有的话截止取普通文本长度
  for (let i = 0; i < endTokens.length; i++) {
    // 第二个参数表示从下表1开始找
    const index = context.source.indexOf(endTokens[i], 1)
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  // 解析文本,获取解析文本内容
  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content
  }
}

// 解析文本
function parseTextData (context: ParserContext, length: number) {
  // 截取出文本
  const rawText = context.source.slice(0, length)
  
  // 游标右移
  advanceBy(context, length)

  // 返回文本
  return rawText
}

/**
 * 解析标签的tag
 * @param context 上下文 
 * @param type 类型表示开头或结束
 * @returns 
 */
function parseTag (context: ParserContext, type: TagType) {
  // 这里的作用是通过正则匹配解析出标签内开头第一个<tag>或</tag>的值tag
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)!
  // match[0] = <tag
  // match[1] = tag
  const tag = match[1]

  // 游标右移,这个操作等用于去掉context里面的<tag
  advanceBy(context, match[0].length)

  // 接着判断结束标签是否是自闭合，也就是单标签，根据类型来确定游标右移得到数量
  let isSelfClosing = startsWith(context.source, '/>')

  // isSelfClosing=true就是单标签,右移2位
  advanceBy(context, isSelfClosing ? 2 : 1)


  return {
    type: NodeTypes.ELEMENT,
    tag,
    tagType: ElementTypes.ELEMENT,
    children: [],
    props: []
  }
}

// 游标右移
function advanceBy(context: ParserContext, numberOfCharacters: number): void {
  const { source } = context
  // 利用slice进行删除前面的字符串
  context.source = source.slice(numberOfCharacters)
}

/**
 * 判断当前是否是结束标签
 * @param context 上下文
 * @param ancestors elementnode节点数组
 */
function isEnd (
  context: ParserContext,
  ancestors
) {
  // 获取当前的模板字符串
  const s = context.source

  // 当前是否以</结束标签开头
  if (startsWith(s, '</')) {
    // 自后向前循环
    for (let i = ancestors.length - 1; i >= 0; --i) {
      // 判断是否为结束标签的开始
      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
        return true
      }
    }
  }
  // 否者返回!s s代表当前模板，如果模板不为空这!s为false
  // 这里的用意是在parseChildren调用的时候可以判断后面的模板是否为空为空则跳出while循环不再解析
  return !s
}

/**
 * 判断字符串source是否以searchString开头,这里一般用来判断标签开始或结束
 * @param source 被判断的对象
 * @param searchString 判断条件
 * @returns 
 */
function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString)
}

/**
 * 字符串判断是否为结束标签的开始
 * @param source 
 * @param tag 
 * @returns 
 */
function startsWithEndTagOpen(source: string, tag: string): boolean {
  return (
    startsWith(source, '</')
    // startsWith(source, '</') &&
    // source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    // /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
  )
}