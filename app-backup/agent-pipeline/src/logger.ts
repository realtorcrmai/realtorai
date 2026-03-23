import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

export class Logger {
  private logFile: string | null = null;

  setLogFile(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.logFile = path;
  }

  private write(level: string, color: string, message: string) {
    const timestamp = new Date().toISOString().substring(11, 19);
    const terminal = `${COLORS.dim}${timestamp}${COLORS.reset} ${color}${level}${COLORS.reset} ${message}`;
    const file = `${timestamp} [${level}] ${message}`;

    console.log(terminal);
    if (this.logFile) {
      appendFileSync(this.logFile, file + "\n");
    }
  }

  info(message: string) {
    this.write("INFO", COLORS.blue, message);
  }

  step(message: string) {
    this.write("STEP", COLORS.cyan, `  → ${message}`);
  }

  success(message: string) {
    this.write(" OK ", COLORS.green, `✓ ${message}`);
  }

  warn(message: string) {
    this.write("WARN", COLORS.yellow, `⚠ ${message}`);
  }

  error(message: string) {
    this.write(" ERR", COLORS.red, `✗ ${message}`);
  }

  debug(message: string) {
    if (process.env.DEBUG) {
      this.write("DBG ", COLORS.dim, message);
    }
  }

  stage(num: number, total: number, name: string) {
    const bar = "═".repeat(50);
    console.log("");
    console.log(`${COLORS.bgBlue}${COLORS.white}${COLORS.bold} STAGE ${num}/${total}: ${name.toUpperCase()} ${COLORS.reset}`);
    console.log(`${COLORS.blue}${bar}${COLORS.reset}`);
    console.log("");
    if (this.logFile) {
      appendFileSync(this.logFile, `\n=== STAGE ${num}/${total}: ${name} ===\n\n`);
    }
  }

  complete(summary: { gapsCompleted: number; gapsFailed: number; filesWritten: number; commits: number }) {
    const bar = "═".repeat(50);
    console.log("");
    console.log(`${COLORS.bgCyan}${COLORS.white}${COLORS.bold} PIPELINE COMPLETE ${COLORS.reset}`);
    console.log(`${COLORS.cyan}${bar}${COLORS.reset}`);
    console.log(`  ${COLORS.green}✓ Gaps completed:${COLORS.reset} ${summary.gapsCompleted}`);
    if (summary.gapsFailed > 0) {
      console.log(`  ${COLORS.red}✗ Gaps failed:${COLORS.reset}    ${summary.gapsFailed}`);
    }
    console.log(`  ${COLORS.blue}📄 Files written:${COLORS.reset}  ${summary.filesWritten}`);
    console.log(`  ${COLORS.magenta}📦 Commits:${COLORS.reset}       ${summary.commits}`);
    console.log("");
  }
}

export const logger = new Logger();
