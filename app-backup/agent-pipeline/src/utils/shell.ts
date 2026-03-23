import { execSync } from "child_process";
import { config } from "../config.js";
import { logger } from "../logger.js";

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function run(
  cmd: string,
  options?: { cwd?: string; timeout?: number; silent?: boolean }
): ShellResult {
  const cwd = options?.cwd || config.PROJECT_ROOT;
  const timeout = options?.timeout || 120_000;

  if (!options?.silent) {
    logger.debug(`$ ${cmd}`);
  }

  try {
    const stdout = execSync(cmd, {
      cwd,
      timeout,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { stdout: stdout || "", stderr: "", exitCode: 0 };
  } catch (e: any) {
    return {
      stdout: e.stdout || "",
      stderr: e.stderr || "",
      exitCode: e.status || 1,
    };
  }
}

export function gitAdd(files: string[]): ShellResult {
  return run(`git add ${files.map((f) => `"${f}"`).join(" ")}`);
}

export function gitCommit(message: string): ShellResult {
  return run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
}

export function gitDiffStat(): string {
  const result = run("git diff --stat", { silent: true });
  return result.stdout;
}

export function gitLog(count: number = 10): string {
  const result = run(`git log --oneline -${count}`, { silent: true });
  return result.stdout;
}
