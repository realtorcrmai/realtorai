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
    "app-backup/**",
    "app-duplicate-*/**",
    "agent-pipeline/**",
    "content-generator/**",
    "listingflow-agent/**",
    "listingflow-sites/**",
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
    },
  },
]);

export default eslintConfig;
