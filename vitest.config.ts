import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/__tests__/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    exclude: ['node_modules', '.next', 'tests/browser'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
