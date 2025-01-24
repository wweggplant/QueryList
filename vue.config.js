const { defineConfig } = require('@vue/cli-service')
const path = require('path')
module.exports = defineConfig({
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  },
  pages: {
    index: {
      entry: './examples/main.js'
    }
  },
  transpileDependencies: true,
  devServer: {
  },
  pluginOptions: {
    mock: { entry: './examples/mock/index.js', debug: true }
  }
})
