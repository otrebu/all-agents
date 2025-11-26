import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const currentDirectory = import.meta.dirname

export default defineConfig({
  resolve: {
    alias: {
      '@lib': resolve(currentDirectory, './lib'),
      '@tools': resolve(currentDirectory, './src'),
    },
  },
  test: {
    globals: true,
  },
})
