/**
 * 更新事件
 * @param el 
 * @param rawName 
 * @param prevValue 旧函数
 * @param nextValue 新函数
 */
export function patchEvent(
  el: Element & { _vei?: Object },
  rawName: string,
  prevValue,
  nextValue
) {
  // 第一步拿到invokers缓存没有则新增一个空的
  const invokers = el._vei || (el._vei = {})
  // 通过事件名称检测是否有缓存行为，来判断是否要更新
  const existingInvoker = invokers[rawName]
  if (nextValue && existingInvoker) {
    // 如果新的值存在，并且有缓存则是更新行为,直接改变value
    existingInvoker.value = nextValue
  } else {
    // 如果不是更新则有两种行为
    // 先将驼峰事件名转成小写
    const name = parseName(rawName)
    if (nextValue) {
      // 如果新的值存在则创建事件函数
      const invoker = (invokers[rawName] = createInvoker(nextValue))
      // 添加事件
      el.addEventListener(name, invoker)
    } else if (existingInvoker) {
      // 如果不存在并且旧的缓存存在则是删除
      el.removeEventListener(name, existingInvoker)
      // 删除缓存
      invokers[rawName] = undefined
    }
  }
}

// 创建事件函数，接收新的函数，将真正执行的事件放到value中
function createInvoker (initialValue) {
  const invoker = (e: Event) => {
    invoker.value && invoker.value()
  }

  invoker.value = initialValue
  return invoker
}

function parseName(name: string) {
  // 去掉前两个并全部转成小写
  return name.slice(2).toLowerCase()
}