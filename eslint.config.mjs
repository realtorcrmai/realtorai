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
];
