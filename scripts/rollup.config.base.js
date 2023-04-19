import { nodeResolve } from '@rollup/plugin-node-resolve' // 解析 node_modules 中的模块
import commonjs from '@rollup/plugin-commonjs' // cjs => esm
import alias from '@rollup/plugin-alias' // alias 和 reslove 功能
import replace from '@rollup/plugin-replace'
import postcss from 'rollup-plugin-postcss'
import { babel } from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
import typescript from '@rollup/plugin-typescript'
import clear from 'rollup-plugin-clear'
import { name, version, author } from '../package.json'

const pkgName = 'query-list'
const banner = '/*!\n' + ` * ${name} v${version}\n` + ` * (c) 2014-${new Date().getFullYear()} ${author}\n` + ' * Released under the MIT License.\n' + ' */'
export default {
  input: 'src/index.ts',
  output: [
    {
      file: `dist/${pkgName}.umd.js`,
      format: 'umd',
      name: pkgName,
      banner
    },
    {
      file: `dist/${pkgName}.umd.min.js`,
      format: 'umd',
      name: pkgName,
      banner,
      plugins: [terser()]
    },
    {
      file: `dist/${pkgName}.cjs.js`,
      format: 'cjs',
      name: pkgName,
      banner
    },
    {
      file: `dist/${pkgName}.esm.js`,
      format: 'es',
      banner
    }
  ],
  external: ['vue', '@vue/composition-api', '@formily/reactive-vue', '@formily/shared', '@formily/reactive', '@formily/core', '@formily/json-schema', '@formily/vue', '@formily/element', 'element-ui'],
  plugins: [
    clear({
      targets: ['dist']
    }),
    typescript({
      outDir: 'dist/types'
    }),
    alias(),
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      preventAssignment: true
    }),
    nodeResolve(),
    commonjs({
      include: 'node_modules/**'
    }),
    // eslint(),
    babel({ babelHelpers: 'bundled' }),
    postcss({
      extensions: ['.scss'],
      extract: false, // 如果要将样式提取到单独的 CSS 文件，请将此选项设置为 true
      minimize: true, // 压缩 CSS
      use: [
        [
          'sass',
          {
            includePaths: ['node_modules']
          }
        ]
      ]
    })
  ]
}
