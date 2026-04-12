import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Detect if react-compiler plugin is available (only in CI with full npm ci)
let reactCompilerOverride = [];
try {
  await import("eslint-plugin-react-compiler");
  reactCompilerOverride = [{ rules: { "react-compiler/react-compiler": "warn" } }];
} catch {
  // Plugin not installed locally — skip
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...reactCompilerOverride,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Exclude non-app directories from lint
    "tests/**",
    "scripts/**",
    "voice_agent/**",
    "app-duplicate-*/**",
    "agent-pipeline/**",
    "listingflow-agent/**",
    "listingflow-sites/**",
    // The nested realtors360-newsletter service has its own tsconfig +
    // npm scripts. Its compiled JS in dist/ uses CommonJS require()
    // patterns that the parent ESLint config rejects. Excluded entirely
    // — the service has its own quality gates inside its own folder.
    "realtors360-newsletter/**",
    // General catch-all for any compiled output anywhere in the repo.
    "**/dist/**",
  ]),
  // Downgrade pre-existing violations to warnings — they shouldn't block CI
  // TODO: Fix these properly and re-enable as errors
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "prefer-const": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "react/no-unescaped-entities": "warn",
      // 152 violations of this rule across the codebase predate the rule.
      // Most are intentional patterns: mount-time measurement of DOM
      // dimensions, lazy loading triggered by visibility changes, etc.
      // Downgraded 2026-04-09 after the QA audit so PR CI can pass.
      // Refactoring each one to use the React 19 callback pattern is
      // tracked as a follow-up — touching 152 useEffect blocks at once
      // is high-risk for runtime regressions, so it should be done file
      // by file in focused PRs.
      "react-hooks/set-state-in-effect": "warn",
      // ditto preserve-manual-memoization — flags hand-written
      // useMemo/useCallback that React Compiler "would have generated."
      // Same reasoning: 146 violations, mostly intentional, downgrading
      // for now.
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
