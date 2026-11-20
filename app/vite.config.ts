import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works under /<repo>/next/ on GitHub Pages
  // without hard-coding the repository name.
  base: './',
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
      // New code is held to full coverage from the start.
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
})
