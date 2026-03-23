import { join, resolve } from "path";
import { mkdirSync } from "fs";
import { config, validateConfig } from "./config.js";
import { logger } from "./logger.js";
import { readFile, writeFile, fileExists } from "./utils/fs-tools.js";
import { runStage1 } from "./stages/stage1-research.js";
import { runStage2, type GapAnalysis } from "./stages/stage2-gap-analysis.js";
import { runStage3, type BuildResult } from "./stages/stage3-build.js";
import { runStage4, type TestResult } from "./stages/stage4-test.js";
import { triageTask } from "./stages/triage.js";

interface PipelineOptions {
  featureRequest: string;
  startStage?: number;
  resumeDir?: string;
  dryRun?: boolean;
  inputFile?: string;
  skipTests?: boolean;
  forceRun?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40);
}

function createRunDirectory(featureRequest: string, baseDir: string): string {
  const date = new Date().toISOString().substring(0, 10);
  const slug = slugify(featureRequest);
  const runDir = join(baseDir, `${date}-${slug}`);
  mkdirSync(runDir, { recursive: true });
  return runDir;
}

function saveOutput(runDir: string, filename: string, content: string) {
  writeFile(join(runDir, filename), content);
  logger.step(`Saved ${filename}`);
}

export async function runPipeline(options: PipelineOptions) {
  const startTime = Date.now();
  const outputsBase = join(config.PROJECT_ROOT, "agent-pipeline/outputs");

  // Determine run directory (resolve relative paths)
  const runDir = options.resumeDir
    ? resolve(process.cwd(), options.resumeDir)
    : createRunDirectory(options.featureRequest, outputsBase);

  // Set up logging
  logger.setLogFile(join(runDir, "pipeline.log"));
  logger.info(`Pipeline started: "${options.featureRequest}"`);
  logger.info(`Run directory: ${runDir}`);
  logger.info(`Project root: ${config.PROJECT_ROOT}`);
  logger.info(`Dry run: ${options.dryRun || config.DRY_RUN}`);

  // Feature name for commit messages
  const featureName = slugify(options.featureRequest);

  // ═══════════════════════════════════
  // TRIAGE: Complexity check
  // ═══════════════════════════════════
  if (!config.SKIP_TRIAGE && !options.forceRun && !options.resumeDir) {
    logger.stage(0, 4, "Triage");
    const triage = await triageTask(options.featureRequest);
    saveOutput(runDir, "triage.json", JSON.stringify(triage, null, 2));

    if (triage.complexity === "small") {
      logger.warn(`Task classified as "${triage.complexity}" — skipping full pipeline.`);
      logger.warn(`Reason: ${triage.reason}`);
      logger.info(`Suggestion: ${triage.suggestion}`);
      logger.info(`To run anyway, use --force flag.`);
      return;
    }

    logger.success(`Task classified as "${triage.complexity}" — proceeding with pipeline.`);
    logger.info(`Reason: ${triage.reason}`);
  }

  // Handle SIGINT gracefully
  process.on("SIGINT", () => {
    logger.warn("\nPipeline interrupted. Resume with:");
    logger.warn(`  node agent-pipeline/run.mjs --resume ${runDir} "${options.featureRequest}"`);
    process.exit(1);
  });

  // Auto-detect start stage: if resuming, skip stages with existing output
  let startStage = options.startStage || 1;
  const stage1File = join(runDir, "stage1-research.md");
  const stage2File = join(runDir, "stage2-gap-analysis.json");
  const stage3File = join(runDir, "stage3-files-written.json");

  if (options.resumeDir && !options.startStage) {
    if (fileExists(stage3File)) startStage = 4;
    else if (fileExists(stage2File)) startStage = 3;
    else if (fileExists(stage1File)) startStage = 2;
    logger.info(`Resume detected — starting from stage ${startStage}`);
  }

  // ═══════════════════════════════════
  // STAGE 1: Research
  // ═══════════════════════════════════
  let researchOutput: string;

  if (startStage > 1 && fileExists(stage1File)) {
    researchOutput = readFile(stage1File)!;
    logger.info("Stage 1 skipped — using existing research output");
  } else if (options.inputFile) {
    researchOutput = readFile(resolve(process.cwd(), options.inputFile)) || "";
    if (!researchOutput) {
      logger.error(`Input file not found: ${options.inputFile}`);
      process.exit(1);
    }
    saveOutput(runDir, "stage1-research.md", researchOutput);
    logger.info(`Stage 1 skipped — using input file: ${options.inputFile}`);
  } else {
    researchOutput = await runStage1(options.featureRequest);
    saveOutput(runDir, "stage1-research.md", researchOutput);
  }

  // ═══════════════════════════════════
  // STAGE 2: Gap Analysis
  // ═══════════════════════════════════
  let gapAnalysis: GapAnalysis;

  if (startStage > 2 && fileExists(stage2File)) {
    gapAnalysis = JSON.parse(readFile(stage2File)!);
    logger.info("Stage 2 skipped — using existing gap analysis");
  } else {
    gapAnalysis = await runStage2(researchOutput);
    saveOutput(runDir, "stage2-gap-analysis.json", JSON.stringify(gapAnalysis, null, 2));

    // Also save a human-readable plan
    const planMd = formatGapAnalysisPlan(gapAnalysis);
    saveOutput(runDir, "stage2-plan.md", planMd);
  }

  if (options.dryRun || config.DRY_RUN) {
    logger.info("\nDry run — stopping before Stage 3 (code generation)");
    logger.info(`Review the gap analysis at: ${stage2File}`);
    logger.info(`Review the plan at: ${join(runDir, "stage2-plan.md")}`);
    return;
  }

  // ═══════════════════════════════════
  // STAGE 3: Build
  // ═══════════════════════════════════
  let buildResult: BuildResult;

  if (startStage > 3 && fileExists(stage3File)) {
    buildResult = JSON.parse(readFile(stage3File)!);
    logger.info("Stage 3 skipped — using existing build output");
  } else {
    buildResult = await runStage3(gapAnalysis, runDir, featureName);
    saveOutput(runDir, "stage3-files-written.json", JSON.stringify(buildResult, null, 2));
  }

  // ═══════════════════════════════════
  // STAGE 4: Test
  // ═══════════════════════════════════
  let testResult: TestResult | null = null;

  if (options.skipTests) {
    logger.info("Stage 4 skipped — --skip-tests flag");
  } else if (buildResult.gapsCompleted.length === 0) {
    logger.warn("Stage 4 skipped — no gaps were successfully built");
  } else {
    testResult = await runStage4(gapAnalysis, buildResult, runDir, featureName);
    saveOutput(runDir, "stage4-test-results.json", JSON.stringify(testResult, null, 2));

    // Save a human-readable test report
    const testReport = formatTestReport(testResult);
    saveOutput(runDir, "stage4-test-report.md", testReport);
  }

  // ═══════════════════════════════════
  // Summary
  // ═══════════════════════════════════
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  logger.complete({
    gapsCompleted: buildResult.gapsCompleted.length,
    gapsFailed: buildResult.gapsFailed.length,
    filesWritten: buildResult.filesWritten.length,
    commits: buildResult.commits.length,
  });

  if (testResult) {
    logger.info(`Tests: ${testResult.testsPassed} passed, ${testResult.testsFailed} failed across ${testResult.testsSuites} suites`);
    logger.info(`Test files: ${testResult.testFilesWritten.length} written`);
    if (testResult.coverageSummary) {
      logger.info(`Coverage:\n${testResult.coverageSummary}`);
    }
  }

  logger.info(`Total time: ${elapsed} minutes`);
  logger.info(`Outputs saved to: ${runDir}`);

  const allErrors = [...buildResult.errors, ...(testResult?.errors || [])];
  if (allErrors.length > 0) {
    logger.warn("Errors:");
    for (const err of allErrors) {
      logger.error(`  ${err}`);
    }
  }
}

function formatGapAnalysisPlan(analysis: GapAnalysis): string {
  let md = `# Implementation Plan\n\n`;
  md += `## Summary\n${analysis.feature_summary}\n\n`;

  md += `## Current State\n`;
  md += `### Existing Components\n${analysis.current_state.existing_components.map((c) => `- ${c}`).join("\n")}\n\n`;
  md += `### Partial Implementations\n${analysis.current_state.partial_implementations.map((c) => `- ${c}`).join("\n") || "None"}\n\n`;
  md += `### Relevant Patterns\n${analysis.current_state.relevant_patterns.map((c) => `- ${c}`).join("\n")}\n\n`;

  md += `## Gaps (${analysis.gaps.length} total)\n\n`;
  for (const gap of analysis.gaps) {
    md += `### ${gap.id}: ${gap.description}\n`;
    md += `- Category: ${gap.category}\n`;
    md += `- Priority: ${gap.priority}\n`;
    md += `- Complexity: ${gap.estimated_complexity}\n`;
    if (gap.dependencies.length > 0) {
      md += `- Depends on: ${gap.dependencies.join(", ")}\n`;
    }
    md += "\n";
  }

  md += `## Implementation Order\n${analysis.implementation_order.map((id, i) => `${i + 1}. ${id}`).join("\n")}\n\n`;

  if (analysis.new_tables.length > 0) {
    md += `## New Database Tables\n`;
    for (const table of analysis.new_tables) {
      md += `### ${table.name}\n`;
      md += `| Column | Type | Notes |\n|--------|------|-------|\n`;
      for (const col of table.columns) {
        md += `| ${col.name} | ${col.type} | ${col.notes || ""} |\n`;
      }
      md += "\n";
    }
  }

  if (analysis.new_files.length > 0) {
    md += `## New Files\n`;
    for (const f of analysis.new_files) {
      md += `- \`${f.path}\` — ${f.purpose}\n`;
    }
    md += "\n";
  }

  if (analysis.modified_files.length > 0) {
    md += `## Modified Files\n`;
    for (const f of analysis.modified_files) {
      md += `- \`${f.path}\` — ${f.changes}\n`;
    }
  }

  return md;
}

function formatTestReport(testResult: TestResult): string {
  let md = `# Test Report\n\n`;
  md += `## Summary\n`;
  md += `- **Suites:** ${testResult.testsSuites}\n`;
  md += `- **Passed:** ${testResult.testsPassed}\n`;
  md += `- **Failed:** ${testResult.testsFailed}\n`;
  md += `- **Total test files:** ${testResult.testFilesWritten.length}\n\n`;

  if (testResult.coverageSummary) {
    md += `## Coverage\n\`\`\`\n${testResult.coverageSummary}\n\`\`\`\n\n`;
  }

  md += `## Test Files Written\n`;
  for (const f of testResult.testFilesWritten) {
    md += `- \`${f}\`\n`;
  }

  if (testResult.errors.length > 0) {
    md += `\n## Errors\n`;
    for (const err of testResult.errors) {
      md += `- ${err}\n`;
    }
  }

  return md;
}

// CLI argument parsing
function parseArgs(): PipelineOptions {
  const args = process.argv.slice(2);
  const options: PipelineOptions = {
    featureRequest: "",
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.forceRun = true;
    } else if (arg === "--skip-tests") {
      options.skipTests = true;
    } else if (arg === "--stage" && args[i + 1]) {
      options.startStage = parseInt(args[++i], 10);
    } else if (arg === "--resume" && args[i + 1]) {
      options.resumeDir = args[++i];
    } else if (arg === "--input" && args[i + 1]) {
      options.inputFile = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Agent Pipeline — AI-powered feature research, analysis, build, and test

Stages:
  1. Research     — Claude analyzes best-in-market implementations
  2. Gap Analysis — Compare research vs your codebase, identify gaps
  3. Build        — Generate code, write files, verify TypeScript, commit
  4. Test         — Generate comprehensive test suites, run & fix, commit

Usage:
  npx tsx src/pipeline.ts "build offer management"              Full pipeline (all 4 stages)
  npx tsx src/pipeline.ts --dry-run "build offer management"    Stages 1-2 only (no code)
  npx tsx src/pipeline.ts --skip-tests "offer management"       Stages 1-3 (skip tests)
  npx tsx src/pipeline.ts --stage 4 --resume outputs/...        Run only tests on previous build
  npx tsx src/pipeline.ts --resume outputs/2026-03-21-offer-... Resume interrupted run

Options:
  --dry-run         Run stages 1-2 only, skip code generation
  --force           Bypass triage — run full pipeline even for small tasks
  --skip-tests      Run stages 1-3, skip test generation
  --stage N         Start from stage N (1, 2, 3, or 4)
  --resume DIR      Resume from a previous run directory
  --input FILE      Use custom research file for Stage 1
  --help, -h        Show this help
`);
      process.exit(0);
    } else if (!arg.startsWith("--")) {
      options.featureRequest = arg;
    }
  }

  if (!options.featureRequest) {
    console.error('Error: Feature request is required. Example: npx tsx src/pipeline.ts "build offer management"');
    process.exit(1);
  }

  return options;
}

// Entry point
const options = parseArgs();
validateConfig();
runPipeline(options).catch((error) => {
  logger.error(`Pipeline failed: ${error.message}`);
  if (error.stack) logger.debug(error.stack);
  process.exit(1);
});
