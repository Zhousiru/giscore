import base from './base.js'
import { defineConfig } from 'eslint/config'

export default defineConfig([...base, { ignores: ['dist/**'] }])
