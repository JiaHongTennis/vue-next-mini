var Vue = (function (exports) {
    'use strict';

    var isArray = Array.isArray;
    var isObject = function (val) {
        return (val !== null && typeof val === 'object');
    };
    // 判断值是否发生改变
    var hasChanged = function (value, oldValue) {
        return !Object.is(value, oldValue);
    };
    // 判断是否是函数类型
    var isFunction = function (val) {
        return typeof val === 'function';
    };
    // 合并方法
    var extend = Object.assign;
    // 空对象常量
    var EMPTY_OBJ = {};
    // 判断是否是reactive
    function isReactive(value) {
        return !!(value && value["__v_isReactive" /* ReactiveFlage.IS_REACTIVE */]);
    }
    // 判断是否是字符串
    var isString = function (val) { return typeof val === 'string'; };
    // 是否以on开头
    var onRE = /^on[^a-z]/;
    var isOn = function (key) { return onRE.test(key); };

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol */


    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    // 生成Dep的方法
    var createDep = function (effects) {
        var dep = new Set(effects);
        return dep;
    };

    // 表示当前被激活的ReactiveEffect
    var activeEffect;
    var ReactiveEffect = /** @class */ (function () {
        function ReactiveEffect(fn, scheduler) {
            if (scheduler === void 0) { scheduler = null; }
            this.fn = fn;
            this.scheduler = scheduler;
        }
        ReactiveEffect.prototype.run = function () {
            // 记录当前的ReactiveEffect
            activeEffect = this;
            // 执行传进来的回调函数
            return this.fn();
        };
        ReactiveEffect.prototype.stop = function () {
        };
        return ReactiveEffect;
    }());
    /**
     * 收集所哟依赖的WeakMap 实例:
     * 1.`key`: 响应性对象
     * 2.`value0`: `Map`对象
     *  1.`key`: 响应性对象的指定属性
     *  2.`value`: 指定对象的指定属性的 执行函数
     */
    var targetMap = new WeakMap();
    function effect(fn, options) {
        // 创建ReactiveEffect传入回调函数
        var _effect = new ReactiveEffect(fn);
        // 如果有传入options，则合并
        // 因为在ReactiveEffect的实例中如果存在scheduler则会调用scheduler调度器方法
        if (options) {
            extend(_effect, options);
        }
        if (!options || !options.lazy) {
            _effect.run();
        }
    }
    /**
     * 用于收集依赖的方法
     * @param target
     * @param key
     */
    function track(target, key) {
        // activeEffect是再effect的回调函数即将执行前的时候才会赋值的对象，因为该effect使用了这个属性所以要收集依赖
        if (!activeEffect)
            return;
        // 尝试从targetMap中根据target获取map
        var depsMap = targetMap.get(target);
        // 如果获取到的 map 不存在，则生成新的 map 对象，并把该对象赋值给对应的 `value`
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        // 为指定map，指定key 设置回调函数
        // depsMap.set(key, activeEffect)
        var dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, (dep = createDep()));
        }
        // 放到将activeEffect放到Set中
        tarckEffects(dep);
    }
    /**
     * 利用 dep 依次跟踪指定 key 的所有 effect
     * set函数式一个不重复的数组，所以即便调用多次里面的ReactiveEffect因为地址值一样所以也不会重复
     * @param dep
     */
    function tarckEffects(dep) {
        dep.add(activeEffect);
    }
    /**
     * 触发依赖的方法
     * @param target
     * @param key
     * @param newValue
     */
    function trigger(target, key, newValue) {
        // 根据 target 获取存储的 map 实例
        var depsMap = targetMap.get(target);
        // 如果depsMap 不存在，则直接 return
        if (!depsMap) {
            return;
        }
        // 依据 key，从depsMap 中取出 value，该 value 是一个dep 类型的数据
        // dep是一个set类型的ReactiveEffect数组
        var dep = depsMap.get(key);
        if (!dep) {
            return;
        }
        // 如果存在则调用triggerEffects触发里面的函数
        triggerEffects(dep);
    }
    /**
     * 依次触发 dep 中保存的依赖
     * @param dep
     */
    function triggerEffects(dep) {
        var e_1, _a, e_2, _b;
        // 是不是数组,Set并不是一个数组，但是Set类型可以使用三点结构来变成数组
        var effects = isArray(dep) ? dep : __spreadArray([], __read(dep), false);
        try {
            // 触发依赖
            // of与forEach的区别在于可以使用break这些
            for (var effects_1 = __values(effects), effects_1_1 = effects_1.next(); !effects_1_1.done; effects_1_1 = effects_1.next()) {
                var effect_1 = effects_1_1.value;
                // 为了解决死循环问题，需要先执行计算属性的依赖，然后再执行普通effect的依赖
                // 判断是否是计算属性的依赖
                if (effect_1.computed) {
                    triggerEffect(effect_1);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (effects_1_1 && !effects_1_1.done && (_a = effects_1.return)) _a.call(effects_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            for (var effects_2 = __values(effects), effects_2_1 = effects_2.next(); !effects_2_1.done; effects_2_1 = effects_2.next()) {
                var effect_2 = effects_2_1.value;
                // 为了解决死循环问题，需要先执行计算属性的依赖，然后再执行普通effect的依赖
                // 判断是否是计算属性的依赖
                if (!effect_2.computed) {
                    triggerEffect(effect_2);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (effects_2_1 && !effects_2_1.done && (_b = effects_2.return)) _b.call(effects_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    /**
     * 触发指定依赖
     * @param effect
     */
    function triggerEffect(effect) {
        // 如果有传入调度器的时候则调用调度器，否则调用run
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }

    var get = createGetter();
    var set = createSetter();
    function createGetter() {
        return function get(target, key, receiver) {
            /**
             * Reflect.get = target.key 第三个参数是指定this为receiver
             * Reflect一般是跟Proxy结合的，receiver是Proxy返回的代理对象本身,主要处理的是代理对象中对象内部方法依旧以来代理对象的属性的时候
             * 那么当前的get方法需要调用多次,例如下面当访问对象中的joinName的时候当前方法应该被调用3次
             * {
             *  name1: '鸡',
             *  name2: '篮球',
             *  get joinName () {
             *    return this.name1 + this.name2
             *  }}
             */
            var res = Reflect.get(target, key, receiver);
            // 收集依赖的方法
            track(target, key);
            return res;
        };
    }
    function createSetter() {
        return function set(target, key, value, receiver) {
            var result = Reflect.set(target, key, value, receiver);
            trigger(target, key);
            return result;
        };
    }
    /**
     * 响应性的 handler
     */
    var mutableHandlers = {
        get: get,
        set: set
    };

    /**
     * 响应性 Map 缓存对象
     * key: target
     * val: proxy
     */
    var reactiveMap = new WeakMap();
    /**
     * 为复杂数据类型，创建响应性对象
     * @param target 被代理对象
     * @returns 代理对象
     */
    function reactive(target) {
        // 返回一个创建reactive对象的方法
        return createReactiveObject(target, mutableHandlers, reactiveMap);
    }
    /**
     * 创建响应性对象
     * @param target 被代理对象
     * @param baseHandlers
     * @param proxyMap
     * @returns
     */
    function createReactiveObject(target, baseHandlers, proxyMap) {
        // 如果该实例已经被代理，则直接读取即可
        var existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        // 未被代理则生成proxy 实例
        var proxy = new Proxy(target, baseHandlers);
        // 标记类型是reactive
        proxy["__v_isReactive" /* ReactiveFlage.IS_REACTIVE */] = true;
        // 缓存代理对象
        proxyMap.set(target, proxy);
        return proxy;
    }
    // 判断是否是对象，如果是的话转化为
    var toReactive = function (value) {
        // 如果是对象的话就调用reactive转化
        return isObject(value) ? reactive(value) : value;
    };

    // ref主函数
    function ref(value) {
        // 调用创建Ref方法，浅层复制暂时先死
        return createRef(value, false);
    }
    function createRef(rawValue, shallow) {
        // 判断是否是ref对象
        if (isRef(rawValue)) {
            // 如果是Ref的话则直接返回
            return rawValue;
        }
        // 否则的话生成一个RefImpl类型对象
        return new RefImpl(rawValue, shallow);
    }
    // RefImpl类
    var RefImpl = /** @class */ (function () {
        // readonly为只读属性
        function RefImpl(value, __v_isShallow) {
            this.__v_isShallow = __v_isShallow;
            // Dep
            this.dep = undefined;
            // 保存原始数据
            this._rawValue = value;
            // 如果所ref所传的值是对象，那么本质上ref的响应性是reactive完成的
            this._value = __v_isShallow ? value : toReactive(value);
        }
        Object.defineProperty(RefImpl.prototype, "value", {
            get: function () {
                // 创建ref.dep并关联effect
                /**
                 * 因为ref有可能是一个非引用类型的值，这个时候无法使用Proxy来代理,所以ref返回的属性需要给回一个value的方法来
                 * 通过trackRefValue来主动收集依赖，并将依赖保存到当前的实例化对象中
                 */
                trackRefValue(this);
                return this._value;
            },
            set: function (newVal) {
                if (hasChanged(newVal, this._rawValue)) {
                    // 发生改变赋值新值
                    this._rawValue = newVal;
                    this._value = toReactive(newVal);
                    // 触发ref依赖
                    triggerRefValue(this);
                }
            },
            enumerable: false,
            configurable: true
        });
        return RefImpl;
    }());
    /**
     * 创建ref.dep对象关联effect
     * @param ref
     */
    function trackRefValue(ref) {
        console.log('收集了trackRefValue');
        debugger;
        // 如果不是在effect中触发的话,那么activeEffect=false不会经过这个判断进入后面的effect收集
        if (activeEffect) {
            tarckEffects(ref.dep || (ref.dep = createDep()));
        }
    }
    /**
     * 触发依赖
     */
    function triggerRefValue(ref) {
        console.log('触发了triggerRefValue');
        if (ref.dep) {
            triggerEffects(ref.dep);
        }
    }
    // 判断是否是ref对象方法,is 是ts的类型守卫
    function isRef(r) {
        return !!(r && r.__v_isRef === true);
    }

    // 计算属性
    function computed(getterOrOptions) {
        var getter;
        // 判断第一个参数是否是函数类型
        var onlyGetter = isFunction(getterOrOptions);
        if (onlyGetter) {
            getter = getterOrOptions;
        }
        // 创建一个ComputedRefImpl
        var cRef = new ComputedRefImpl(getter);
        // 返回实例化对象
        return cRef;
    }
    // 计算属性实例化类
    var ComputedRefImpl = /** @class */ (function () {
        function ComputedRefImpl(getter) {
            var _this = this;
            // 这里是计算属性被使用的时候收集的依赖于计算属性的effect
            this.dep = undefined;
            // 是否死ref值设置为true
            this.__v_isRef = true;
            //定义一个脏变量
            this._dirty = true;
            // new ReactiveEffect的时候当getter里面所有的变量如果存在reactive或者是ref的时候则会被收集到数据中，那么当数据改变的时候就会触发调度器函数
            this.effect = new ReactiveEffect(getter, function () {
                // 2.这里是一个调度器函数,当触发依赖的时候会执行这边的方法
                if (!_this._dirty) {
                    // 标注下数据已经脏了
                    _this._dirty = true;
                    // 3.调用这个方法会触发依赖函数，那么所有引用到计算属性变量的effect都会执行
                    // 4.当effect再次执行的时候，那么会再次执行get value方法，此时我们的脏变量以及改成了true
                    triggerRefValue(_this);
                }
            });
            this.effect.computed = this;
        }
        Object.defineProperty(ComputedRefImpl.prototype, "value", {
            get: function () {
                // 收集计算实行依赖
                // 在effect里面使用ComputedRefImpl那里么ComputedRefImpl里面会有有个dpe保存的是所有依赖的effect
                // 1.当计算属性里面所依赖的值发生改变的时候会触发调度器函数
                // 注意：这里有个很问题，那就是一个effect里面有可能同时需要访问到多次计算属性变量,那么get value有可调用多次
                // 这会导致一个问题是第一次进入到该方法的时候trackRefValue(this)收集的回调时effect的回调但是当this._dirty = true从而调用this.effect.run()的时候
                // activeEffect就会指向this.effect,会导致ref.dep内部有两个不同的回调，所以数据改变的时候，计算属性初始化的调度方法会执行两次
                // 但是当第一个get value执行完毕后，因为访问了计算属性问题activeEffect会变成计算属性，导致会将计算属性的ReactiveEffect关联进来
                // 处理办法: 在triggerRefValue后面执行调度器的时候优先先执行调度器的内容，这会导致_dirty一直都是true而跳过triggerRefValue导致死循环
                trackRefValue(this);
                // 运行计算属性回调函数拿到结果
                // _dirty会做一个缓存的操作
                // 5.再一次执行这里的时候就会发现是false,会再次调用run函数
                if (this._dirty) {
                    this._dirty = false;
                    // 这里执行run方法的时候会执行 activeEffect = this
                    // 这样当effect内部使用到计算属性的时候收集的依赖函数实际上就是计算属性初始化的具有调度方法的effect
                    // 当数据第一次访问计算属性的时候，就会重新调用属性的方法，那么计算属性内部的响应式数据reactive就会调用track收集this.effect
                    this._value = this.effect.run();
                }
                // 返回结果
                return this._value;
            },
            enumerable: false,
            configurable: true
        });
        return ComputedRefImpl;
    }());

    var isFlushPending = false;
    var pendingPreFlushCbs = [];
    // 构建出异步任务
    var resolvedPromise = Promise.resolve();
    // 主函数
    function queuePreFlushCb(cb) {
        // 本质上执行的是queueCb
        queueCb(cb, pendingPreFlushCbs);
    }
    /**
     *
     * @param cb 回调函数
     * @param pendingQueue 队列Function数组
     */
    function queueCb(cb, pendingQueue) {
        // 将任务放到队列里面
        pendingQueue.push(cb);
        // 依次执行队列中的执行函数
        queueFlush();
    }
    function queueFlush() {
        // 同步任务中只会进去一次
        if (!isFlushPending) {
            isFlushPending = true;
            // 微任务队列
            resolvedPromise.then(flushJobs);
        }
    }
    // 处理队列
    function flushJobs() {
        isFlushPending = false;
        flushPreFlushCbs();
    }
    function flushPreFlushCbs() {
        if (pendingPreFlushCbs.length) {
            // 去重
            var activePreFlushCbs = __spreadArray([], __read(new Set(pendingPreFlushCbs)), false);
            pendingPreFlushCbs.length = 0;
            for (var i = 0; i < activePreFlushCbs.length; i++) {
                activePreFlushCbs[i]();
            }
        }
    }

    /**
     * watch主入口
     * @param source 监听的对象
     * @param cb 回调函数
     * @param options 配置对象
     */
    function watch(source, cb, options) {
        return doWatch(source, cb, options);
    }
    /**
     * watch执行的入口
     */
    function doWatch(source, cb, 
    // 结构赋值， 默认是空对象
    _a) {
        var 
        // 结构赋值， 默认是空对象
        _b = _a === void 0 ? EMPTY_OBJ : _a, immediate = _b.immediate, deep = _b.deep;
        // 声明一个getter
        var getter;
        // 如果是reactive
        if (isReactive(source)) {
            // getter是一个返回source的类型
            getter = function () { return source; };
            deep = true;
        }
        else {
            // 否则getter是一个返回空对象的函数
            getter = function () { };
        }
        if (cb && deep) {
            // 这个操作两个地址值会互换
            var baseGetter_1 = getter;
            // traverse的作用是访问每个变量以达到数据收集的效果
            getter = function () { return traverse(baseGetter_1()); };
        }
        // 定义旧的值
        var oldValue = {};
        /**
         * watch关键函数
         * 函数整体逻辑是调用run函数拿到最新的值，然后再再调用回调函数将新旧值返回出去
         * 再将新值赋值给旧值
         */
        var job = function () {
            if (cb) {
                var newValue = effect.run();
                if (deep || hasChanged(newValue, oldValue)) {
                    // 如果一开始就调用那么oldValue会是空对象
                    cb(newValue, oldValue);
                    // 新的值赋值给旧的
                    // 如果监听的是reactive的时候那么oldValue也会也会改变成新值的样子
                    oldValue = newValue;
                }
            }
        };
        /**
         * 定义调度器
         * queuePreFlushCb是一个异步微任务的回调方法
         * 当同时执行多个数据改变的时候会等待同步代码执行完
         * job已经用hasChanged(newValue, oldValue)判断留新旧值改变过滤了
         * 所以if判断里面只会执行一次
         */
        var scheduler = function () { return queuePreFlushCb(job); };
        /**
         * getter函数被包了一层traverse函数做数据收集
         * new ReactiveEffect会先执行一次getter函数，所以new ReactiveEffect的时候就做好了数据收集
         * 当数据发生改变的时候scheduler会执行
         */
        var effect = new ReactiveEffect(getter, scheduler);
        if (cb) {
            // 默认执行一次直接执行job
            if (immediate) {
                job();
            }
            else {
                // 不执行的话掉调用run函数保存下旧值
                oldValue = effect.run();
            }
        }
        else {
            oldValue = effect.run();
        }
        return function () {
            effect.stop();
        };
    }
    /**
     * watch与effect以及computed不同
     * 我们进行数据收集track的时候需要满足两个条件
     * 第一是有new ReactiveEffect 然后有保存一个activeEffect
     * 第二是执行effect或者是计算属性里面的函数(计算属性函数的执行是在被使用的时候)
     * 当回调函数被执行的时候则里面若有使用到reactive或者ref的时候就会被收集起来，触发setter的时候就会触发依赖
     * 但是watch并没有执行函数，所以需要内部手动递归访问每一个变量以达到收集的效果
     * @param value watch监听的数据
     */
    function traverse(value) {
        // 是否是对象
        if (!isObject(value)) {
            // 不是的话直接返回
            return value;
        }
        for (var key in value) {
            traverse(value[key]);
        }
        return value;
    }

    /**
     * 对class参数进行增强
     * @param value
     */
    function normalizeClass(value) {
        var res = '';
        if (isString(value)) {
            // 如果是字符串直接返回
            res = value;
        }
        else if (isArray(value)) {
            // 如果是数组循环则递归调用，并拿到结果
            for (var i = 0; i < value.length; i++) {
                var normalized = normalizeClass(value[i]);
                if (normalized) {
                    res += normalized + ' ';
                }
            }
        }
        else if (isObject(value)) {
            // 如果是对象，则判断值是否为true
            for (var name_1 in value) {
                if (value[name_1]) {
                    res += name_1 + ' ';
                }
            }
        }
        // 去掉左右的空格
        return res.trim();
    }

    /**
     * 判断是否是vNode
     * @param value
     * @returns
     */
    function isVNode(value) {
        return value ? value.__v_isVNode === true : false;
    }
    // 导出3中Symbol
    // 文本类型
    var Text = Symbol('Text');
    // 注释类型
    var Comment = Symbol('Comment');
    // 片段类型
    var Fragment = Symbol('Fragment');
    // 创建虚拟dom方法
    function createVNode(type, props, children) {
        // 先构建好flag
        // 这个是个比较复杂的三元表达式
        // 是否是字符串是的话返回ShapeFlags.ELEMENT否则下一个阶段
        // 是否是对象是的话返回ShapeFlags.STATEFUL_COMPONENT
        // 这里的shapeFlag表示这type的类型
        var shapeFlag = isString(type)
            ? 1 /* ShapeFlags.ELEMENT */ : isObject(type)
            ? 4 /* ShapeFlags.STATEFUL_COMPONENT */ : 0;
        // 然后对props的class以及style进行增强
        // 拿到props的class跟style,由于是简化版我们这边要进行判空
        var klass = (props || {}).class;
        if (klass && !isString(klass)) {
            // 对class进行增强
            props.class = normalizeClass(klass);
        }
        // 创建vnode对象
        return createBaseVNode(type, props, children, shapeFlag);
    }
    function createBaseVNode(type, props, children, shapeFlag) {
        // 创建vnode对象,先不赋值children
        var vnode = {
            __v_isVNode: true,
            type: type,
            props: props,
            shapeFlag: shapeFlag,
            // key后期用来做diff算法的时候用的,值取自props
            key: (props === null || props === void 0 ? void 0 : props.key) || null
        };
        // 创建好vnode之后，我们需要去解析以及标准化当前的children的类型
        normalizeChildren(vnode, children);
        return vnode;
    }
    function normalizeChildren(vnode, children) {
        // 根据当前children的状态来解析,先初始化type = 0
        var type = 0;
        // 这里undefined也可以为true
        if (children == null) {
            children = null;
        }
        else if (isArray(children)) {
            type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
        }
        else if (typeof children === 'object') ;
        else if (isFunction(children)) ;
        else {
            // 如果children以上都不是,那我们认为children是一个字符串,我们需要调用String转为字符串
            children = String(children);
            // 标记一下type 的值
            type = 8 /* ShapeFlags.TEXT_CHILDREN */;
        }
        // 给vnode添加上children
        vnode.children = children;
        // 然后执行按位或等于的运算,类似于保存变量,当执行按位或的时候可以提取出来
        // 或运算是将二进制结合上下结合在一起 01 = 1  00 = 0 11 = 1
        // 5 | 6 二进制加起来为 101 跟 110 = 111 所以结果是7
        // 到这里的type表示children的类型
        vnode.shapeFlag |= type;
    }
    function isSameVNodeType(n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    }
    /**
     * 生成标准化的vnode
     * @param child 创建vnode
     */
    function normalizeVNode(child) {
        // 如果当前child是一个对象，代表的意思就是child已经是一个vnode了
        if (typeof child === 'object') {
            // 此时直接把child直接返回
            return cloneIfMounted(child);
        }
        else {
            // 如果不是
            return createVNode(Text, null, String(child));
        }
    }
    function cloneIfMounted(child) {
        return child;
    }

    /**
     * 创建虚拟dom函数入口,主要针对参数处理，然后调用创建虚拟DOM的方法
     * @param type
     * @param propsOrChildren
     * @param children
     * @returns
     */
    function h(type, propsOrChildren, children) {
        // 获取参数的长度
        var l = arguments.length;
        // 
        if (l === 2) {
            // 如果长度是2，意味着当前值传递了两个参数，第二个参数可能是props也可能是children
            // 所以需要对第二个参数进行判断
            if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
                // 如果是一个对象,并且是一个VNode,那么VNode只能用于children
                if (isVNode(propsOrChildren)) {
                    return createVNode(type, null, [propsOrChildren]);
                }
                // 如果不是vnode那么久把第二个参数当成props
                return createVNode(type, propsOrChildren, []);
            }
            else {
                // 如果连对象都不是，则当成children
                return createVNode(type, null, propsOrChildren);
            }
        }
        else {
            if (l > 3) {
                // 如果长度大于3，则拿到3后面的所有参数的数组
                children = Array.prototype.slice.call(arguments, 2);
            }
            else if (l === 3 && isVNode(children)) {
                // 如果刚好等于3
                children = [children];
            }
            return createVNode(type, propsOrChildren, children);
        }
    }

    /**
     *
     * @param type 组件实例对象里面保存的方法回调函数的key
     * @param hook 回调函数本身
     * @param target 组件实例化对象
     */
    function injectHook(type, hook, target) {
        // 如果实例对象存在则将方法添加进来
        if (target) {
            target[type] = hook;
        }
    }
    // 创建生命周期注册方法的统一地方
    var createHook = function (lifecycle) {
        // 对外暴露出一个方法,这个方法就是被registerLifecycleHook里面所调用会传进来对应的回调函数跟组件实例对象
        // 通过injectHook的方法吧hook注册到target
        // 接收的lifecycle就是组件实例对象里面保存的key
        /**
         * hook 回调函数
         * target 实例对象
         */
        return function (hook, target) { return injectHook(lifecycle, hook, target); };
    };
    // 导出每一个生命周期的注册方法
    var onBeforeMount = createHook("bm" /* LifecycleHooks.BEFORE_MOUNT */);
    var onMounted = createHook("m" /* LifecycleHooks.MOUNTED */);

    // 处理组件的options
    function applyOptions(instance) {
        // 拿到options对象
        var options = instance.type;
        // 解构出所有的options,此时data是一个函数
        // 包含了生命周期等的option
        // 如果生命周期beforeCreate存在
        if (options.beforeCreate) {
            // 使用callHook调用方法,所以beforeCreate的生命周期在这个阶段调用,this指向data
            callHook(options.beforeCreate, instance.data);
        }
        var dataOptions = options.data, created = options.created, beforeMount = options.beforeMount, mounted = options.mounted;
        if (dataOptions) {
            // 拿到data的返回值函数
            var data = dataOptions();
            // 判断data是否是对象
            if (isObject(data)) {
                // 调用reactive将data变为响应式对象保存到实例里面,这样在调用render的时候可以将data改变一下指向
                instance.data = reactive(data);
            }
        }
        // created的生命周期，此时实是在添加完data的响应式数据之后
        if (created) {
            // 触发created,this指向data
            callHook(created, instance.data);
        }
        /**
         * 这个操作是将生命周期的回调函数注册到组件实例中
         * onBeforeMount onMounted 都是封装对应类型的注册函数
         * 经过registerLifecycleHook这个方法可以吧第二个参数的回调函数注册到第一个参数的函数中对应的类型上去
         * 这样实例化对象里面就保存了对应的回调函数
         */
        registerLifecycleHook(onBeforeMount, beforeMount);
        registerLifecycleHook(onMounted, mounted);
        /**
         * 注册回调统一方法
         * @param register 接收每一个生命周期的注册方法将hook回调注册到对应的instance生命周期上去
         * @param hook 生命周期
         */
        function registerLifecycleHook(register, hook) {
            // 这边在注册的hook也改变下this的指向
            register(hook === null || hook === void 0 ? void 0 : hook.bind(instance.data), instance);
        }
    }
    /**
     * 触发生命周期的函数,在这里主要做的事情是改变hook的this指向
     * @param hook 生命周期
     */
    function callHook(hook, proxy) {
        hook.bind(proxy);
    }

    var uid = 0;
    // 生成组件实例的方法
    function createComponentInstance(vnode) {
        // 特别注意：组件的type本质上是一个对象包含着render函数
        var type = vnode.type;
        // 定义一个组件的实例
        var instance = {
            // 唯一标识
            uid: uid++,
            // vnode
            vnode: vnode,
            // 类型
            type: type,
            // 组件里面最需要渲染的，渲染树
            subTree: null,
            // update函数
            update: null,
            // render函数
            render: null,
            // 生命周期
            bc: null,
            c: null,
            bm: null,
            m: null,
        };
        // 返回一个组件的实例
        return instance;
    }
    // 绑定render
    function setupComponent(instance) {
        setupStatefulComponent(instance);
    }
    // 处理setup或者options
    function setupStatefulComponent(instance) {
        var Component = instance.type;
        // 获取setup参数
        var setup = Component.setup;
        // 判断是否存在setup选项
        if (setup) {
            // 调用setup然后返回setup返回的额匿名函数
            var setupResult = setup();
            console.log(setupResult);
            // 将setup返回的匿名函数绑定到实例对象的render,并执行下一步
            handleSetupResult(instance, setupResult);
        }
        else {
            finishComponentSetup(instance);
        }
    }
    // 将setup返回结果添加进实例的render
    function handleSetupResult(instance, setupResult) {
        if (isFunction(setupResult)) {
            instance.render = setupResult;
        }
        // 然后调用finishComponentSetup处理下一步
        finishComponentSetup(instance);
    }
    // 赋值render的操作
    function finishComponentSetup(instance) {
        // 拿到组建的type值，组件的type值是一个包含render的对象
        var Component = instance.type;
        // 如果instance.render有值，证明存在setup在里面以及返回了函数了就无需进入
        if (!instance.render) {
            // 如果没有setup就需要组件里面存在render函数,赋值给实例化对象
            instance.render = Component.render;
        }
        // 赋值完之后我们取处理Options
        // 在里面绑定了响应式的data返回值
        // 处理生命周期
        applyOptions(instance);
    }

    // 挂载组件
    function renderComponentRoot(instance) {
        // 拿到组件实例里面保存的vnode 跟 render
        var vnode = instance.vnode, render = instance.render;
        var result;
        try {
            // 判断vnode是否是组件
            if (vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
                // 组件的render函数返回的是vnode
                // result得到了一个vnode
                // 这里是render函数调用的地方，我们在之前绑定了响应式的data对象,调用call将this指向该对象
                // 但是在setup中如果声明在setup函数内的数据也不会受this的影响，比较使用的过程中不需要通过this，而声明在data中的变量setup也能拿到
                // 在这之前我们已经对data中的数据进行了reactive监听，在这里调用render函数会使用data数据会被收集，如果在setup中我们会主动使用reactive也会在这里被收集
                result = normalizeVNode(render.call(instance.data));
            }
        }
        catch (error) {
            console.log(error);
        }
        // 将vnode返回出去
        return result;
    }

    /**
     * 对外导出一个createRenderer函数
     * @param options
     */
    function createRenderer(options) {
        return baseCreateRenderer(options);
    }
    // render渲染器的主函数
    function baseCreateRenderer(options) {
        // 从options中拿到操作dom的方法
        var hostInsert = options.insert, hostPatchProp = options.patchProp, hostCreateText = options.createText, hostCreateElement = options.createElement, hostSetElementText = options.setElementText, hostRemove = options.remove, hostSetText = options.setText, hostCreateComment = options.createComment;
        // 处理文本
        var processText = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode == null) {
                // 如果旧的值不存在则是挂载,掉还用函数传入节点上的文本创建新的节点并保存到el
                newVNode.el = hostCreateText(newVNode.children);
                // 节点插入到容器
                hostInsert(newVNode.el, container, anchor);
            }
            else {
                // 否则则是更新
                // 节点对象传递给新的vnode
                var el = (newVNode.el = oldVNode.el);
                // 比较下新旧节点得的文本是否一样
                if (newVNode.children !== oldVNode.children) {
                    // 如果不一样则更新
                    hostSetText(el, newVNode.children);
                }
            }
        };
        // 处理注释节点
        var processCommentNode = function (oldVNode, newVNode, container, anchor) {
            // 判断旧的节点是否存在
            if (oldVNode == null) {
                // 跟文本节点一样我们第一步需要生成注释节点
                newVNode.el = hostCreateComment(newVNode.children);
                // 节点插入到容器
                hostInsert(newVNode.el, container, anchor);
            }
            else {
                // 由于注释节点没有更新这种说法因此，只需要赋值一下注释节点给新的vnode就可以了
                newVNode.el = oldVNode.el;
            }
        };
        // 处理片段
        var processFragment = function (oldVNode, newVNode, container, anchor) {
            // 判断旧的节点是否存在
            if (oldVNode == null) {
                // 不存在则挂载
                mountChildren(newVNode.children, container, anchor);
            }
            else {
                // 更新子节点
                patchChildren(oldVNode, newVNode, container, anchor);
            }
        };
        // 处理element
        var processElement = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode == null) {
                // 如果旧的值不存在则执行挂载
                mountElement(newVNode, container, anchor);
            }
            else {
                // 否则执行更新,TODO:更新操作
                patchElement(oldVNode, newVNode);
            }
        };
        // 处理组件
        var processComponent = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode == null) {
                // 如果旧的值不存在则执行挂载组件
                mountComponent(newVNode, container, anchor);
            }
        };
        // 挂载子节点
        var mountChildren = function (children, container, anchor) {
            // 如果children是一个字符串我们将字符串拆成数组
            if (isString(children)) {
                children = children.split('');
            }
            // 这个函数本质上就是对children的循环渲染
            for (var i = 0; i < children.length; i++) {
                // 循环拿到每一个子节点,child就是我们新的node
                // 通过normalizeVNode来渲染vnode
                var child = (children[i] = normalizeVNode(children[i]));
                // 然后我们拿到child的一个vnode,通过patch渲染
                patch(null, child, container, anchor);
            }
        };
        // 挂载element方法
        var mountElement = function (vnode, container, anchor) {
            // 先拿到vnode上面的信息
            var type = vnode.type, props = vnode.props, shapeFlag = vnode.shapeFlag;
            //1.创建element节点,在挂载的时候把当前的真实dom对象保存到vnode上面
            var el = (vnode.el = hostCreateElement(type));
            // 2.设置文本
            // 判断子节点是否是文本
            if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                // 如果是的话设置文本
                hostSetElementText(el, vnode.children);
            }
            else {
                // 如果是数组则调用mountChildren传入当前创建的el节点作为容器循环挂载
                mountChildren(vnode.children, el, anchor);
            }
            // 3.设置props
            if (props) {
                // 如果当前的props存在
                for (var key in props) {
                    // 因为是挂在所以第三个参数是旧值传null
                    hostPatchProp(el, key, null, props[key]);
                }
            }
            // 4.插入
            hostInsert(el, container, anchor);
        };
        // 更新element方法
        var patchElement = function (oldVNode, newVNode, anchor) {
            // 第一步我们要去绑定el,这三个都进行浅拷贝指向同一个内存空间
            var el = newVNode.el = oldVNode.el;
            // 第二部我们要去获取新旧的props,为了后面去更新props的时候进行使用
            var oldProps = oldVNode.props || EMPTY_OBJ;
            var newProps = newVNode.props || EMPTY_OBJ;
            // 更新子节点
            patchChildren(oldVNode, newVNode, el, null);
            // 更新props
            patchProps(el, newVNode, oldProps, newProps);
        };
        // 挂载组件函数
        var mountComponent = function (initialVNode, container, anchor) {
            // 根据initialVNode也就是传入的vnode来生成组件的实例
            // 放到vnode里面的component下面
            initialVNode.component = createComponentInstance(initialVNode);
            // 定义一个变量保存component
            var instance = initialVNode.component;
            // 在这个方法里面绑定render函数
            // 绑定了响应式的data返回值
            // 处理生命周期,完成生命周期的注册
            setupComponent(instance);
            // 真正渲染组件
            // 触发render函数,生成subTree挂载,指向data
            // 触发对应的生命周期
            setupRenderEffect(instance, initialVNode, container, anchor);
        };
        var setupRenderEffect = function (instance, initialVNode, container, anchor) {
            // 在这里处理挂载操作
            var componentUpdateFn = function () {
                // 在这里挂载subTree
                // 判断是否挂载
                if (!instance.isMounted) {
                    // 从实例里面取出注册好的回调函数
                    var bm = instance.bm, m = instance.m;
                    if (bm) {
                        // 这个是在组件渲染前触发的回调onBeforeMount
                        bm();
                    }
                    // 没有的话需要挂载,renderComponentRoot可以简单的理解为执行render函数拿到render函数返回的vnode保存到subTree
                    var subTree = instance.subTree = renderComponentRoot(instance);
                    // 调用patch,将subTree挂载到容器上,挂载的过程中会执行其他的挂载那么subTree上就会有el
                    patch(null, subTree, container, anchor);
                    // 将el保存到组件层面上的vnode
                    // 这里完成了patch挂载了,在这里触发挂载后的回调也就是onMounted
                    if (m) {
                        m();
                    }
                    initialVNode.el = subTree.el;
                    // 修改状态
                    instance.isMounted = true;
                }
                else {
                    instance.next; instance.vnode;
                    // 调用renderComponentRoot，因为data数据改变了内部会从新调用render返回最新的vnode
                    var nextTree = renderComponentRoot(instance);
                    // 拿到上一次的subTree
                    var prevTree = instance.subTree;
                    // 赋值最新的subTree
                    instance.subTree = nextTree;
                    // 更新挂载patch
                    patch(prevTree, nextTree, container, anchor);
                }
            };
            // 因为在setupComponent里面我们把data通过reactive转为了响应式数据,所以在这里new ReactiveEffect的时候
            // 我们会执行到componentUpdateFn里面的renderComponentRoot 最终会执行render并将this指向响应式得的ata
            // 当data里面的数据在render里面被访问到的时候会触发reactive里面的track收集ReactiveEffect
            // 那么当data数据改变的时候就会调用ReactiveEffect的调度器queuePreFlushCb(update)最终会从新执行componentUpdateFn
            // 整体来说这个就是让render函数里面使用的响应式数据在被修改的时候会被从新触发的东西
            var effect = (instance.effect = new ReactiveEffect(componentUpdateFn, function () { return queuePreFlushCb(update); }));
            var update = (instance.update = function () { return effect.run(); });
            // 调用update会触发effect.run接着会触发componentUpdateFn
            update();
        };
        /**
         * 更新子节点方法
         * @param oldVNode 旧的vnode
         * @param newVNode 新的vnode
         * @param container 容器
         * @param anchor 锚点
         */
        var patchChildren = function (oldVNode, newVNode, container, anchor) {
            // 拿到旧节点的children
            var oldChildren = oldVNode && oldVNode.children;
            // 旧的flag
            var prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0;
            // 新的节点的children
            var newChildren = newVNode && newVNode.children;
            // 新的flag,新节点必定存在所以不用三院表达式
            var shapeFlag = newVNode.shapeFlag;
            // 接下来根据新旧节点类型不同来做不同的操作
            if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                // 如果旧节点不是ARRAY_CHILDREN，那么就都是文本子节点，判断子节点是否相等
                if (newChildren !== oldChildren) {
                    // 如果不相等直接执行设置文本的操作
                    hostSetElementText(container, newChildren);
                }
            }
            else {
                if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                    if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                        // diff
                        patchKeyedChildren(oldChildren, newChildren, container, anchor);
                    }
                }
                else {
                    if (prevShapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                        // 删除旧节点的 text
                        hostSetElementText(container, '');
                    }
                }
            }
        };
        /**
         * diff算法处理子节点
         * @param oldChildren 旧的子节点
         * @param newChildren 新的子节点
         * @param container 容器
         * @param parentAnchor 锚点
         */
        var patchKeyedChildren = function (oldChildren, newChildren, container, parentAnchor) {
            var i = 0;
            // 获取新节点的长度
            var newChildrenLength = newChildren.length;
            // 旧节点的最后一个节点
            var oldChildrenEnd = oldChildren.length - 1;
            // 新节点的最后一个节点
            var newChildrenEnd = newChildrenLength - 1;
            // 自前向后
            // 循环判断当前的节点是否是新节点或旧节点中的最后一个,是则跳出循环
            // (a b) c
            // (a b) d e
            while (i <= oldChildrenEnd && i <= newChildrenEnd) {
                // 拿到当前的新旧节点的vnode
                var oldVNode = oldChildren[i];
                // 在挂载子节点为数组的时候也是调用了normalizeVNode这个会将字符串直接转为标准化的vnode
                // 所以oldChildren不需要再调用normalizeVNode
                var newVNode = normalizeVNode(newChildren[i]);
                // 判断新旧节点的类型是否一致
                if (isSameVNodeType(oldVNode, newVNode)) {
                    patch(oldVNode, newVNode, container, null);
                }
                else {
                    // 如果匹配不上的后跳出while
                    break;
                }
                i++;
            }
            // 自后向前匹配
            // 在前面自前向后中假如有一个key或者类型匹配不上的话会中断这时候i还没到最后我们可以从最后一个节点出发
            // a (b c)
            // d e (b c)
            while (i <= oldChildrenEnd && i <= newChildrenEnd) {
                // 从最后一个节点获取新旧节点的vnode
                var oldVNode = oldChildren[oldChildrenEnd];
                var newVNode = newChildren[newChildrenEnd];
                // 判断是否匹配
                if (isSameVNodeType(oldVNode, newVNode)) {
                    // 如果匹配则更新
                    patch(oldVNode, newVNode, container, null);
                }
                else {
                    // 否者跳出
                    break;
                }
                // 将新旧节点的下标往前移动
                oldChildrenEnd--;
                newChildrenEnd--;
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
                    var nextPos = newChildrenEnd + 1;
                    // 但是节点有可能是在最后才添加的这样nextPos会超出新节点的长度
                    // 我们需要根据这个来确定锚点parentAnchor=null，所以也会直接往后面添加
                    var anchor = nextPos < newChildrenLength ? newChildren[nextPos].el : parentAnchor;
                    // i~newChildrenEnd既是新增的长度我们做个循环添加一下
                    while (i <= newChildrenEnd) {
                        patch(null, normalizeVNode(newChildren[i]), container, anchor);
                        i++;
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
                    unmount(oldChildren[i]);
                    i++;
                }
            }
            // 5. unknown sequence
            // [i ... oldChildrenEnd + 1]: a b [c d e] f g
            // [i ... newChildrenEnd + 1]: a b [e d c h] f g
            // i = 2, oldChildrenEnd = 4, newChildrenEnd = 5
            else {
                // 场景五
                var s1 = i; // prev starting index 旧节点开始的索引 oldChildrenStart
                var s2 = i; // next starting index 新节点开始的索引 newChildrenStart
                // 5.1 build key:index map for newChildren
                // 5.1整个目的就是为了构建keyToNewIndexMap
                // 创建一个 <key (新节点的key) : index(新节点的位置)> 的Map对象
                // keyToNewIndexMap.通过该对象可知：新的child（根据key判断指定child）更新后的位置（根据对应的index判断）在哪里
                var keyToNewIndexMap = new Map();
                // 通过循环为keyToNewIndexMap 填充值（s2 = newChildrenStart; el = newChildrenEnd）
                // 这个可以看成是对新节点的循环
                for (i = s2; i <= newChildrenEnd; i++) {
                    // 从 newChildren 中根据开始索引获取每一个 child (newChildren = newChildren)
                    var nextChild = normalizeVNode(newChildren[i]);
                    if (nextChild.key != null) {
                        // 这里意味着keu必须要有也必须是唯一的，否则就会报错，如果一切正常，那么keyToNewIndexMap就会保存<key: index>
                        keyToNewIndexMap.set(nextChild.key, i);
                    }
                }
                // 5.2 loop through old children left to be patched and try to patch
                // matching nodes & remove nodes that are no longer present
                // 场景2
                var j 
                // 记录已经修复的新节点的数量
                = void 0;
                // 记录已经修复的新节点的数量
                var patched = 0;
                // 新节点还有几个需要修复
                var toBePatched = newChildrenEnd - s2 + 1;
                // 当前节点是否需要进行移动
                var moved = false;
                // used to track whether any node has moved
                // 当前变量会始终保存最大的index的值
                var maxNewIndexSoFar = 0;
                // works as Map<newIndex, oldIndex>
                // Note that oldIndex is offset by +1
                // and oldIndex = 0 is a special value indicating the new node has
                // no corresponding old node.
                // used for determining longest stable subsequence
                // 这个是一个数组，数组的下标表示的是新节点的下标，他的元素表示的是旧节点的下标
                var newIndexToOldIndexMap = new Array(toBePatched);
                // 循环给数组初始化一个0
                for (i = 0; i < toBePatched; i++)
                    newIndexToOldIndexMap[i] = 0;
                // 循环旧节点
                for (i = s1; i <= oldChildrenEnd; i++) {
                    // oldChildren是节点的数组,prevChild是被遍历出来的节点
                    var prevChild = oldChildren[i];
                    // 如果修复已经修复的数量大于需要修复的数量这直接取消挂载
                    if (patched >= toBePatched) {
                        // all new children have been patched so this can only be a removal
                        unmount(prevChild);
                        continue;
                    }
                    // 新节点存放的位置
                    var newIndex 
                    // 如果存在key
                    = void 0;
                    // 如果存在key
                    if (prevChild.key != null) {
                        // keyToNewIndexMap的key存放的是新节点的key,拿旧节点的key如果存在这会返回新节点的下标，不存在这是undefined
                        newIndex = keyToNewIndexMap.get(prevChild.key);
                    }
                    else {
                        // key-less node, try to locate a key-less node of the same type
                        // 如果不存在key遍历所有新节点，找到没有找到旧节点的新节点
                        for (j = s2; j <= newChildrenEnd; j++) {
                            if (
                            // [j - s2]的意思是因为newIndexToOldIndexMap本质上是一个数组,而循环的开始s2不一定在起始点，为了位置跟数组对应
                            newIndexToOldIndexMap[j - s2] === 0 &&
                                isSameVNodeType(prevChild, newChildren[j])) {
                                newIndex = j;
                                break;
                            }
                        }
                    }
                    // 判断是否newIndex不存在
                    if (newIndex === undefined) {
                        // 不存在则表示在新节点中不存在该旧节点,应该删除
                        unmount(prevChild);
                    }
                    else {
                        // 到这里这标识新节点在旧节点中存在，只是发生了位移
                        // [newIndex - s2]是新节点的下标
                        // (i + 1)是旧节点的下标,因为newIndexToOldIndexMap默认等于0代表着不存在，所以下标必须先+1来标识后面会通过i--来还原
                        newIndexToOldIndexMap[newIndex - s2] = i + 1;
                        // maxNewIndexSoFar会存储当前最大的newIndex
                        if (newIndex >= maxNewIndexSoFar) {
                            // newIndex如果大于maxNewIndexSoFar，证明newIndex是递增的那么更新一下最大值
                            maxNewIndexSoFar = newIndex;
                        }
                        else {
                            // newIndex如果小于的话，则证明不是递增的，那么这个节点需要移动
                            moved = true;
                        }
                        // 到这里是证明新旧节点同时都存在,发生移位的操作在5.3这里我们先要将新旧节点的元素进行更新
                        // prevChild为纠结点newChildren[newIndex]为新节点
                        patch(prevChild, newChildren[newIndex], container, null);
                        // patched是记录已被修复的新节点初始化是0
                        patched++;
                    }
                }
                // 5.3 move and mount
                // generate longest stable subsequence only when nodes have moved
                // 如果moved=true，那么increasingNewIndexSequence=旧节点的下标的最长递增子序列的下标
                // 注意getSequence这个方法是求最长递增子序列下标，但是0会忽略掉不进行计算
                // newIndexToOldIndexMap为旧未处理的下标0代表不存在
                // 如果newIndexToOldIndexMap=[2, 1, 0],那么increasingNewIndexSequence=[1(这个1代表的是下标)]
                var increasingNewIndexSequence = moved
                    ? getSequence(newIndexToOldIndexMap)
                    : [];
                // j的初始值=最长递增子序列最后的下标
                j = increasingNewIndexSequence.length - 1;
                // looping backwards so that we can use last patched node as anchor
                // 倒叙循环待处理的节点
                for (i = toBePatched - 1; i >= 0; i--) {
                    // s2表示新节点的起点，s2+i表示需要更新的新节点的下标从后向前倒叙
                    var nextIndex = s2 + i;
                    // 拿到节点对象
                    var nextChild = newChildren[nextIndex];
                    // l2表示新节点的长度，nextIndex表示新节点的下标
                    // nextIndex + 1 < l2标识锚点是否超过了最长的长度false为超出true为不超出
                    // 如果超出则直接锚点为父级没超出则取出新节点下面的el作为锚点
                    var anchor = nextIndex + 1 < newChildrenLength ? (newChildren[nextIndex + 1]).el : parentAnchor;
                    if (newIndexToOldIndexMap[i] === 0) {
                        // 如果newIndexToOldIndexMap[i] === 0意味着新节点存在但是旧节点不存在，应该挂载上去
                        // 这样一来新增的节点就会挂载上去对应的锚点
                        // mount new
                        patch(null, nextChild, container, anchor);
                    }
                    else if (moved) {
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
                            move(nextChild, container, anchor);
                        }
                        else {
                            // 在当前的循环中如果i === increasingNewIndexSequence[j] 并且递增子序列还存在的话，意味着真实的节点处理以及跟当前递增序列重合，那么需要将下标往前移动
                            j--;
                        }
                    }
                }
            }
        };
        // 移动方法
        var move = function (vnode, container, anchor) {
            var el = vnode.el;
            hostInsert(el, container, anchor);
        };
        /**
         * 获取最长递增子序列下标
         * 维基百科: https://en.wikipedia.org/wiki/Longest_increasing_subsequence
         * 百度百科:
         * https://baike.baidu.com/item/%E6%9C%80%E9%95%BF%E9%80%92%E5%A2%9E%E5%AD%90%E5%BA%8F%E5%88%97/22828111
         */
        var getSequence = function (arr) {
            // 获取一个数组浅拷贝。注意 p 的元素改变并不会影响 arr
            // p 是一个最终的回溯数组，它会在最终的 result 回溯中被使用
            // 它会在每次 result 发生变化时，记录 result 更新前最后一个索引的值
            var p = arr.slice();
            // 定义返回值 (最长递增子序列下标)，因为下标从 0 开始，所以它的初始值为 0
            var result = [0];
            var i, j, u, v, c;
            // 当前数组的长度
            var len = arr.length;
            // 对数组中所有的元素进行 for 循环处理，i = 下标
            for (i = 0; i < len; i++) {
                // 根据下标获取当前对应的元素
                var arrI = arr[i];
                if (arrI !== 0) {
                    // 获取 result 中的最后一个元素，既：当前 result 中保存的最大值的下标
                    j = result[result.length - 1];
                    // arr[j] = 当前 result 中所保存的最大值
                    // arrI = 当前值
                    // 如果 arr[j] < arrI，那么就证明，当前存在更大的序列，那么该下标就需要陪放入到 result 的最后位置
                    if (arr[j] < arrI) {
                        // 记录result更新前最后一个索引的值是多少
                        p[i] = j;
                        // 把当前的下标i 放入到 result的最后位置
                        result.push(i);
                        continue;
                    }
                    // 初始下标
                    u = 0;
                    // 最终下标
                    v = result.length - 1;
                    // 二分查找,这里会以uv作为开始跟结束c时中间值然后不断分割
                    // 到最后uv重合的时候u就是离数字最近的那个下标
                    while (u < v) {
                        // 这里执行的是按位操作符，表示c=值被平分并且向下取整
                        c = (u + v) >> 1;
                        if (arr[result[c]] < arrI) {
                            // 取后半部分
                            u = c + 1;
                        }
                        else {
                            // 取前半部分
                            v = c;
                        }
                    }
                    // 判断result中最近的该值是否大于当前值
                    if (arrI < arr[result[u]]) {
                        if (u > 0) {
                            p[i] = result[u - 1];
                        }
                        // 如果大于则替换
                        result[u] = i;
                    }
                }
            }
            u = result.length;
            v = result[u - 1];
            while (u-- > 0) {
                result[u] = v;
                v = p[v];
            }
            return result;
        };
        /**
         * 更新props方法
         * @param el
         * @param vnode
         * @param oldProps
         * @param newProps
         */
        var patchProps = function (el, vnode, oldProps, newProps) {
            // 当新旧的props不一样的时候
            if (oldProps !== newProps) {
                // 遍历新的props
                for (var key in newProps) {
                    // 拿到当前的props值
                    var next = newProps[key];
                    // 拿到旧的props的值
                    var prev = oldProps[key];
                    if (next !== prev) {
                        // 更新prop的值,这个是界面实际的更新
                        hostPatchProp(el, key, prev, next);
                    }
                }
            }
            // 如果prop存在于旧的vnode但不存在于新的prop的话，那么需要删除
            if (oldProps !== EMPTY_OBJ) {
                // 遍历旧的props
                for (var key in oldProps) {
                    if (!(key in newProps)) {
                        // 如果不存在于新的props，则需要删除
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        };
        /**
         * 打补丁函数
         * @param oldVNode 旧的vnode
         * @param newVNode 新的vnode
         * @param container 容器
         * @param anchor 锚点默认为null
         */
        var patch = function (oldVNode, newVNode, container, anchor) {
            if (anchor === void 0) { anchor = null; }
            if (oldVNode === newVNode) {
                // 如果新旧节点一样则不进行任何操作
                return;
            }
            // 在进行下面的switch之前，先判断下新旧节点的类型是否一致
            // 如果是其他类型的话type跟key在从新render的时候不会改变，但是如果组件一旦从新render的时候传入了新的对象就会进入此判断，因此会调用卸载
            if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
                // 如果不一致，则卸载旧的节点
                unmount(oldVNode);
                // 将oldVNode置空，这样就会从新执行挂载，而不会执行更新
                oldVNode = null;
            }
            // 如果不一样，则获取vnode的类型然后根据不同类型分别做各自的操作
            var type = newVNode.type, shapeFlag = newVNode.shapeFlag;
            switch (type) {
                case Text:
                    // 如果是文本
                    processText(oldVNode, newVNode, container, anchor);
                    break;
                case Comment:
                    // 注释节点
                    processCommentNode(oldVNode, newVNode, container, anchor);
                    break;
                case Fragment:
                    // 片段
                    processFragment(oldVNode, newVNode, container, anchor);
                    break;
                default:
                    // 以上则不是则分成两种场景，要么是Element要么是组件
                    // 执行按位与操作
                    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                        // 当前类型是element
                        processElement(oldVNode, newVNode, container, anchor);
                    }
                    else if (shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
                        // 当前是组件类型
                        processComponent(oldVNode, newVNode, container, anchor);
                    }
            }
        };
        /**
         * 卸载节点
         * @param vnode
         */
        var unmount = function (vnode) {
            hostRemove(vnode.el);
        };
        /**
         * 创建render函数
         * @param vnode
         * @param container 容器
         */
        var render = function (vnode, container) {
            // 如果vnode传null
            if (vnode === null) {
                // TODO: 卸载
                // 判断旧节点是否存在,不存在执行卸载操作
                if (container._vnode) {
                    unmount(container._vnode);
                }
            }
            else {
                // 执行打补丁操作
                // container._vnode是旧节点,没有的话是null
                patch(container._vnode || null, vnode, container);
            }
            // 最后将当前的vnode保存成旧节点
            container._vnode = vnode;
        };
        // 返回一个对象
        return {
            render: render
        };
    }

    // 这里是封装所有的dom操作,之所以要封装是因为要兼容不同的平台
    var doc = (typeof document !== 'undefined' ? document : null);
    // 导出nodeOps
    var nodeOps = {
        // 插入指定的el 到 parent 中 anchor 表示插入的位置， 即锚点
        insert: function (child, parent, anchor) {
            parent.insertBefore(child, anchor || null);
        },
        // 创建指定的 Element
        createElement: function (tag) {
            var el = doc.createElement(tag);
            return el;
        },
        // 为指定的 Element 设置 text
        setElementText: function (el, text) {
            el.textContent = text;
        },
        remove: function (child) {
            var parent = child.parentNode;
            if (parent) {
                parent.removeChild(child);
            }
        },
        // 生成文本节点
        createText: function (text) { return doc.createTextNode(text); },
        setText: function (node, text) {
            // 设置文本节点
            node.nodeValue = text;
        },
        createComment: function (text) { return doc.createComment(text); }
    };

    // 对class进行打补丁的才做
    function patchClass(el, value) {
        if (value === null) {
            // 如果value === null,则删除class
            el.removeAttribute('class');
        }
        else {
            // 否则设置class
            el.className = value;
        }
    }

    /**
     * 设置DOMPrototype方法
     * @param el
     * @param key
     * @param value
     */
    function patchDOMProp(el, key, value) {
        try {
            el[key] = value;
        }
        catch (error) {
        }
    }

    /**
     * 设置Attr方法
     * @param el
     * @param key
     * @param value
     */
    function patchAttr(el, key, value) {
        if (value === null) {
            // 如果value等于null，应该删除掉attr
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, value);
        }
    }

    // 更新style
    function patchStyle(el, prev, next) {
        var style = el.style;
        // 是否是一个字符串
        var isCssString = isString(next);
        if (next && !isCssString) {
            // 如果新的值存在，并且不是一个字符串
            for (var key in next) {
                // 设置style
                setStyle(style, key, next[key]);
            }
        }
        // 如果旧样式并且不是字符串
        if (prev && !isString(prev)) {
            for (var key in prev) {
                // 并且不在新样式中，则删除
                if (next[key] == null) {
                    setStyle(style, key, '');
                }
            }
        }
    }
    function setStyle(style, name, val) {
        style[name] = val;
    }

    /**
     * 更新事件
     * @param el
     * @param rawName
     * @param prevValue 旧函数
     * @param nextValue 新函数
     */
    function patchEvent(el, rawName, prevValue, nextValue) {
        // 第一步拿到invokers缓存没有则新增一个空的
        var invokers = el._vei || (el._vei = {});
        // 通过事件名称检测是否有缓存行为，来判断是否要更新
        var existingInvoker = invokers[rawName];
        if (nextValue && existingInvoker) {
            // 如果新的值存在，并且有缓存则是更新行为,直接改变value
            existingInvoker.value = nextValue;
        }
        else {
            // 如果不是更新则有两种行为
            // 先将驼峰事件名转成小写
            var name_1 = parseName(rawName);
            if (nextValue) {
                // 如果新的值存在则创建事件函数
                var invoker = (invokers[rawName] = createInvoker(nextValue));
                // 添加事件
                el.addEventListener(name_1, invoker);
            }
            else if (existingInvoker) {
                // 如果不存在并且旧的缓存存在则是删除
                el.removeEventListener(name_1, existingInvoker);
                // 删除缓存
                invokers[rawName] = undefined;
            }
        }
    }
    // 创建事件函数，接收新的函数，将真正执行的事件放到value中
    function createInvoker(initialValue) {
        var invoker = function (e) {
            invoker.value && invoker.value();
        };
        invoker.value = initialValue;
        return invoker;
    }
    function parseName(name) {
        // 去掉前两个并全部转成小写
        return name.slice(2).toLowerCase();
    }

    // 对props的操作
    var patchProp = function (el, key, prevValue, nextValue) {
        if (key === 'class') {
            // 处理class
            patchClass(el, nextValue);
        }
        else if (key === 'style') {
            patchStyle(el, prevValue, nextValue);
        }
        else if (isOn(key)) {
            // on开头处理事件
            patchEvent(el, key, prevValue, nextValue);
        }
        else if (shouldSetAsProp(el, key)) {
            // 如果是DOMPrototype属性
            patchDOMProp(el, key, nextValue);
        }
        else {
            // 如果是Attr属性
            patchAttr(el, key, nextValue);
        }
    };
    function shouldSetAsProp(el, key) {
        // 判断是否是DOMPrototype
        // 我们需要过滤一些特殊的场景，比如form是只读的，以及某些情况下必须通过setAttr
        if (key === 'form') {
            return false;
        }
        if (key === 'list' && el.tagName === 'INPUT') {
            return false;
        }
        if (key === 'type' && el.tagName === 'TEXTAREA') {
            return false;
        }
        // 其余的都可以直接修改
        return key in el;
    }

    // 定义一个保存renderer的变量
    var renderer;
    // 传递给createRenderer的参数，由patchProp跟nodeOps合并
    var rendererOptions = /*#__PURE__*/ extend({ patchProp: patchProp }, nodeOps);
    // 合并
    function ensureRenderer() {
        // 是否存在renderer，不存在则创建一个
        return (renderer ||
            (renderer = createRenderer(rendererOptions)));
    }
    // 导出的最终被使用的render函数
    var render = (function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        (_a = ensureRenderer()).render.apply(_a, __spreadArray([], __read(args), false));
    });

    function createParserContext(content) {
        return {
            source: content
        };
    }
    /**
     * 生成根节点
     * @param children
     * @returns
     */
    function createRoot(children) {
        return {
            type: 0 /* NodeTypes.ROOT */,
            children: children,
            loc: {}
        };
    }
    // 生成ast对象方法
    function baseParse(content, options) {
        // 生成context上下文对象
        var context = createParserContext(content);
        // const start = getCursor(context)
        // return createRoot(
        //   parseChildren(context, TextModes.DATA, []),
        //   getSelection(context, start)
        // )
        // 构建出解析子节点的对象
        var children = parseChildren(context, []);
        // 放入到根节点并返回
        return createRoot(children);
    }
    /**
     * 解析context上下文对象返回解析后的nodes
     * @param context 上下文对象
     */
    function parseChildren(context, ancestors) {
        var nodes = [];
        // 通过while来解析模板
        // 通过isEnd来判断是否结束，目前能知道的是当context.source里面的字符串等于空的时候没得解析就会跳出
        while (!isEnd(context, ancestors)) {
            // 取出模板
            var s = context.source;
            var node = void 0;
            if (startsWith(s, '{{')) ;
            else if (s[0] === '<') {
                // 是否为<是的话表示标签的开始符号
                // 正则匹配一下是否<后面是字母
                // /i (忽略大小写)
                // /g (全文查找出现的所有匹配字符)
                // /m (多行查找)
                // /gi(全文查找、忽略大小写)
                // /ig(全文查找、忽略大小写)
                if (/[a-z]/i.test(s[1])) {
                    // 拿到node
                    node = parseElement(context, ancestors);
                }
            }
            if (!node) {
                // node值为undefined,意味着模板字符串s既不是标签开始，也不是模板字符串
                // 那么就是文本节点
                node = parseText(context);
            }
            pushNode(nodes, node);
        }
        return nodes;
    }
    // 添加到nodes
    function pushNode(nodes, node) {
        nodes.push(node);
    }
    function parseElement(context, ancestors) {
        // 处理好开始标签,返回处理后的结果
        var element = parseTag(context);
        // 将element丢进去ancestors,在parseChildren内部执行isEnd的时候会去除element.tag判断是否是结束标签
        // 如果是结束标签则中断,这里目前已知的是起到二次校验单额作用
        // 这里主要是处理标签中间内容部分也就是<tag>处理子节点children</tag>
        // 所以调用parseChildren去继续解析
        ancestors.push(element);
        var children = parseChildren(context, ancestors);
        // 校验完之后再去除element
        ancestors.pop();
        element.children = children;
        // 处理结束标签
        // 判断是否是结束标签</开头
        if (startsWithEndTagOpen(context.source, element.tag)) {
            // 如果是的话则调用parseTag这个会处理掉tab节点并返回element
            // 但是当前这里并没有接收element，唯一渠道的作用是去掉了context的</tag>标签
            parseTag(context);
        }
        // 处理完成最终返回element
        return element;
    }
    /**
     * 处理文本节点
     * @param context
     */
    function parseText(context) {
        // 定义特殊的额字符白名单
        var endTokens = ['<', '{{'];
        // 初始化默认长度等于文本自身
        var endIndex = context.source.length;
        // 循环判断是否有特殊字符，有的话截止取普通文本长度
        for (var i = 0; i < endTokens.length; i++) {
            // 第二个参数表示从下表1开始找
            var index = context.source.indexOf(endTokens[i], 1);
            if (index !== -1 && endIndex > index) {
                endIndex = index;
            }
        }
        // 解析文本,获取解析文本内容
        var content = parseTextData(context, endIndex);
        return {
            type: 2 /* NodeTypes.TEXT */,
            content: content
        };
    }
    // 解析文本
    function parseTextData(context, length) {
        // 截取出文本
        var rawText = context.source.slice(0, length);
        // 游标右移
        advanceBy(context, length);
        // 返回文本
        return rawText;
    }
    /**
     * 解析标签的tag
     * @param context 上下文
     * @param type 类型表示开头或结束
     * @returns
     */
    function parseTag(context, type) {
        // 这里的作用是通过正则匹配解析出标签内开头第一个<tag>或</tag>的值tag
        var match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
        // match[0] = <tag
        // match[1] = tag
        var tag = match[1];
        // 游标右移,这个操作等用于去掉context里面的<tag
        advanceBy(context, match[0].length);
        // 接着判断结束标签是否是自闭合，也就是单标签，根据类型来确定游标右移得到数量
        var isSelfClosing = startsWith(context.source, '/>');
        // isSelfClosing=true就是单标签,右移2位
        advanceBy(context, isSelfClosing ? 2 : 1);
        return {
            type: 1 /* NodeTypes.ELEMENT */,
            tag: tag,
            tagType: 0 /* ElementTypes.ELEMENT */,
            children: [],
            props: []
        };
    }
    // 游标右移
    function advanceBy(context, numberOfCharacters) {
        var source = context.source;
        // 利用slice进行删除前面的字符串
        context.source = source.slice(numberOfCharacters);
    }
    /**
     * 判断当前是否是结束标签
     * @param context 上下文
     * @param ancestors elementnode节点数组
     */
    function isEnd(context, ancestors) {
        // 获取当前的模板字符串
        var s = context.source;
        // 当前是否以</结束标签开头
        if (startsWith(s, '</')) {
            // 自后向前循环
            for (var i = ancestors.length - 1; i >= 0; --i) {
                // 判断是否为结束标签的开始
                if (startsWithEndTagOpen(s, ancestors[i].tag)) {
                    return true;
                }
            }
        }
        // 否者返回!s s代表当前模板，如果模板不为空这!s为false
        // 这里的用意是在parseChildren调用的时候可以判断后面的模板是否为空为空则跳出while循环不再解析
        return !s;
    }
    /**
     * 判断字符串source是否以searchString开头,这里一般用来判断标签开始或结束
     * @param source 被判断的对象
     * @param searchString 判断条件
     * @returns
     */
    function startsWith(source, searchString) {
        return source.startsWith(searchString);
    }
    /**
     * 字符串判断是否为结束标签的开始
     * @param source
     * @param tag
     * @returns
     */
    function startsWithEndTagOpen(source, tag) {
        return (startsWith(source, '</')
        // startsWith(source, '</') &&
        // source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
        // /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
        );
    }

    // 判断是否是单个的根节点
    function isSingleElementRoot(root, child) {
        var children = root.children;
        return (children.length === 1 &&
            child.type === 1 /* NodeTypes.ELEMENT */);
    }

    /**
     * 创建 transform 上下文
     * @param root
     * @param param1
     * @returns
     */
    function createTransformContext(root, _a) {
        var _b = _a.nodeTransforms, nodeTransforms = _b === void 0 ? [] : _b;
        var context = {
            nodeTransforms: nodeTransforms,
            root: root,
            helpers: new Map(),
            currentNode: root,
            parent: null,
            childIndex: 0,
            // helper主要是配合helpers放东西
            helper: function (name) {
                var count = context.helpers.get(name) || 0;
                context.helpers.set(name, count + 1);
                return name;
            }
        };
        return context;
    }
    /**
     * 将ast转为javascriptast
     * @param root ast
     * @param options 配置对象
     */
    function transform(root, options) {
        // 这里主要完成两块功能
        // 第一生成上下文
        var context = createTransformContext(root, options);
        // 按照深度优先一次处理 node 节点转化
        traverseNode(root, context);
        // 处理根节点
        createRootCodegen(root);
        // 在第二步执行traverseNode的时候会把helpers存入方法名，我们放到根节点来
        // 通过key 拿到Map的key返回一个数组
        root.helpers = __spreadArray([], __read(context.helpers.keys()), false);
        root.components = [];
        root.directives = [];
        root.imports = [];
        root.hoists = [];
        root.temps = [];
        root.cached = [];
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
    function traverseNode(node, context) {
        // 记录当前正在处理的node
        context.currentNode = node;
        // 拿到nodeTransforms
        var nodeTransforms = context.nodeTransforms;
        // 构建保存函数的数组
        var exitFns = [];
        // 接下来往数组存储转化函数
        for (var i_1 = 0; i_1 < nodeTransforms.length; i_1++) {
            //nodeTransforms[i]返回的一定是闭包的函数
            var onExit = nodeTransforms[i_1](node, context);
            // onExit就是一个闭包函数
            if (onExit) {
                exitFns.push(onExit);
            }
        }
        // 进入阶段
        // 判断当前节点的类型
        switch (node.type) {
            case 1 /* NodeTypes.ELEMENT */:
            case 0 /* NodeTypes.ROOT */:
                // 如果是element或者是根节点, 那么就需要处理子节点
                traverseChildren(node, context);
                break;
        }
        // 退出阶段
        context.currentNode = node;
        var i = exitFns.length;
        while (i--) {
            exitFns[i]();
        }
    }
    function traverseChildren(parent, context) {
        // 拿到子节点
        parent.children.forEach(function (node, index) {
            context.parent = parent;
            context.childIndex = index;
            traverseNode(node, context);
        });
    }
    /**
     * 构建根节点
     */
    function createRootCodegen(root) {
        var children = root.children;
        // Vue2仅支持单个根节点
        if (children.length === 1) {
            var child = children[0];
            // 判断是否是单个根
            // 判断是否是单个的element的更节点
            // child是单个节点的那个node
            if (isSingleElementRoot(root, child)) {
                // 将根节点下的第一个element的codegenNode拿过来
                root.codegenNode = child.codegenNode;
            }
        }
    }

    var _a;
    var CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
    var CREATE_VNODE = Symbol('createVNode');
    var helperNameMap = (_a = {},
        _a[CREATE_ELEMENT_VNODE] = 'createElementVNode',
        _a[CREATE_VNODE] = 'createVNode',
        _a);

    function createVNodeCall(context, tag, props, children) {
        // name其实是生成render函数时的执行函数
        if (context) {
            // helper会往helpers对象里面添加sybmol
            context.helper(CREATE_ELEMENT_VNODE);
        }
        return {
            type: 13 /* NodeTypes.VNODE_CALL */,
            tag: tag,
            props: props,
            children: children
        };
    }

    var transformElement = function (node, context) {
        // 返回一个闭包函数
        return function postTransformElement() {
            // 通过闭包的关系我们就可以拿到当前执行的node,以及context上下文
            // 这里本质上跟取上面参数是一样的,因为在调用transform的时候也往context添加了当前的node在currentNode
            node = context.currentNode;
            // 判断node类型,因为不管是什么类型的节点都会执行这个闭包方法，所以要过滤
            if (node.type !== 1 /* NodeTypes.ELEMENT */) {
                return;
            }
            // 只要是element就会有tag
            var tag = node.tag;
            var vnodeTag = "\"".concat(tag, "\"");
            var vnodeProps = [];
            var vnodeChildren = node.children;
            /**
             * 核心新增一个codegenNode
             * 这里的作用是为了后期在第三部执行生成render函数的时候因为组件的render函数返回的是vnode
             * 因此需要构建一个将当前节点通过createVNode的方式创建出来而codegenNode则是将节点的信息记录到ast中去
             * 以便于后期生成render函数
             */
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    };

    // 是否是文本节点
    function isText(node) {
        return node.type === 5 /* NodeTypes.INTERPOLATION */ || node.type === 2 /* NodeTypes.TEXT */;
    }
    function getVNodeHelper(ssr, isComponent) {
        return ssr || isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE;
    }

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
    var transformText = function (node, context) {
        // 判断节点类型
        if (node.type === 0 /* NodeTypes.ROOT */ ||
            node.type === 1 /* NodeTypes.ELEMENT */ ||
            node.type === 11 /* NodeTypes.FOR */ ||
            node.type === 10 /* NodeTypes.IF_BRANCH */) {
            // 返回匿名函数
            return function () {
                var children = node.children;
                var currentContainer;
                for (var i = 0; i < children.length; i++) {
                    // 拿到children的第一个
                    var child = children[i];
                    // 判断第一个是否是字符串
                    if (isText(child)) {
                        for (var j = i + 1; j < children.length; j++) {
                            // 是的话取出下一个，继续判断是否是字符串
                            var next = children[j];
                            if (!currentContainer) {
                                // 如果第一次currentContainer不存在则直接赋值
                                // 通过createCompoundExpression创建复合表达式的节点
                                currentContainer = children[i] = createCompoundExpression([child], child.loc);
                            }
                            if (isText(next)) {
                                // 当存在next的时候，证明currentContainer以及存在并且存在children=[child]
                                currentContainer.children.push(' + ', next);
                                // 处理好后删除
                                children.splice(j, 1);
                                j--;
                            }
                            else {
                                // 如果第一个节点是文本，第二个不是则不需要合并
                                currentContainer = undefined;
                                break;
                            }
                        }
                    }
                }
            };
        }
    };
    function createCompoundExpression(children, loc) {
        return {
            type: 8 /* NodeTypes.COMPOUND_EXPRESSION */,
            loc: loc,
            children: children
        };
    }

    // 这个是嵌套在数组map函数里面的通过symbol取出真正的方法名，并且拼接为对象属性`fun: _fun`的字符串
    var aliasHelper = function (s) { return "".concat(helperNameMap[s], ": _").concat(helperNameMap[s]); };
    function createCodegenContext(ast) {
        var context = {
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
            helper: function (key) {
                return "_".concat(helperNameMap[key]);
            },
            push: function (code) {
                context.code += code;
            },
            // 进
            indent: function () {
                newline(++context.indentLevel);
            },
            // 缩
            deindent: function (withoutNewLine) {
                newline(--context.indentLevel);
            },
            // 换行
            newline: function () {
                newline(context.indentLevel);
            }
        };
        function newline(n) {
            context.code += '\n' + "  ".repeat(n);
        }
        return context;
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
    function generate(ast) {
        // 创建上下文对象
        var context = createCodegenContext(ast);
        // 结构处上下文对象的方法
        var push = context.push, indent = context.indent, deindent = context.deindent, newline = context.newline;
        // 接下来处理context.code中的函数字符串拼接
        // 处理前置代码
        genFunctionPreamble(context);
        // 函数名称
        var functionName = 'render';
        // 参数
        var args = ['_ctx', '_cache'];
        var signature = args.join(', ');
        push("function ".concat(functionName, "(").concat(signature, ") {"));
        // 换行
        newline();
        // 进两格
        indent();
        var hasHelpers = ast.helpers.length > 0;
        if (hasHelpers) {
            // 如果helpers有函数则取从_Vue取出函数
            push("const { ".concat(ast.helpers.map(aliasHelper).join(', '), " } = _Vue"));
            push('\n');
            newline();
        }
        newline();
        // 拼接返回值
        push("return ");
        if (ast.codegenNode) {
            // 这里其实就是将ast中的codegenNode转为创建vnode的函数
            genNode(ast.codegenNode, context);
        }
        else {
            push("null");
        }
        // 换行
        newline();
        // 缩两格
        deindent();
        // 结尾补上}
        push('}');
        return {
            ast: ast,
            code: context.code
        };
    }
    // 处理节点转化为创建vnode的函数字符串添加进code
    function genNode(node, context) {
        // 判断节点类型
        switch (node.type) {
            // 这个表示这element节点
            case 13 /* NodeTypes.VNODE_CALL */:
                genVNodeCall(node, context);
                break;
            // 这个表示文本节点
            case 2 /* NodeTypes.TEXT */:
                // 如果是文本节点则直接返回
                genText(node, context);
                break;
        }
    }
    // 处理vnode
    function genVNodeCall(node, context) {
        // 取出push方法
        var push = context.push, helper = context.helper;
        // node里面所有的的信息
        var tag = node.tag, props = node.props, children = node.children, patchFlag = node.patchFlag, dynamicProps = node.dynamicProps, directives = node.directives, isBlock = node.isBlock, disableTracking = node.disableTracking, isComponent = node.isComponent;
        // 处理好返回函数的函数名
        var callHelper = getVNodeHelper(context.isSSR, isComponent);
        push(helper(callHelper) + "(");
        // 处理参数,这里会将参数从后向前判断如果为null则去掉，参数的顺序是按照vnode创建的顺序添加的
        var args = genNullableArgs([tag,
            props,
            children,
            patchFlag,
            dynamicProps,
            directives,
            isBlock,
            disableTracking]);
        // 这里是将参数处理为字符串，有的参数是数组我们需要转为字符串"[a, b, c]"的形式
        genNodeList(args, context);
        // 参数闭合
        push(')');
    }
    // 处理参数根据数组内参数类型的不同分别拼接成对应的字符串
    function genNodeList(nodes, context) {
        var push = context.push; context.newline;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (isString(node)) {
                // 如果是字符串,则直接放入
                push(node);
            }
            else if (isArray(node)) {
                genNodeListAsArray(node, context);
            }
            else {
                genNode(node, context);
            }
            // 如果当前不是nodes的左后一个则嘉茹，分割
            if (i < nodes.length - 1) {
                push(", ");
            }
        }
    }
    // 处理返回函数的参数
    function genNullableArgs(args) {
        var i = args.length;
        while (i--) {
            if (args[i] != null)
                break;
        }
        return args.slice(0, i + 1).map(function (arg) { return arg || "null"; });
    }
    // 处理数组类型的字符串参数
    function genNodeListAsArray(nodes, context) {
        context.push('[');
        genNodeList(nodes, context);
        context.push(']');
    }
    // 处理文本节点
    function genText(node, context) {
        context.push(JSON.stringify(node.content));
    }
    function genFunctionPreamble(context) {
        var push = context.push, runtimeGlobalName = context.runtimeGlobalName, newline = context.newline;
        var VueBinding = runtimeGlobalName;
        // 这里不是很理解为什么不直接拿runtimeGlobalName
        push("const _Vue = ".concat(VueBinding, "\n"));
        // 换行
        newline();
        push("return ");
    }

    // compile方法入口
    function baseCompile(template, options) {
        if (options === void 0) { options = {}; }
        // 通过 parse 方法进行解析，得到AST
        var ast = baseParse(template);
        // 将ast转为javascript
        transform(ast, extend(options, {
            // 默认参数
            // 里面包含了transformxxx的函数
            nodeTransforms: [transformElement, transformText]
        }));
        console.log('ast', ast);
        return generate(ast);
    }

    // 导出compile入口方法
    function compile(template, options) {
        if (options === void 0) { options = {}; }
        return baseCompile(template, options);
    }

    exports.Comment = Comment;
    exports.Fragment = Fragment;
    exports.Text = Text;
    exports.compile = compile;
    exports.computed = computed;
    exports.createElementVNode = createVNode;
    exports.effect = effect;
    exports.h = h;
    exports.queuePreFlushCb = queuePreFlushCb;
    exports.reactive = reactive;
    exports.ref = ref;
    exports.render = render;
    exports.watch = watch;

    return exports;

})({});
