import config from '@giscore/eslint-config/base'

export default [
  ...config,
  {
    ignores: ['.wrangler/**'],
  },
]
