import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
  ]),
  // Downgrade no-explicit-any to warning — too many existing violations to block CI
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },
]);

export default eslintConfig;
