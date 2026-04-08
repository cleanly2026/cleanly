import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// The worktree shares git history but not node_modules.
// Point to the main repo's node_modules for all package resolution.
const MAIN_REPO_API_MODULES = resolve(__dirname, '../../../../../../../Documents/ROFAN/apps/api/node_modules')
const MAIN_REPO_MODULES = resolve(__dirname, '../../../../../../../Documents/ROFAN/node_modules')

export default defineConfig({
  resolve: {
    alias: {
      // Resolve monorepo workspace packages to their source
      '@cleanly/types': resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  test: {
    globals: false,
    // Use the main repo's node_modules for dependency resolution in tests
    server: {
      deps: {
        // Allow transforming files outside the worktree
        inline: [],
      },
    },
  },
})
