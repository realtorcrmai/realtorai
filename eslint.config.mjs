import { createRequire } from "module";
const require = createRequire(import.meta.url);

const nextConfig = require("eslint-config-next");

// nextConfig is [base, typescript, ignores]
// Merge our rule overrides into the matching config objects
const [base, typescript, ...rest] = nextConfig;

export default [
  // Ignore sub-packages, dist files, and generated code
  {
    ignores: [
      "listingflow-sites/**",
      "listingflow-agent/**",
      "realtors360-newsletter/**",
      "realtors360-social/**",
      "realtors360-agent/**",
      "realtors360-rag/**",
      "agent-pipeline/**",
      "app-duplicate-*/**",
      ".netlify/**",
      "**/dist/**",
      "**/.next/**",
    ],
  },
  {
    ...base,
    rules: {
      ...base.rules,
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
  {
    ...typescript,
    rules: {
      ...typescript.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-assertions": ["error", {
        assertionStyle: "as",
      }],
    },
  },
  ...rest,
  // Disable React Compiler lint rules — codebase not yet optimized for
  // the compiler's strict requirements (setState in effects, impure
  // render functions, refs during render, etc.). Re-enable once migrated.
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "react-compiler/react-compiler": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];
