/**
 * Stryker Mutation Testing Config — Realtors360
 * REQ-QUAL-001: Critical business logic has mutation score >= 80%
 *
 * Targets:
 *   - src/lib/schemas/ (Zod validators)
 *   - src/lib/format.ts (phone, price, date formatters)
 *   - src/lib/contact-consistency.ts (data integrity rules)
 *   - src/lib/fuzzy-match.ts (Jaro-Winkler string matching)
 *   - src/lib/cdm-mapper.ts (listing -> form CDM mapping)
 *   - src/lib/notifications.ts (notification creation + speed-to-lead)
 *
 * Thresholds: high 80, low 70, break 65
 *
 * Run: npx stryker run
 * Run on changed files: npx stryker run --since main
 * Run specific module: npx stryker run --mutate 'src/lib/format.ts'
 *
 * Prerequisites: npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner @stryker-mutator/typescript-checker
 */

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  // --- Package Manager ---
  packageManager: 'npm',

  // --- Test Runner ---
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',

  // --- TypeScript Support ---
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',

  // --- What to Mutate ---
  // Only critical business logic — not UI components, not API routes
  mutate: [
    // Zod schemas (validators)
    'src/lib/schemas/**/*.ts',
    'src/lib/validators/**/*.ts',

    // Formatting utilities (phone, price, date, address)
    'src/lib/format.ts',

    // Contact data consistency rules
    'src/lib/contact-consistency.ts',

    // String matching (Jaro-Winkler — used for duplicate detection)
    'src/lib/fuzzy-match.ts',

    // Common Data Model mapper (listing -> BCREA form fields)
    'src/lib/cdm-mapper.ts',

    // Notification helper (speed-to-lead trigger logic)
    'src/lib/notifications.ts',

    // Auth helpers (session parsing, tenant extraction)
    'src/lib/auth-utils.ts',

    // --- Exclusions ---
    // Test files
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.tsx',

    // Type-only files (no runtime logic to mutate)
    '!src/**/types.ts',
    '!src/**/types/**',
    '!src/types/**',

    // Constants and config (static data, not logic)
    '!src/**/constants.ts',
    '!src/**/config.ts',

    // Index re-exports
    '!src/**/index.ts',

    // Generated files
    '!src/**/*.generated.ts',

    // Database client setup (infra, not logic)
    '!src/lib/supabase/**',
  ],

  // --- Mutation Score Thresholds ---
  thresholds: {
    high: 80,   // Green: mutation score >= 80% (target)
    low: 70,    // Yellow: mutation score 70-79% (needs attention)
    break: 65,  // Red/FAIL: mutation score < 65% (blocks CI)
  },

  // --- Performance ---
  timeoutMS: 30000,          // 30s per mutant (generous for Supabase calls)
  timeoutFactor: 1.5,        // Multiply test timeout by 1.5x for mutations
  concurrency: 4,            // Parallel mutant runners

  // --- Incremental Mode ---
  // Reuse previous results for unchanged files (faster re-runs)
  incremental: true,
  incrementalFile: '.stryker-cache/incremental.json',

  // --- Reporting ---
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: {
    fileName: 'reports/mutation/index.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/report.json',
  },
  clearTextReporter: {
    allowColor: true,
    allowEmojis: false,
    logTests: false,        // Don't log individual test results
    maxTestsToLog: 0,
  },

  // --- Logging ---
  logLevel: 'info',

  // --- Vitest Configuration ---
  vitest: {
    configFile: 'vitest.config.ts',
  },

  // --- Mutation Operators ---
  // All default mutators enabled. Key ones for our codebase:
  //   - ConditionalExpression: if/else, ternary
  //   - EqualityOperator: ===, !==, >, <, >=, <=
  //   - StringLiteral: empty strings, changed strings
  //   - ArrayDeclaration: empty arrays
  //   - BooleanLiteral: true/false swap
  //   - ArithmeticOperator: +, -, *, /
  //   - LogicalOperator: &&, ||
  //   - UnaryOperator: !, -, +
  //   - OptionalChaining: ?. removal
  //   - RegexMutator: regex modifications

  // Disable mutators that generate too many false positives:
  // (Uncomment to exclude specific mutators)
  // excludedMutations: [
  //   'StringLiteral',    // Too noisy for error messages
  // ],

  // --- Ignore Patterns ---
  // Files that should never be mutated even if they match `mutate` globs
  ignorePatterns: [
    'node_modules',
    'dist',
    '.next',
    'coverage',
    'reports',
    '.stryker-cache',
    'tests',
  ],

  // --- Temp Directory ---
  tempDirName: '.stryker-tmp',
};

/*
 * CI Integration:
 *
 * Add to GitHub Actions:
 *
 * - name: Mutation Testing
 *   run: npx stryker run --since ${{ github.event.pull_request.base.sha }}
 *   continue-on-error: false  # Fails PR if score < break threshold (65%)
 *
 * - name: Upload Mutation Report
 *   uses: actions/upload-artifact@v4
 *   with:
 *     name: mutation-report
 *     path: reports/mutation/
 *
 * Expected Module Scores:
 *   src/lib/schemas/        — 85%+ (heavily tested by unit tests)
 *   src/lib/format.ts       — 90%+ (pure functions, easy to test)
 *   src/lib/fuzzy-match.ts  — 80%+ (algorithmic, well-defined)
 *   src/lib/cdm-mapper.ts   — 75%+ (mapping logic, some edge cases)
 *   src/lib/notifications.ts — 70%+ (async side-effects harder to test)
 *   src/lib/contact-consistency.ts — 80%+ (validation rules)
 *
 * If a module falls below threshold:
 *   1. Run: npx stryker run --mutate 'src/lib/<module>.ts'
 *   2. Open reports/mutation/index.html
 *   3. Find surviving mutants
 *   4. Add test cases that kill each surviving mutant
 *   5. Re-run until threshold met
 */
