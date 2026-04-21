import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/__tests__/**/*.test.ts',
      'src/components/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
      'tests/contract/**/*.spec.ts',
      'tests/api/**/*.spec.ts',
    ],
    environmentMatchGlobs: [
      ['src/components/**/*.test.tsx', 'happy-dom'],
    ],
    exclude: ['node_modules', '.next', 'tests/browser'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
