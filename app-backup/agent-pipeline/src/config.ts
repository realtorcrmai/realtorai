import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "path";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from agent-pipeline directory
dotenvConfig({ path: resolve(__dirname, "../.env") });

// Also try parent project's .env.local for shared keys
const parentEnvLocal = resolve(__dirname, "../../.env.local");
if (existsSync(parentEnvLocal)) {
  dotenvConfig({ path: parentEnvLocal, override: false });
}

function detectProjectRoot(): string {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      cwd: resolve(__dirname, ".."),
    }).trim();
    return gitRoot;
  } catch {
    return resolve(__dirname, "../..");
  }
}

function getEnv(key: string): string {
  return process.env[key] || "";
}

/**
 * Validate that required env vars are set.
 * Call this AFTER arg parsing so --help works without keys.
 */
export function validateConfig() {
  if (!config.ANTHROPIC_API_KEY) {
    console.error(`\x1b[31m✗ Missing required env var: ANTHROPIC_API_KEY\x1b[0m`);
    console.error(`  Set it in agent-pipeline/.env or the parent project's .env.local`);
    process.exit(1);
  }
}

export const config = {
  // Required (validated lazily via validateConfig())
  ANTHROPIC_API_KEY: getEnv("ANTHROPIC_API_KEY") || getEnv("CLAUDE_API_KEY"),

  // Complexity triage (fast model to classify task before running pipeline)
  CLAUDE_TRIAGE_MODEL: process.env.CLAUDE_TRIAGE_MODEL || "claude-haiku-4-5-20251001",
  SKIP_TRIAGE: process.env.SKIP_TRIAGE === "true",

  // Claude models for each stage
  CLAUDE_RESEARCH_MODEL: process.env.CLAUDE_RESEARCH_MODEL || "claude-sonnet-4-20250514",
  CLAUDE_ANALYSIS_MODEL: process.env.CLAUDE_ANALYSIS_MODEL || "claude-sonnet-4-20250514",
  CLAUDE_BUILD_MODEL: process.env.CLAUDE_BUILD_MODEL || "claude-sonnet-4-20250514",
  CLAUDE_TEST_MODEL: process.env.CLAUDE_TEST_MODEL || "claude-sonnet-4-20250514",

  // Extended thinking
  USE_EXTENDED_THINKING: process.env.USE_EXTENDED_THINKING !== "false",
  EXTENDED_THINKING_BUDGET: parseInt(process.env.EXTENDED_THINKING_BUDGET || "10000", 10),

  // Project
  PROJECT_ROOT: process.env.PROJECT_ROOT || detectProjectRoot(),
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || "3", 10),
  BUILD_COMMAND: process.env.BUILD_COMMAND || "npx tsc --noEmit",
  DRY_RUN: process.env.DRY_RUN === "true",
};
