import baseConfig from './rollup.config.base'

export default {
  ...baseConfig,
  plugins: [
    ...baseConfig.plugins
  ]
}
