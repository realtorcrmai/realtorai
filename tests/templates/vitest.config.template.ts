/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
  test: {
    // Environment
    environment: 'jsdom',
    globals: true,

    // Setup files
    setupFiles: [
      './setup/vitest.setup.ts',
      './setup/mocks.setup.ts',
    ],

    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'tests/e2e/**', // E2E handled by Playwright
      'tests/load/**', // Load tests handled by k6
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',

      // Coverage thresholds — enforce minimum coverage
      thresholds: {
        // Global thresholds
        statements: 60,
        branches: 50,
        functions: 55,
        lines: 60,

        // Per-file thresholds for critical paths
        perFile: true,
      },

      // Files to include in coverage
      include: [
        'src/actions/**/*.ts',
        'src/app/api/**/*.ts',
        'src/lib/**/*.ts',
        'src/components/**/*.{ts,tsx}',
        'src/hooks/**/*.ts',
      ],

      // Files to exclude from coverage
      exclude: [
        'src/types/**',
        'src/components/ui/**', // shadcn primitives — tested upstream
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts', // barrel exports
      ],
    },

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Reporter
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/vitest-results.json',
    },

    // Pool configuration
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },

    // Mock configuration
    mockReset: true,
    restoreMocks: true,

    // Type checking
    typecheck: {
      enabled: false, // Use tsc separately for speed
    },
  },
});
