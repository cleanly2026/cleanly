import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // Resolve monorepo workspace packages to their source
      '@cleanly/types': resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  test: {
    globals: false,
  },
})
