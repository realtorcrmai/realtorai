import { createRequire } from "module";
const require = createRequire(import.meta.url);

const nextConfig = require("eslint-config-next");

// nextConfig is [base, typescript, ignores]
// Merge our rule overrides into the matching config objects
const [base, typescript, ...rest] = nextConfig;

export default [
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
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  ...rest,
  // Disable React Compiler lint rules — codebase not yet optimized for
  // the compiler's strict requirements (setState in effects, impure
  // render functions, etc.). Re-enable once patterns are migrated.
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "react-compiler/react-compiler": "off",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
