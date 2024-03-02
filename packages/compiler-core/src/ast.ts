import { CREATE_ELEMENT_VNODE } from "./runtimeHelpers";
import { TransformContext } from "./transform";

// 节点类型的枚举
export const enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ATTRIBUTE,
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION,
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL,
  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,

  // ssr codegen
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT
}

// element类型枚举
export const enum ElementTypes {
  ELEMENT,
  COMPONENT,
  SLOT,
  TEMPLATE
}

export function createVNodeCall(
  context: TransformContext | null,
  tag,
  props,
  children,
) {
  // name其实是生成render函数时的执行函数
  if (context) {
    // helper会往helpers对象里面添加sybmol
    context.helper(CREATE_ELEMENT_VNODE)
  }

  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children
  }
}