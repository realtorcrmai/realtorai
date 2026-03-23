import { join } from "path";
import { askClaude } from "../clients/claude.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { readFile, writeFile } from "../utils/fs-tools.js";
import { run, gitAdd, gitCommit } from "../utils/shell.js";
import type { GapAnalysis } from "./stage2-gap-analysis.js";
import type { BuildResult } from "./stage3-build.js";

export interface TestResult {
  testFilesWritten: string[];
  testsPassed: number;
  testsFailed: number;
  testsSuites: number;
  coverageSummary: string;
  errors: string[];
}

const TEST_GEN_SYSTEM = `You are a senior QA engineer writing comprehensive test suites for a Next.js real estate CRM.

You write tests using Vitest (not Jest) with React Testing Library for component tests.

TEST CATEGORIES to generate:

1. **Unit Tests** — Pure function logic
   - Server actions (mock Supabase client, test input/output)
   - Validation schemas (Zod — valid inputs, invalid inputs, edge cases)
   - Utility functions (formatters, calculators, mappers)
   - Data consistency enforcement functions

2. **Component Tests** — React component rendering & interaction
   - Renders correctly with minimal props
   - Renders correctly with full props
   - User interactions (click, type, select) trigger correct callbacks
   - Loading states, empty states, error states
   - Conditional rendering based on data
   - Form validation (submit with invalid data, submit with valid data)

3. **Integration Tests** — Multi-component workflows
   - Form submission → server action → revalidation
   - Navigation between related pages
   - Workflow state transitions (e.g., stage changes)
   - Data cascading (changing a listing status → contact stage sync)

4. **Edge Case Tests** — Boundary conditions
   - Empty arrays, null values, undefined fields
   - Maximum length strings, special characters
   - Concurrent operations
   - Network failure / timeout scenarios (mocked)
   - Permission/auth edge cases

5. **Data Integrity Tests** — Database-level validation
   - Required field enforcement
   - Foreign key relationships
   - JSONB field structure validation
   - Status/stage transition rules

CONVENTIONS:
- Test file naming: \`*.test.ts\` or \`*.test.tsx\` next to the source file
- Use \`describe\` blocks grouped by feature area
- Use \`it\` (not \`test\`) for individual test cases
- Use descriptive names: \`it("should show error when phone number is invalid")\`
- Mock external services (Supabase, Twilio, Claude API) at module level
- Use \`beforeEach\` for common setup, \`afterEach\` for cleanup
- Assert both positive (happy path) and negative (error) outcomes
- Include at least 5 test cases per function/component being tested

OUTPUT FORMAT:
For each test file, output in this exact format:

=== FILE: path/relative/to/project/root.test.ts ===
[complete test file content]
=== END FILE ===`;

interface TestFileBlock {
  path: string;
  content: string;
}

function parseTestFileBlocks(response: string): TestFileBlock[] {
  const blocks: TestFileBlock[] = [];
  const regex = /=== FILE: (.+?) ===\n([\s\S]*?)\n=== END FILE ===/g;
  let match;
  while ((match = regex.exec(response)) !== null) {
    blocks.push({ path: match[1].trim(), content: match[2] });
  }
  return blocks;
}

async function generateTestsForGap(
  gap: { id: string; description: string; category: string },
  gapAnalysis: GapAnalysis,
  buildResult: BuildResult
): Promise<TestFileBlock[]> {
  const root = config.PROJECT_ROOT;

  // Gather the source files that were written/modified for this gap
  const relevantFiles = buildResult.filesWritten.filter((f) => {
    // Include files that don't already end in .test
    return !f.endsWith(".test.ts") && !f.endsWith(".test.tsx");
  });

  // Read source contents for context
  const fileContents: string[] = [];
  for (const filePath of relevantFiles.slice(0, 8)) {
    const fullPath = join(root, filePath);
    const content = readFile(fullPath);
    if (content) {
      fileContents.push(`--- ${filePath} ---\n${content.substring(0, 6000)}\n--- end ---`);
    }
  }

  // Also read any existing test files for pattern matching
  const existingTests: string[] = [];
  for (const filePath of relevantFiles.slice(0, 3)) {
    const testPath = filePath.replace(/\.tsx?$/, ".test.ts");
    const testPathTsx = filePath.replace(/\.tsx?$/, ".test.tsx");
    for (const tp of [testPath, testPathTsx]) {
      const content = readFile(join(root, tp));
      if (content) {
        existingTests.push(`--- ${tp} (existing) ---\n${content.substring(0, 3000)}\n--- end ---`);
      }
    }
  }

  const userPrompt = `## Task
Generate comprehensive tests for gap "${gap.id}": ${gap.description}
Category: ${gap.category}

## Source Files to Test
${fileContents.join("\n\n")}

${existingTests.length > 0 ? `## Existing Test Patterns\n${existingTests.join("\n\n")}` : ""}

## Database Context
${JSON.stringify(gapAnalysis.new_tables, null, 2)}

## Instructions
1. Generate test files for EACH source file listed above
2. Include ALL 5 test categories (unit, component, integration, edge case, data integrity) where applicable
3. Mock Supabase with \`vi.mock\` — never hit real database
4. Mock Twilio, Claude API, and external services
5. For React components, use \`@testing-library/react\` with \`render\`, \`screen\`, \`fireEvent\`, \`waitFor\`
6. For server actions, mock the Supabase admin client and test input → output
7. Include at least 5 test cases per file
8. Test happy paths, error paths, edge cases, and boundary conditions
9. Use \`vi.fn()\` for callback props, \`vi.spyOn\` for module functions
10. Output complete test file contents — no placeholders`;

  const response = await askClaude(TEST_GEN_SYSTEM, userPrompt, {
    model: config.CLAUDE_TEST_MODEL,
    extendedThinking: true,
    maxTokens: 16000,
    thinkingBudget: config.EXTENDED_THINKING_BUDGET,
  });

  return parseTestFileBlocks(response);
}

function setupTestInfra(): { hasVitest: boolean } {
  // Check if vitest is already installed
  const check = run("npx vitest --version", { timeout: 10_000});
  return { hasVitest: check.exitCode === 0 };
}

export async function runStage4(
  gapAnalysis: GapAnalysis,
  buildResult: BuildResult,
  runDir: string,
  featureName: string
): Promise<TestResult> {
  logger.stage(4, 4, "Test");

  const result: TestResult = {
    testFilesWritten: [],
    testsPassed: 0,
    testsFailed: 0,
    testsSuites: 0,
    coverageSummary: "",
    errors: [],
  };

  // Check test infrastructure
  logger.step("Checking test infrastructure...");
  const infra = setupTestInfra();
  if (!infra.hasVitest) {
    logger.warn("Vitest not found — installing as devDependency...");
    const install = run(
      "npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom",
      { timeout: 60_000}
    );
    if (install.exitCode !== 0) {
      result.errors.push("Failed to install test dependencies: " + install.stderr);
      logger.error("Could not install vitest. Tests skipped.");
      return result;
    }
    logger.success("Test dependencies installed");
  }

  // Generate vitest config if missing
  const root = config.PROJECT_ROOT;
  const vitestConfigPath = join(root, "vitest.config.ts");
  if (!readFile(vitestConfigPath)) {
    logger.step("Creating vitest.config.ts...");
    const vitestConfig = `import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
`;
    writeFile(vitestConfigPath, vitestConfig);
    result.testFilesWritten.push("vitest.config.ts");

    // Create test setup file
    const setupPath = join(root, "src/test/setup.ts");
    if (!readFile(setupPath)) {
      const setupContent = `import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
`;
      writeFile(setupPath, setupContent);
      result.testFilesWritten.push("src/test/setup.ts");
    }
  }

  // Generate tests for each completed gap
  const completedGaps = buildResult.gapsCompleted
    .map((id) => gapAnalysis.gaps.find((g) => g.id === id))
    .filter(Boolean) as GapAnalysis["gaps"];

  if (completedGaps.length === 0) {
    logger.warn("No completed gaps to test");
    return result;
  }

  logger.info(`Generating tests for ${completedGaps.length} completed gaps...`);

  for (let i = 0; i < completedGaps.length; i++) {
    const gap = completedGaps[i];
    logger.info(`\n[${i + 1}/${completedGaps.length}] Testing: ${gap.id} — ${gap.description}`);

    try {
      logger.step(`Generating test cases for ${gap.id}...`);
      const testFiles = await generateTestsForGap(gap, gapAnalysis, buildResult);

      if (testFiles.length === 0) {
        logger.warn(`No test files generated for ${gap.id}`);
        continue;
      }

      // Write test files
      for (const file of testFiles) {
        const fullPath = join(root, file.path);
        writeFile(fullPath, file.content);
        result.testFilesWritten.push(file.path);
        logger.step(`Wrote ${file.path}`);
      }

      result.testsSuites += testFiles.length;
    } catch (error: any) {
      result.errors.push(`Test generation for ${gap.id}: ${error.message}`);
      logger.error(`Failed to generate tests for ${gap.id}: ${error.message}`);
    }
  }

  // Run all tests
  if (result.testFilesWritten.length > 0) {
    logger.step("Running test suite...");

    const testRun = run("npx vitest run --reporter=verbose 2>&1", {
      timeout: 300_000, // 5 minutes

    });

    // Parse test output
    const output = testRun.stdout + "\n" + testRun.stderr;
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);

    result.testsPassed = passMatch ? parseInt(passMatch[1], 10) : 0;
    result.testsFailed = failMatch ? parseInt(failMatch[1], 10) : 0;

    if (testRun.exitCode === 0) {
      logger.success(`All tests passed: ${result.testsPassed} passed across ${result.testsSuites} suites`);
    } else {
      logger.warn(`Tests completed: ${result.testsPassed} passed, ${result.testsFailed} failed`);

      // Attempt to fix failing tests (up to 2 rounds)
      if (result.testsFailed > 0) {
        for (let fixRound = 1; fixRound <= 2; fixRound++) {
          logger.step(`Fixing failing tests (attempt ${fixRound}/2)...`);

          const failingOutput = output.substring(0, 6000);
          const failingTestFiles = result.testFilesWritten.filter((f) => {
            return failingOutput.includes(f);
          });

          if (failingTestFiles.length === 0) break;

          // Read failing test files
          const testContents = failingTestFiles
            .slice(0, 5)
            .map((f) => {
              const content = readFile(join(root, f));
              return content ? `--- ${f} ---\n${content.substring(0, 4000)}\n--- end ---` : "";
            })
            .filter(Boolean)
            .join("\n\n");

          const fixPrompt = `These test files are failing:

## Error Output
\`\`\`
${failingOutput}
\`\`\`

## Failing Test Files
${testContents}

Fix the tests so they pass. Common issues:
- Incorrect mock setup
- Wrong import paths (use @/ alias)
- Missing async/await
- Incorrect DOM queries (use getByRole, getByText, queryByText)
- Component needs to be wrapped in providers

Output ONLY the fixed test files using the === FILE: path === format.`;

          const fixResponse = await askClaude(TEST_GEN_SYSTEM, fixPrompt, {
            model: config.CLAUDE_TEST_MODEL,
            extendedThinking: false,
            maxTokens: 12000,
          });

          const fixedFiles = parseTestFileBlocks(fixResponse);
          for (const file of fixedFiles) {
            writeFile(join(root, file.path), file.content);
          }

          // Re-run tests
          const rerun = run("npx vitest run --reporter=verbose 2>&1", {
            timeout: 300_000,
      
          });

          const reoutput = rerun.stdout + "\n" + rerun.stderr;
          const repassMatch = reoutput.match(/(\d+) passed/);
          const refailMatch = reoutput.match(/(\d+) failed/);
          result.testsPassed = repassMatch ? parseInt(repassMatch[1], 10) : 0;
          result.testsFailed = refailMatch ? parseInt(refailMatch[1], 10) : 0;

          if (rerun.exitCode === 0) {
            logger.success(`All tests passing after fix round ${fixRound}`);
            break;
          }
        }
      }
    }

    // Run coverage if tests pass
    if (result.testsFailed === 0 && result.testsPassed > 0) {
      logger.step("Generating coverage report...");
      const coverageRun = run("npx vitest run --coverage 2>&1", {
        timeout: 300_000,
  
      });
      result.coverageSummary = (coverageRun.stdout + "\n" + coverageRun.stderr)
        .split("\n")
        .filter((l) => l.includes("%") || l.includes("Coverage"))
        .join("\n");
    }

    // Git commit test files
    if (result.testFilesWritten.length > 0) {
      gitAdd(result.testFilesWritten);
      if (readFile(vitestConfigPath)) {
        gitAdd(["vitest.config.ts", "src/test/setup.ts"]);
      }
      const commitMsg = `test(${featureName}): comprehensive test suite — ${result.testsPassed} passing`;
      const commitResult = gitCommit(commitMsg);
      if (commitResult.exitCode === 0) {
        logger.success(`Committed test files: ${commitMsg}`);
      }
    }
  }

  return result;
}
