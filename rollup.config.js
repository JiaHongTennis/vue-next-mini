import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default [
  {
    // 入口
    input: 'packages/vue/src/index.ts',
    output: [
      {
        // 开启sourceMap
        sourceMap: true,
        // 生成包的格式
        format: 'iife',
        // 导出文件地址
        file: './packages/vue/dist/vue.js',
        // 变量名
        name: 'Vue'
      }
    ],
    // 插件
    plugins: [
      // ts
      typescript({
        sourceMap: true
      }),
      // 模块导入的路径补全
      resolve(),
      // 支持resolve
      commonjs()
    ]
  }
]