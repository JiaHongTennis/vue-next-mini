import { EMPTY_OBJ, isString } from "@vue/shared"
import { ShapeFlags } from "packages/shared/src/shapeFlags"
import { Comment, Fragment, isSameVNodeType, normalizeVNode, Text } from "./vnode"
import { createComponentInstance, setupComponent } from './component'
import { ReactiveEffect } from "packages/reactivity/src/effect"
import { queuePreFlushCb } from "./scheduler"
import { renderComponentRoot } from "./componentRenderUtils"


/**
 * 整体流程
 * ---------------------------------render----------------------------------------
 * 接收参数 vnode 跟 容器container
 * 容器container中保存着_vnode为上一个vnode的信息
 * render 的作用是如果新节点为null 并且存在_novde就删除，其余调用patch执行整体打补丁或者说是更新的操作
 * 
 * ---------------------------------patch----------------------------------------
 * 接收参数 旧节点oldvnode 新节点 newvnode 跟容器container
 * 首先判断节点类型 节点类型有 字符串,字符串有两种可能['一种普通的element可以说是普通的dom'，'一种是组件']需要根据ShapeFlags区分
 * 其余的就是Text文本 Comment注释 Fragment片段类型
 * patch的主要作用是根据不同的类型来调用不同的processHandel来处理并将参数传递过去
 * 
 * -----------------------------------processHandel------------------------------
 * processHandel统一的做法就是判断旧vnode是否存在
 * 不存在则挂载，存在就更新
 * 
 * *--------------------------processHandel.processElement------------------------------
 * 对于Element类型的挂载跟更新内部分为
 * mountElement 如果不存在旧节点就会到这里会执行真正的dom创建然后挂载到界面上，在这里会将props处理并挂载上去
 * 
 * patchElement 如果旧节点存在就会调用这个执行更新
 * 内部会调用 patchChildren 跟 patchProps 来更新props跟子节点文本(目前功能只能用来更新文本嵌套的子节点还没掌握)
 * 
 * **-------------------------processHandel.processFragment--------------------------
 * 处理片段类型
 * 片段类型内部也会调用挂载跟更新
 * 
 * 挂载的话会调用for循环,字符串在for循环中会被拆成一个个的字符
 * 被分割的字符串实际上就是字符串，我们调用normalizeVNode将字符串转成vnode
 * normalizeVNode方法如果传进去的是字符串的类型type固定是Text类型
 * 然后调用patch,执行patch之后的逻辑,旧节点传null,那么patch就会发现是null执行挂载,从而拆分成多个字符串不断挂载进来
 * 
 * 而更新也会调用patchChildren,目前的方法里面patchChildren由于子节点都是字符串所以实际上跟processElement的更新方式一样都是替换子节点文本
 * 
 */

/**
 * 渲染器配置对象
 */
export interface RendererOptions {
  /**
   * 为指定的element 的 props 打补丁
   */
  patchProp (el: Element, key: string, prevValue: any, nextValue: any): void,
  /**
   * 为指定的 Element 设置 text
   */
  setElementText(node: Element, text: string): void,
  /**
   * 插入指定的el 到 parent 中 anchor 表示插入的位置， 即锚点
   */
  insert(el, parent: Element, anchor?):void,
  /**
   * 创建指定的 Element
   */
  createElement(type: string),
  /**
   * 
   * @param type 删除节点
   */
  remove(type: Element),

  createText(text: string),
  setText(node, text: string): void,
  createComment: (text: string)
}
/**
 * 对外导出一个createRenderer函数
 * @param options 
 */
export function createRenderer (options: RendererOptions) {
  return baseCreateRenderer(options)
}

// render渲染器的主函数
export function baseCreateRenderer(options: RendererOptions) {

  // 从options中拿到操作dom的方法
  const {
    insert: hostInsert,
    patchProp: hostPatchProp,
    createText: hostCreateText,
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    remove: hostRemove,
    setText: hostSetText,
    createComment: hostCreateComment
  } = options

  // 处理文本
  const processText = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 如果旧的值不存在则是挂载,掉还用函数传入节点上的文本创建新的节点并保存到el
      newVNode.el = hostCreateText(newVNode.children)
      // 节点插入到容器
      hostInsert(newVNode.el, container, anchor)
    } else {
      // 否则则是更新
      // 节点对象传递给新的vnode
      const el = (newVNode.el = oldVNode.el!)
      // 比较下新旧节点得的文本是否一样
      if (newVNode.children !== oldVNode.children) {
        // 如果不一样则更新
        hostSetText(el, newVNode.children as string)
      }
    }
  }

  // 处理注释节点
  const processCommentNode = (oldVNode, newVNode, container, anchor) => {
    // 判断旧的节点是否存在
    if (oldVNode == null) {
      // 跟文本节点一样我们第一步需要生成注释节点
      newVNode.el = hostCreateComment(newVNode.children)
      // 节点插入到容器
      hostInsert(newVNode.el, container, anchor)
    } else {
      // 由于注释节点没有更新这种说法因此，只需要赋值一下注释节点给新的vnode就可以了
      newVNode.el = oldVNode.el
    }
  }

  // 处理片段
  const processFragment = (oldVNode, newVNode, container, anchor) => {
    // 判断旧的节点是否存在
    if (oldVNode == null) {
      // 不存在则挂载
      mountChildren(newVNode.children, container, anchor)
    } else {
      // 更新子节点
      patchChildren(oldVNode, newVNode, container, anchor)
    }
  }

  // 处理element
  const processElement = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 如果旧的值不存在则执行挂载
      mountElement(newVNode, container, anchor)
    } else {
      // 否则执行更新,TODO:更新操作
      patchElement(oldVNode, newVNode, anchor)
    }
  }

  // 处理组件
  const processComponent = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 如果旧的值不存在则执行挂载组件
      mountComponent(newVNode, container, anchor)
    } else {
      // 否则执行更新,TODO:更新操作
    }
  }

  // 挂载子节点
  const mountChildren = (children, container, anchor) => {
    // 如果children是一个字符串我们将字符串拆成数组
    if (isString(children)) {
      children = children.split('')
    }
    // 这个函数本质上就是对children的循环渲染
    for (let i = 0; i < children.length; i++) {
      // 循环拿到每一个子节点,child就是我们新的node
      // 通过normalizeVNode来渲染vnode
      const child = (children[i] = normalizeVNode(children[i]))
      // 然后我们拿到child的一个vnode,通过patch渲染
      patch(null, child, container, anchor)
    }
  }

  // 挂载element方法
  const mountElement = (vnode, container, anchor) => {
    // 先拿到vnode上面的信息
    const { type, props, shapeFlag } = vnode
    //1.创建element节点,在挂载的时候把当前的真实dom对象保存到vnode上面
    const el = (vnode.el = hostCreateElement(type))
    // 2.设置文本
    // 判断子节点是否是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 如果是的话设置文本
      hostSetElementText(el, vnode.children)
    } else {
      // 如果是数组则调用mountChildren传入当前创建的el节点作为容器循环挂载
      mountChildren(vnode.children, el, anchor)
    }
    // 3.设置props
    if (props) {
      // 如果当前的props存在
      for (const key in props) {
        // 因为是挂在所以第三个参数是旧值传null
        hostPatchProp(el, key, null, props[key])
      }
    }
    // 4.插入
    hostInsert(el, container, anchor)
  }

  // 更新element方法
  const patchElement = (oldVNode, newVNode, anchor) => {
    // 第一步我们要去绑定el,这三个都进行浅拷贝指向同一个内存空间
    const el = newVNode.el = oldVNode.el
    // 第二部我们要去获取新旧的props,为了后面去更新props的时候进行使用
    const oldProps = oldVNode.props || EMPTY_OBJ
    const newProps = newVNode.props || EMPTY_OBJ

    // 更新子节点
    patchChildren(oldVNode, newVNode, el, null)

    // 更新props
    patchProps(el, newVNode, oldProps, newProps)
  }

  // 挂载组件函数
  const mountComponent = (initialVNode, container, anchor) => {
    // 根据initialVNode也就是传入的vnode来生成组件的实例
    // 放到vnode里面的component下面
    initialVNode.component = createComponentInstance(initialVNode)
    // 定义一个变量保存component
    const instance = initialVNode.component

    // 在这个方法里面绑定render函数
    // 绑定了响应式的data返回值
    // 处理生命周期,完成生命周期的注册
    setupComponent(instance)
 
    // 真正渲染组件
    // 触发render函数,生成subTree挂载,指向data
    // 触发对应的生命周期
    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  const setupRenderEffect = (instance, initialVNode, container, anchor) => {
    // 在这里处理挂载操作
    const componentUpdateFn = () => {
      // 在这里挂载subTree
      // 判断是否挂载
      if (!instance.isMounted) {
        // 从实例里面取出注册好的回调函数
        const { bm, m } = instance

        if (bm) {
          // 这个是在组件渲染前触发的回调onBeforeMount
          bm()
        }

        // 没有的话需要挂载,renderComponentRoot可以简单的理解为执行render函数拿到render函数返回的vnode保存到subTree
        const subTree = instance.subTree = renderComponentRoot(instance)
        // 调用patch,将subTree挂载到容器上,挂载的过程中会执行其他的挂载那么subTree上就会有el
        patch(null, subTree, container, anchor)
        // 将el保存到组件层面上的vnode

        // 这里完成了patch挂载了,在这里触发挂载后的回调也就是onMounted
        if (m) {
          m()
        }

        initialVNode.el = subTree.el
        // 修改状态
        instance.isMounted = true
      } else {
        let { next, vnode } = instance
        if (!next) {
          next = vnode
        }

        // 调用renderComponentRoot，因为data数据改变了内部会从新调用render返回最新的vnode
        const nextTree = renderComponentRoot(instance)
        // 拿到上一次的subTree
        const prevTree = instance.subTree
        // 赋值最新的subTree
        instance.subTree = nextTree
        // 更新挂载patch
        patch(prevTree, nextTree, container, anchor)
      }
    }

    // 因为在setupComponent里面我们把data通过reactive转为了响应式数据,所以在这里new ReactiveEffect的时候
    // 我们会执行到componentUpdateFn里面的renderComponentRoot 最终会执行render并将this指向响应式得的ata
    // 当data里面的数据在render里面被访问到的时候会触发reactive里面的track收集ReactiveEffect
    // 那么当data数据改变的时候就会调用ReactiveEffect的调度器queuePreFlushCb(update)最终会从新执行componentUpdateFn
    // 整体来说这个就是让render函数里面使用的响应式数据在被修改的时候会被从新触发的东西
    const effect = (instance.effect = new ReactiveEffect(componentUpdateFn, () => queuePreFlushCb(update)))

    const update = (instance.update = () => effect.run())

    // 调用update会触发effect.run接着会触发componentUpdateFn
    update()
  }

  /**
   * 更新子节点方法
   * @param oldVNode 旧的vnode
   * @param newVNode 新的vnode
   * @param container 容器
   * @param anchor 锚点
   */
  const patchChildren = (oldVNode, newVNode, container, anchor) => {
    // 拿到旧节点的children
    const oldChildren = oldVNode && oldVNode.children
    // 旧的flag
    const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0
    // 新的节点的children
    const newChildren = newVNode && newVNode.children
    // 新的flag,新节点必定存在所以不用三院表达式
    const { shapeFlag } = newVNode

    // 接下来根据新旧节点类型不同来做不同的操作
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 如果新节点是TEXT_CHILDREN也就是文本子节点的时候
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 旧的节点是一个数组，那么卸载旧的子节点
      }
      // 如果旧节点不是ARRAY_CHILDREN，那么就都是文本子节点，判断子节点是否相等
      if (newChildren !== oldChildren) {
        // 如果不相等直接执行设置文本的操作
        hostSetElementText(container, newChildren)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // diff
          patchKeyedChildren(oldChildren, newChildren, container, anchor)
        } else {
          // TODO：卸载
        }
      } else {
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          // 删除旧节点的 text
          hostSetElementText(container, '')
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 单独子节点的挂载
        }
      }
    }
  }

  /**
   * diff算法处理子节点
   * @param oldChildren 旧的子节点
   * @param newChildren 新的子节点
   * @param container 容器
   * @param parentAnchor 锚点
   */
  const patchKeyedChildren = (
    oldChildren,
    newChildren,
    container,
    parentAnchor
  ) => {
    let i = 0
    // 获取新节点的长度
    const newChildrenLength = newChildren.length
    // 旧节点的最后一个节点
    let oldChildrenEnd = oldChildren.length - 1
    // 新节点的最后一个节点
    let newChildrenEnd = newChildrenLength - 1

    // 自前向后
    // 循环判断当前的节点是否是新节点或旧节点中的最后一个,是则跳出循环
    // (a b) c
    // (a b) d e
    while (i <= oldChildrenEnd && i <= newChildrenEnd) {
      // 拿到当前的新旧节点的vnode
      const oldVNode = oldChildren[i]
      // 在挂载子节点为数组的时候也是调用了normalizeVNode这个会将字符串直接转为标准化的vnode
      // 所以oldChildren不需要再调用normalizeVNode
      const newVNode = normalizeVNode(newChildren[i])
      // 判断新旧节点的类型是否一致
      if (isSameVNodeType(oldVNode, newVNode)) {
        patch(oldVNode, newVNode, container, null)
      } else {
        // 如果匹配不上的后跳出while
        break
      }
      i++
    }

    // 自后向前匹配
    // 在前面自前向后中假如有一个key或者类型匹配不上的话会中断这时候i还没到最后我们可以从最后一个节点出发
    // a (b c)
    // d e (b c)
    while (i <= oldChildrenEnd && i <= newChildrenEnd) {
      // 从最后一个节点获取新旧节点的vnode
      const oldVNode = oldChildren[oldChildrenEnd]
      const newVNode = newChildren[newChildrenEnd]
      // 判断是否匹配
      if (isSameVNodeType(oldVNode, newVNode)) {
        // 如果匹配则更新
        patch(oldVNode, newVNode, container, null)
      } else {
        // 否者跳出
        break
      }
      // 将新旧节点的下标往前移动
      oldChildrenEnd--
      newChildrenEnd--
    }

    // 新节点多于旧节点
    // 3. common sequence + mount
    // (a b)
    // (a b) c
    // i = 2, oldChildrenEnd = 1, newChildrenEnd = 2
    // (a b)
    // c (a b)
    // i = 0, oldChildrenEnd = -1, newChildrenEnd = 0
    if (i > oldChildrenEnd) {
      if (i <= newChildrenEnd) {
        // 在上面自前向后跟自后向前之后如果循环到这里，那表示新节点多于旧节点
        // 我们需要找到多出来的节点el在children的位置
        // 首先找到新节点最后一个位置的下一个el，我们要在这个el之前添加
        const nextPos = newChildrenEnd + 1
        // 但是节点有可能是在最后才添加的这样nextPos会超出新节点的长度
        // 我们需要根据这个来确定锚点parentAnchor=null，所以也会直接往后面添加
        const anchor = nextPos < newChildrenLength ? newChildren[nextPos].el : parentAnchor
        // i~newChildrenEnd既是新增的长度我们做个循环添加一下
        while(i <= newChildrenEnd) {
          patch(null, normalizeVNode(newChildren[i]), container, anchor)
          i++
        }
      }
    }
    // 4. common sequence + unmount
    // 旧节点多于新节点
    // (a b) c
    // (a b)
    // i = 2, oldChildrenEnd = 2, newChildrenEnd = 1
    // a (b c)
    // (b c)
    // i = 0, oldChildrenEnd = 0, newChildrenEnd = -1
    else if (i > newChildrenEnd) {
      while (i <= oldChildrenEnd) {
        unmount(oldChildren[i])
        i++
      }
    }
    // 5. unknown sequence
    // [i ... oldChildrenEnd + 1]: a b [c d e] f g
    // [i ... newChildrenEnd + 1]: a b [e d c h] f g
    // i = 2, oldChildrenEnd = 4, newChildrenEnd = 5
    else {
      // 场景五
      const s1 = i // prev starting index 旧节点开始的索引 oldChildrenStart
      const s2 = i // next starting index 新节点开始的索引 newChildrenStart

      // 5.1 build key:index map for newChildren
      // 5.1整个目的就是为了构建keyToNewIndexMap
      // 创建一个 <key (新节点的key) : index(新节点的位置)> 的Map对象
      // keyToNewIndexMap.通过该对象可知：新的child（根据key判断指定child）更新后的位置（根据对应的index判断）在哪里
      const keyToNewIndexMap: Map<string | number | symbol, number> = new Map()
      // 通过循环为keyToNewIndexMap 填充值（s2 = newChildrenStart; el = newChildrenEnd）
      // 这个可以看成是对新节点的循环
      for (i = s2; i <= newChildrenEnd; i++) {
        // 从 newChildren 中根据开始索引获取每一个 child (newChildren = newChildren)
        const nextChild = normalizeVNode(newChildren[i])
        if (nextChild.key != null) {
          // 这里意味着keu必须要有也必须是唯一的，否则就会报错，如果一切正常，那么keyToNewIndexMap就会保存<key: index>
          keyToNewIndexMap.set(nextChild.key, i)
        }
      }

      // 5.2 loop through old children left to be patched and try to patch
      // matching nodes & remove nodes that are no longer present
      // 场景2
      let j
      // 记录已经修复的新节点的数量
      let patched = 0
      // 新节点还有几个需要修复
      const toBePatched = newChildrenEnd - s2 + 1
      // 当前节点是否需要进行移动
      let moved = false
      // used to track whether any node has moved
      // 当前变量会始终保存最大的index的值
      let maxNewIndexSoFar = 0
      // works as Map<newIndex, oldIndex>
      // Note that oldIndex is offset by +1
      // and oldIndex = 0 is a special value indicating the new node has
      // no corresponding old node.
      // used for determining longest stable subsequence
      // 这个是一个数组，数组的下标表示的是新节点的下标，他的元素表示的是旧节点的下标
      const newIndexToOldIndexMap = new Array(toBePatched)
      // 循环给数组初始化一个0
      for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

      // 循环旧节点
      for (i = s1; i <= oldChildrenEnd; i++) {
        // oldChildren是节点的数组,prevChild是被遍历出来的节点
        const prevChild = oldChildren[i]
        // 如果修复已经修复的数量大于需要修复的数量这直接取消挂载
        if (patched >= toBePatched) {
          // all new children have been patched so this can only be a removal
          unmount(prevChild)
          continue
        }
        // 新节点存放的位置
        let newIndex
        // 如果存在key
        if (prevChild.key != null) {
          // keyToNewIndexMap的key存放的是新节点的key,拿旧节点的key如果存在这会返回新节点的下标，不存在这是undefined
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // key-less node, try to locate a key-less node of the same type
          // 如果不存在key遍历所有新节点，找到没有找到旧节点的新节点
          for (j = s2; j <= newChildrenEnd; j++) {
            if (
              // [j - s2]的意思是因为newIndexToOldIndexMap本质上是一个数组,而循环的开始s2不一定在起始点，为了位置跟数组对应
              newIndexToOldIndexMap[j - s2] === 0 &&
              isSameVNodeType(prevChild, newChildren[j])
            ) {
              newIndex = j
              break
            }
          }
        }
        // 判断是否newIndex不存在
        if (newIndex === undefined) {
          // 不存在则表示在新节点中不存在该旧节点,应该删除
          unmount(prevChild)
        } else {
          // 到这里这标识新节点在旧节点中存在，只是发生了位移
          // [newIndex - s2]是新节点的下标
          // (i + 1)是旧节点的下标,因为newIndexToOldIndexMap默认等于0代表着不存在，所以下标必须先+1来标识后面会通过i--来还原
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          // maxNewIndexSoFar会存储当前最大的newIndex
          if (newIndex >= maxNewIndexSoFar) {
            // newIndex如果大于maxNewIndexSoFar，证明newIndex是递增的那么更新一下最大值
            maxNewIndexSoFar = newIndex
          } else {
            // newIndex如果小于的话，则证明不是递增的，那么这个节点需要移动
            moved = true
          }
          // 到这里是证明新旧节点同时都存在,发生移位的操作在5.3这里我们先要将新旧节点的元素进行更新
          // prevChild为纠结点newChildren[newIndex]为新节点
          patch(
            prevChild,
            newChildren[newIndex],
            container,
            null
          )
          // patched是记录已被修复的新节点初始化是0
          patched++
        }
      }

      // 5.3 move and mount
      // generate longest stable subsequence only when nodes have moved
      // 如果moved=true，那么increasingNewIndexSequence=旧节点的下标的最长递增子序列的下标
      // 注意getSequence这个方法是求最长递增子序列下标，但是0会忽略掉不进行计算
      // newIndexToOldIndexMap为旧未处理的下标0代表不存在
      // 如果newIndexToOldIndexMap=[2, 1, 0],那么increasingNewIndexSequence=[1(这个1代表的是下标)]
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []
      // j的初始值=最长递增子序列最后的下标
      j = increasingNewIndexSequence.length - 1
      // looping backwards so that we can use last patched node as anchor
      // 倒叙循环待处理的节点
      for (i = toBePatched - 1; i >= 0; i--) {
        // s2表示新节点的起点，s2+i表示需要更新的新节点的下标从后向前倒叙
        const nextIndex = s2 + i
        // 拿到节点对象
        const nextChild = newChildren[nextIndex]
        // l2表示新节点的长度，nextIndex表示新节点的下标
        // nextIndex + 1 < l2标识锚点是否超过了最长的长度false为超出true为不超出
        // 如果超出则直接锚点为父级没超出则取出新节点下面的el作为锚点
        const anchor =
          nextIndex + 1 < newChildrenLength ? (newChildren[nextIndex + 1]).el : parentAnchor
        if (newIndexToOldIndexMap[i] === 0) {
          // 如果newIndexToOldIndexMap[i] === 0意味着新节点存在但是旧节点不存在，应该挂载上去
          // 这样一来新增的节点就会挂载上去对应的锚点
          // mount new
          patch(
            null,
            nextChild,
            container,
            anchor
          )
        } else if (moved) {
          // 如果存在并且moved=true则需要移动
          // move if:
          // There is no stable subsequence (e.g. a reverse)
          // OR current node is not among the stable sequence
          // j < 0表示不存在最长递增子序列,如果存在这判断后面的i !== increasingNewIndexSequence[j]
          // i 是当前待处理的下标 increasingNewIndexSequence[j]是最长递增子序列最后一个的下标
          // i !== increasingNewIndexSequence[j]表示当前节点不在最后位置
          // 这里的目的是为了做最小的移动次数，所以需要知道做场递增子序列，j的值初始化是递增子序列的左后一个下标
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            // 否则调用move移动节点
            move(nextChild, container, anchor)
          } else {
            // 在当前的循环中如果i === increasingNewIndexSequence[j] 并且递增子序列还存在的话，意味着真实的节点处理以及跟当前递增序列重合，那么需要将下标往前移动
            j--
          }
        }
      }
    }
  }

  // 移动方法
  const move = (vnode, container, anchor) => {
    const { el } = vnode
    hostInsert(el!, container, anchor)
  }

  /**
   * 获取最长递增子序列下标
   * 维基百科: https://en.wikipedia.org/wiki/Longest_increasing_subsequence
   * 百度百科:
   * https://baike.baidu.com/item/%E6%9C%80%E9%95%BF%E9%80%92%E5%A2%9E%E5%AD%90%E5%BA%8F%E5%88%97/22828111
   */
  const getSequence = (arr: number[]): number[] => {
    // 获取一个数组浅拷贝。注意 p 的元素改变并不会影响 arr
    // p 是一个最终的回溯数组，它会在最终的 result 回溯中被使用
    // 它会在每次 result 发生变化时，记录 result 更新前最后一个索引的值
    const p = arr.slice()
    // 定义返回值 (最长递增子序列下标)，因为下标从 0 开始，所以它的初始值为 0
    const result = [0]
    let i, j, u, v, c
    // 当前数组的长度
    const len = arr.length
    // 对数组中所有的元素进行 for 循环处理，i = 下标
    for (i = 0; i < len; i++) {
      // 根据下标获取当前对应的元素
      const arrI = arr[i]
      if (arrI !== 0) {
        // 获取 result 中的最后一个元素，既：当前 result 中保存的最大值的下标
        j = result[result.length - 1]
        // arr[j] = 当前 result 中所保存的最大值
        // arrI = 当前值
        // 如果 arr[j] < arrI，那么就证明，当前存在更大的序列，那么该下标就需要陪放入到 result 的最后位置
        if (arr[j] < arrI) {
          // 记录result更新前最后一个索引的值是多少
          p[i] = j
          // 把当前的下标i 放入到 result的最后位置
          result.push(i)
          continue
        }
        // 初始下标
        u = 0
        // 最终下标
        v = result.length - 1
        // 二分查找,这里会以uv作为开始跟结束c时中间值然后不断分割
        // 到最后uv重合的时候u就是离数字最近的那个下标
        while (u < v) {
          // 这里执行的是按位操作符，表示c=值被平分并且向下取整
          c = (u + v) >> 1
          if (arr[result[c]] < arrI) {
            // 取后半部分
            u = c + 1
          } else {
            // 取前半部分
            v = c
          }
        }
        // 判断result中最近的该值是否大于当前值
        if (arrI < arr[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1]
          }
          // 如果大于则替换
          result[u] = i
        }
      }
    }
    u = result.length
    v = result[u - 1]
    while (u-- > 0) {
      result[u] = v
      v = p[v]
    }
    return result
  }

  /**
   * 更新props方法
   * @param el 
   * @param vnode 
   * @param oldProps 
   * @param newProps 
   */
  const patchProps = (el: Element, vnode, oldProps, newProps) => {
    // 当新旧的props不一样的时候
    if (oldProps !== newProps) {
      // 遍历新的props
      for (const key in newProps) {
        // 拿到当前的props值
        const next = newProps[key]
        // 拿到旧的props的值
        const prev = oldProps[key]
        if (next !== prev) {
          // 更新prop的值,这个是界面实际的更新
          hostPatchProp(el, key, prev, next)
        }
      }
    }
    // 如果prop存在于旧的vnode但不存在于新的prop的话，那么需要删除
    if (oldProps !== EMPTY_OBJ) {
      // 遍历旧的props
      for (const key in oldProps) {
        if (!(key in newProps)) {
          // 如果不存在于新的props，则需要删除
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }
  }

  {
    children: [

    ]
  }

  {
    key: ''
    return parent
    child: children
    sibing: next
  }

  /**
   * 打补丁函数
   * @param oldVNode 旧的vnode  
   * @param newVNode 新的vnode
   * @param container 容器
   * @param anchor 锚点默认为null
   */
  const patch = (oldVNode, newVNode, container, anchor = null) => {
    if (oldVNode === newVNode) {
      // 如果新旧节点一样则不进行任何操作
      return
    }

    // 在进行下面的switch之前，先判断下新旧节点的类型是否一致
    // 如果是其他类型的话type跟key在从新render的时候不会改变，但是如果组件一旦从新render的时候传入了新的对象就会进入此判断，因此会调用卸载
    if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
      // 如果不一致，则卸载旧的节点
      unmount(oldVNode)
      // 将oldVNode置空，这样就会从新执行挂载，而不会执行更新
      oldVNode = null
    }

    // 如果不一样，则获取vnode的类型然后根据不同类型分别做各自的操作
    const { type, shapeFlag } = newVNode
    switch (type) {
      case Text:
        // 如果是文本
        processText(oldVNode, newVNode, container, anchor)
        break
      case Comment:
        // 注释节点
        processCommentNode(oldVNode, newVNode, container, anchor)
        break
      case Fragment:
        // 片段
        processFragment(oldVNode, newVNode, container, anchor)
        break
      default:
        // 以上则不是则分成两种场景，要么是Element要么是组件
        // 执行按位与操作
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 当前类型是element
          processElement(oldVNode, newVNode, container, anchor)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 当前是组件类型
          processComponent(oldVNode, newVNode, container, anchor)
        }
    }
  }

  /**
   * 卸载节点
   * @param vnode 
   */
  const unmount = (vnode) => {
    hostRemove(vnode.el)
  }

  /**
   * 创建render函数
   * @param vnode 
   * @param container 容器
   */
  const render = (vnode, container) => {
    // 如果vnode传null
    if (vnode === null) {
      // TODO: 卸载
      // 判断旧节点是否存在,不存在执行卸载操作
      if (container._vnode) {
        unmount(container._vnode)
      }
    } else {
      // 执行打补丁操作
      // container._vnode是旧节点,没有的话是null
      patch(container._vnode || null, vnode, container)
    }
    // 最后将当前的vnode保存成旧节点
    container._vnode = vnode
  }

  // 返回一个对象
  return {
    render
  }
}