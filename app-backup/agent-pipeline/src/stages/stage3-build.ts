import { join } from "path";
import { askClaude } from "../clients/claude.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { readFile, writeFile, backupFile } from "../utils/fs-tools.js";
import { run, gitAdd, gitCommit } from "../utils/shell.js";
import { formatSnapshot, readCodebase } from "../codebase-reader.js";
import type { GapAnalysis } from "./stage2-gap-analysis.js";

export interface BuildResult {
  gapsCompleted: string[];
  gapsFailed: string[];
  filesWritten: string[];
  filesModified: string[];
  commits: string[];
  errors: string[];
}

const CODE_GEN_SYSTEM = `You are a senior full-stack developer implementing features for a Next.js real estate CRM.

CRITICAL RULES:
1. Follow the project's existing conventions EXACTLY (from CLAUDE.md provided below)
2. Use server actions (not API routes) for mutations
3. Use Zod for validation
4. Use the lf-* CSS design system classes
5. Use emoji icons (not Lucide) on pages
6. Use TypeScript with strict typing
7. Use the existing Supabase admin client pattern for server-side DB operations
8. Path alias: @/ maps to src/

OUTPUT FORMAT:
For each file you create or modify, output it in this exact format:

=== FILE: path/relative/to/project/root.ts ===
[complete file content — do not use placeholders or "..." — write the FULL file]
=== END FILE ===

If modifying an existing file, output the COMPLETE new version of the file (not a diff).
Include ALL files needed for this gap — migrations, server actions, components, types.`;

interface FileBlock {
  path: string;
  content: string;
}

function parseFileBlocks(response: string): FileBlock[] {
  const blocks: FileBlock[] = [];
  const regex = /=== FILE: (.+?) ===\n([\s\S]*?)\n=== END FILE ===/g;
  let match;

  while ((match = regex.exec(response)) !== null) {
    blocks.push({
      path: match[1].trim(),
      content: match[2],
    });
  }

  return blocks;
}

async function buildGap(
  gap: { id: string; description: string; category: string },
  gapAnalysis: GapAnalysis,
  backupDir: string,
  featureName: string
): Promise<{ files: FileBlock[]; success: boolean; error?: string }> {
  const root = config.PROJECT_ROOT;

  // Gather context: read files that are relevant to this gap
  const relevantFiles: string[] = [];
  for (const f of gapAnalysis.modified_files) {
    if (gapAnalysis.implementation_order.indexOf(gap.id) >= 0) {
      relevantFiles.push(f.path);
    }
  }
  // Also read any files in current_state that are related
  for (const f of gapAnalysis.current_state.existing_components) {
    relevantFiles.push(f);
  }

  // Deduplicate and read file contents
  const uniqueFiles = [...new Set(relevantFiles)];
  const fileContents: string[] = [];
  for (const filePath of uniqueFiles.slice(0, 10)) {
    // Max 10 files to avoid context overflow
    const fullPath = join(root, filePath);
    const content = readFile(fullPath);
    if (content) {
      fileContents.push(`--- ${filePath} ---\n${content.substring(0, 5000)}\n--- end ---`);
    }
  }

  // Read codebase snapshot for conventions
  const snapshot = await readCodebase();

  const userPrompt = `## Task
Implement gap "${gap.id}": ${gap.description}
Category: ${gap.category}

## Feature Context
${gapAnalysis.feature_summary}

## Database Schema (if new tables needed)
${JSON.stringify(gapAnalysis.new_tables, null, 2)}

## Files to Create
${gapAnalysis.new_files
  .filter((f) => {
    // Find files relevant to this gap based on description overlap
    return true; // Include all for context
  })
  .map((f) => `- ${f.path}: ${f.purpose}`)
  .join("\n")}

## Files to Modify
${gapAnalysis.modified_files.map((f) => `- ${f.path}: ${f.changes}`).join("\n")}

## Existing File Contents
${fileContents.join("\n\n")}

## Project Conventions (from CLAUDE.md)
${snapshot.projectDescription.substring(0, 8000)}

## Instructions
1. Implement ONLY what's needed for gap "${gap.id}": ${gap.description}
2. Output complete file contents using the === FILE: path === format
3. Do NOT include files that aren't changed by this specific gap
4. Write production-quality code, not stubs
5. Include proper TypeScript types
6. Follow existing patterns in the codebase`;

  logger.step(`Generating code for ${gap.id}...`);

  const response = await askClaude(CODE_GEN_SYSTEM, userPrompt, {
    model: config.CLAUDE_BUILD_MODEL,
    extendedThinking: true,
    maxTokens: 16000,
    thinkingBudget: config.EXTENDED_THINKING_BUDGET,
  });

  const files = parseFileBlocks(response);

  if (files.length === 0) {
    logger.warn(`No file blocks found in Claude's response for ${gap.id}`);
    return { files: [], success: false, error: "No file blocks in response" };
  }

  // Backup and write files
  for (const file of files) {
    const fullPath = join(root, file.path);
    backupFile(fullPath, backupDir);
    writeFile(fullPath, file.content);
  }

  logger.step(`Wrote ${files.length} files, verifying build...`);

  // Verify build
  const buildResult = run(config.BUILD_COMMAND, { timeout: 180_000 });

  if (buildResult.exitCode === 0) {
    logger.success(`Build passed for ${gap.id}`);
    return { files, success: true };
  }

  // Build failed — try to fix
  logger.warn(`Build failed for ${gap.id}, attempting fix...`);
  const maxFixes = 3;

  for (let fixAttempt = 1; fixAttempt <= maxFixes; fixAttempt++) {
    logger.step(`Fix attempt ${fixAttempt}/${maxFixes}...`);

    const errorOutput = (buildResult.stderr + "\n" + buildResult.stdout).substring(0, 4000);

    const fixPrompt = `The code you generated for gap "${gap.id}" has build errors:

\`\`\`
${errorOutput}
\`\`\`

Files you wrote:
${files.map((f) => f.path).join("\n")}

Fix the errors. Output ONLY the files that need changes using the === FILE: path === format.
Do NOT change files that don't have errors.`;

    const fixResponse = await askClaude(CODE_GEN_SYSTEM, fixPrompt, {
      model: config.CLAUDE_BUILD_MODEL,
      extendedThinking: false, // Speed over depth for fixes
      maxTokens: 12000,
    });

    const fixFiles = parseFileBlocks(fixResponse);
    if (fixFiles.length === 0) continue;

    // Write fixed files
    for (const file of fixFiles) {
      const fullPath = join(root, file.path);
      writeFile(fullPath, file.content);
      // Update our files list
      const existingIdx = files.findIndex((f) => f.path === file.path);
      if (existingIdx >= 0) {
        files[existingIdx] = file;
      } else {
        files.push(file);
      }
    }

    // Re-check build
    const rebuildResult = run(config.BUILD_COMMAND, { timeout: 180_000 });
    if (rebuildResult.exitCode === 0) {
      logger.success(`Build fixed on attempt ${fixAttempt}`);
      return { files, success: true };
    }
  }

  return {
    files,
    success: false,
    error: `Build still failing after ${maxFixes} fix attempts`,
  };
}

export async function runStage3(
  gapAnalysis: GapAnalysis,
  runDir: string,
  featureName: string
): Promise<BuildResult> {
  logger.stage(3, 4, "Build");

  const backupDir = join(runDir, "backups");
  const result: BuildResult = {
    gapsCompleted: [],
    gapsFailed: [],
    filesWritten: [],
    filesModified: [],
    commits: [],
    errors: [],
  };

  const totalGaps = gapAnalysis.implementation_order.length;
  logger.info(`Processing ${totalGaps} gaps in order...`);

  for (let i = 0; i < gapAnalysis.implementation_order.length; i++) {
    const gapId = gapAnalysis.implementation_order[i];
    const gap = gapAnalysis.gaps.find((g) => g.id === gapId);

    if (!gap) {
      logger.warn(`Gap ${gapId} not found in gaps array, skipping`);
      continue;
    }

    logger.info(`\n[${i + 1}/${totalGaps}] ${gap.id}: ${gap.description}`);
    logger.info(`  Category: ${gap.category} | Priority: ${gap.priority} | Complexity: ${gap.estimated_complexity}`);

    if (config.DRY_RUN) {
      logger.info(`  [DRY RUN] Would build: ${gap.description}`);
      result.gapsCompleted.push(gapId);
      continue;
    }

    try {
      const buildOutput = await buildGap(gap, gapAnalysis, backupDir, featureName);

      if (buildOutput.success) {
        // Collect file paths
        const newFilePaths = buildOutput.files.map((f) => f.path);
        result.filesWritten.push(...newFilePaths);

        // Git commit
        gitAdd(newFilePaths);
        const commitMsg = `feat(${featureName}): ${gap.description}`;
        const commitResult = gitCommit(commitMsg);

        if (commitResult.exitCode === 0) {
          // Extract commit hash
          const hashMatch = commitResult.stdout.match(/\[[\w-]+ ([a-f0-9]+)\]/);
          if (hashMatch) result.commits.push(hashMatch[1]);
          logger.success(`Committed: ${commitMsg}`);
        } else {
          logger.warn(`Git commit failed: ${commitResult.stderr}`);
        }

        result.gapsCompleted.push(gapId);
      } else {
        result.gapsFailed.push(gapId);
        result.errors.push(`${gapId}: ${buildOutput.error}`);
        logger.error(`Failed: ${gap.id} — ${buildOutput.error}`);
      }
    } catch (error: any) {
      result.gapsFailed.push(gapId);
      result.errors.push(`${gapId}: ${error.message}`);
      logger.error(`Exception in ${gap.id}: ${error.message}`);
    }
  }

  return result;
}
