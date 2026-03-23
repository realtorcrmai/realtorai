import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  readdirSync,
  statSync,
} from "fs";
import { dirname, join, relative } from "path";
import { logger } from "../logger.js";

export function readFile(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

export function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
  logger.debug(`Wrote ${path}`);
}

export function backupFile(filePath: string, backupDir: string): void {
  if (!existsSync(filePath)) return;
  const relPath = relative(process.cwd(), filePath);
  const backupPath = join(backupDir, relPath);
  mkdirSync(dirname(backupPath), { recursive: true });
  copyFileSync(filePath, backupPath);
  logger.debug(`Backed up ${relPath}`);
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function listDirectory(dir: string, maxDepth: number = 2, currentDepth: number = 0): string {
  if (!existsSync(dir)) return "";
  const indent = "  ".repeat(currentDepth);
  const lines: string[] = [];

  try {
    const entries = readdirSync(dir).sort();
    for (const entry of entries) {
      // Skip hidden dirs, node_modules, .next, dist
      if (entry.startsWith(".") || entry === "node_modules" || entry === ".next" || entry === "dist") {
        continue;
      }

      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          lines.push(`${indent}${entry}/`);
          if (currentDepth < maxDepth) {
            lines.push(listDirectory(fullPath, maxDepth, currentDepth + 1));
          }
        } else {
          lines.push(`${indent}${entry}`);
        }
      } catch {
        // Skip inaccessible entries
      }
    }
  } catch {
    // Skip inaccessible dirs
  }

  return lines.filter(Boolean).join("\n");
}
