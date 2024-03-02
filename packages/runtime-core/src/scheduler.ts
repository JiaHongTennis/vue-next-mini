let isFlushPending = false
const pendingPreFlushCbs: Function[] = []
// 构建出异步任务
const resolvedPromise = Promise.resolve() as Promise<any>

let currentFlushPromise: Promise<void> | null = null

// 主函数
export function queuePreFlushCb(cb: Function) {
  // 本质上执行的是queueCb
  queueCb(cb, pendingPreFlushCbs)
}
/**
 * 
 * @param cb 回调函数
 * @param pendingQueue 队列Function数组
 */
function queueCb (cb: Function, pendingQueue: Function[]) {
  // 将任务放到队列里面
  pendingQueue.push(cb)
  // 依次执行队列中的执行函数
  queueFlush()
}

function queueFlush () {
  // 同步任务中只会进去一次
  if (!isFlushPending) {
    isFlushPending = true
    // 微任务队列
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}


// 处理队列
function flushJobs () {
  isFlushPending = false
  flushPreFlushCbs()
}

export function flushPreFlushCbs () {
  if (pendingPreFlushCbs.length) {
    // 去重
    let activePreFlushCbs = [...new Set(pendingPreFlushCbs)]
    pendingPreFlushCbs.length = 0

    for (let i = 0; i < activePreFlushCbs.length; i++) {
      activePreFlushCbs[i]()
    }
  }
}