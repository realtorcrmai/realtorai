import { join } from "path";
import { config } from "./config.js";
import { readFile, listDirectory, fileExists } from "./utils/fs-tools.js";
import { gitDiffStat, gitLog } from "./utils/shell.js";
import { logger } from "./logger.js";

export interface CodebaseSnapshot {
  projectDescription: string;
  directoryTree: string;
  dependencies: string;
  databaseTypes: string;
  migrations: string;
  gitStatus: string;
  recentCommits: string;
}

export async function readCodebase(): Promise<CodebaseSnapshot> {
  const root = config.PROJECT_ROOT;
  logger.step("Reading codebase snapshot...");

  // 1. Read CLAUDE.md (primary intelligence source)
  let projectDescription = readFile(join(root, "CLAUDE.md")) || "";
  if (!projectDescription) {
    // Fallback to README.md
    projectDescription = readFile(join(root, "README.md")) || "No project description found.";
    logger.warn("No CLAUDE.md found, using README.md");
  }
  // Truncate if too long (keep under ~10k tokens)
  if (projectDescription.length > 15000) {
    projectDescription = projectDescription.substring(0, 15000) + "\n\n[... truncated ...]";
  }

  // 2. Directory tree
  const srcDir = join(root, "src");
  const directoryTree = fileExists(srcDir)
    ? listDirectory(srcDir, 2)
    : listDirectory(root, 1);

  // 3. Package.json dependencies
  let dependencies = "";
  const pkgJson = readFile(join(root, "package.json"));
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      dependencies = Object.entries(deps)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
    } catch {
      dependencies = "Could not parse package.json";
    }
  }

  // 4. Database types
  let databaseTypes = "";
  const typesPaths = [
    join(root, "src/types/database.ts"),
    join(root, "src/types/index.ts"),
    join(root, "src/types.ts"),
  ];
  for (const p of typesPaths) {
    const content = readFile(p);
    if (content) {
      databaseTypes += `// ${p}\n${content}\n`;
      if (databaseTypes.length > 8000) {
        databaseTypes = databaseTypes.substring(0, 8000) + "\n// [truncated]";
        break;
      }
    }
  }

  // 5. Migration file names
  let migrations = "";
  const migrationsDir = join(root, "supabase/migrations");
  if (fileExists(migrationsDir)) {
    migrations = listDirectory(migrationsDir, 0);
  }

  // 6. Git status
  const gitStatus = gitDiffStat();

  // 7. Recent commits
  const recentCommits = gitLog(10);

  logger.success("Codebase snapshot ready");

  return {
    projectDescription,
    directoryTree,
    dependencies,
    databaseTypes,
    migrations,
    gitStatus,
    recentCommits,
  };
}

export function formatSnapshot(snapshot: CodebaseSnapshot): string {
  return `# Current Codebase State

## Project Description (from CLAUDE.md)
${snapshot.projectDescription}

## Directory Structure (src/)
\`\`\`
${snapshot.directoryTree}
\`\`\`

## Dependencies
\`\`\`
${snapshot.dependencies}
\`\`\`

## Database Types
\`\`\`typescript
${snapshot.databaseTypes}
\`\`\`

## Migrations
\`\`\`
${snapshot.migrations}
\`\`\`

## Uncommitted Changes
\`\`\`
${snapshot.gitStatus || "Clean working tree"}
\`\`\`

## Recent Commits
\`\`\`
${snapshot.recentCommits}
\`\`\``;
}
