import { type ExecOptions, exec } from "node:child_process";
import { promisify } from "node:util";
import { ask } from "../../readline.js";
import { colors } from "../../utils.js";
import type { ErrorOutput, SuccessOutput } from "./schemas.js";

const execAsync = promisify(exec);

export const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\/(?:\s|$)/, // rm -rf /
  /rm\s+-rf\s+\/\*/, // rm -rf /*
  /dd\s+if=\/dev\/(?:zero|random|urandom)\s+of=\//, // dd overwriting system files
  /mkfs\./, // format filesystem
  /:\(\)\s*\{\s*:\|:&\s*\};:/, // fork bomb (with optional spaces)
  /chmod\s+-R\s+000\s+\//, // remove all permissions from root
  />\s*\/dev\/(?:sda|hda|nvme)/, // overwrite disk
  /\bsudo\s+/, // sudo commands should be explicit
];

export const SAFE_COMMANDS = new Set([
  // File operations
  "ls",
  "pwd",
  "cd",
  "cat",
  "head",
  "tail",
  "less",
  "more",
  "cp",
  "mv",
  "rm",
  "mkdir",
  "rmdir",
  "touch",
  "find",
  "grep",
  "sed",
  "awk",
  "cut",
  "sort",
  "uniq",
  "wc",
  "tr",
  "diff",
  "patch",
  "tar",
  "zip",
  "unzip",
  "gzip",
  "gunzip",

  // Development tools
  "node",
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "bun",
  "deno",
  "python",
  "python3",
  "pip",
  "pip3",
  "pipenv",
  "poetry",
  "ruby",
  "gem",
  "bundle",
  "rails",
  "go",
  "cargo",
  "rustc",
  "java",
  "javac",
  "mvn",
  "gradle",
  "gcc",
  "g++",
  "clang",
  "make",
  "cmake",
  "git",
  "gh",
  "hg",
  "svn",
  "docker",
  "docker-compose",
  "kubectl",
  "tsc",
  "tsx",
  "eslint",
  "prettier",
  "jest",
  "vitest",
  "pytest",

  // System info
  "echo",
  "date",
  "whoami",
  "hostname",
  "uname",
  "which",
  "type",
  "ps",
  "top",
  "df",
  "du",
  "free",
  "env",
  "printenv",

  // Network (read-only)
  "ping",
  "nslookup",
  "dig",
  "host",
  "netstat",
  "ss",

  // Text processing
  "jq",
  "yq",
  "xmllint",
  "base64",
]);

export const WARNING_PATTERNS = [
  /rm\s+-rf?\s+\./, // rm -rf .
  /git\s+reset\s+--hard/, // git reset --hard
  /git\s+clean\s+-fd/, // git clean -fd
];

export const AUTO_APPROVED_COMMANDS = ["pwd", "whoami", "date"];

export interface ExecError extends Error {
  code?: string | number;
  stdout?: string;
  stderr?: string;
  signal?: NodeJS.Signals;
  killed?: boolean;
}

export interface ExecutionOptions extends Omit<ExecOptions, "shell"> {
  cwd: string;
  timeout: number;
  env: NodeJS.ProcessEnv;
  maxBuffer: number;
  shell?: string | boolean;
}

export interface ApprovalResult {
  approved: boolean;
  userFeedback?: string;
}

export function isExecError(err: unknown): err is ExecError {
  return err instanceof Error;
}

/**
 * Check if a command contains dangerous patterns
 */
export function checkDangerousPatterns(command: string): string | null {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return "Command blocked: contains dangerous pattern";
    }
  }
  return null;
}

/**
 * Check if a command should trigger a warning
 */
export function checkWarningPatterns(command: string): string | null {
  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(command)) {
      return `Executing potentially destructive command: ${command}`;
    }
  }
  return null;
}

/**
 * Parse and extract the base command from a command string
 */
export function parseBaseCommand(command: string): string {
  const trimmedCommand = command.trim();

  // Handle various command formats:
  // 1. Simple commands: ls, pwd, git
  // 2. Commands with paths: /usr/bin/node, ./script.sh
  // 3. Don't match pure numbers or flags

  // First try to match executable paths
  if (trimmedCommand.startsWith("./")) {
    // Extract filename from ./path/to/script.sh -> script
    const match = trimmedCommand.match(/^\.\/(?:.*\/)?([^/\s]+?)(?:\.\w+)?(?:\s|$)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  if (trimmedCommand.startsWith("/")) {
    // Extract command from absolute paths: /usr/bin/node -> node
    const match = trimmedCommand.match(/^\/(?:.*\/)?([^/\s]+?)(?:\s|$)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  // Otherwise match simple commands (must start with letter)
  const match = trimmedCommand.match(/^([a-zA-Z][\w-]*)/);
  return match?.[1] || "";
}

/**
 * Check if a command is in the safe commands list
 */
export function isSafeCommand(command: string): boolean {
  const baseCommand = parseBaseCommand(command);

  if (SAFE_COMMANDS.has(baseCommand)) {
    return true;
  }

  const packageManagers = ["npm", "yarn", "pnpm", "bun"];
  const trimmedCommand = command.trim();
  return packageManagers.some((pm) => trimmedCommand.startsWith(`${pm} `));
}

/**
 * Check if a command should be auto-approved
 */
export function isAutoApproved(command: string): boolean {
  const trimmedCommand = command.trim();
  const baseCommand = trimmedCommand.split(" ")[0];

  // Only auto-approve if it's a simple command with no arguments
  return trimmedCommand === baseCommand && AUTO_APPROVED_COMMANDS.includes(baseCommand);
}

/**
 * Prompt user for command execution approval
 */
export async function requestUserApproval(
  command: string,
  cwd?: string,
  timeout?: number,
): Promise<ApprovalResult> {
  // Check for auto-approval first
  if (isAutoApproved(command)) {
    console.log(`\n${colors.green}✓ Auto-approved safe command: ${command}${colors.reset}`);
    return { approved: true };
  }

  const commandDisplay = command.length > 80 ? `${command.substring(0, 77)}...` : command;

  const promptMsg =
    `\n${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n` +
    `${colors.yellow}⚠️  Permission Required${colors.reset}\n` +
    `${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n\n` +
    `SimpleCoder wants to execute:\n` +
    `  ${colors.cyan}Command:${colors.reset} ${colors.bold}${commandDisplay}${colors.reset}\n` +
    `  ${colors.cyan}Directory:${colors.reset} ${cwd || "current directory"}\n` +
    `  ${colors.cyan}Timeout:${colors.reset} ${timeout}ms\n\n` +
    `${colors.green}Enter 'y' to allow${colors.reset} or ${colors.yellow}provide alternative instructions:${colors.reset} `;

  const response = await ask(promptMsg);
  const approved = response.toLowerCase() === "y" || response.toLowerCase() === "yes";

  return {
    approved,
    userFeedback: response,
  };
}

/**
 * Handle execution errors and format appropriate error response
 */
function handleExecutionError(
  error: unknown,
  command: string,
  cwd: string,
  timeout: number,
  startTime: number,
): ErrorOutput | SuccessOutput {
  const executionTime = Date.now() - startTime;

  if (!isExecError(error)) {
    return {
      error: String(error),
      command,
      cwd,
    };
  }

  if (error.killed && error.signal === "SIGTERM") {
    return {
      error: `Command timed out after ${timeout}ms`,
      command,
      stderr: error.stderr,
      cwd,
    };
  }

  if (error.code === "ENOENT") {
    return {
      error: `Command not found: ${command.split(" ")[0]}`,
      command,
      cwd,
    };
  }

  if (typeof error.code === "number") {
    return {
      command,
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      exitCode: error.code,
      executionTime,
      cwd,
    };
  }

  return {
    error: error.message,
    command,
    stderr: error.stderr,
    exitCode: typeof error.code === "number" ? error.code : undefined,
    cwd,
  };
}

/**
 * Execute a shell command with the given options
 */
export async function executeShellCommand(
  command: string,
  options: ExecutionOptions,
): Promise<SuccessOutput | ErrorOutput> {
  const startTime = Date.now();

  const execOptions: ExecOptions = {
    cwd: options.cwd,
    timeout: options.timeout,
    env: options.env,
    maxBuffer: options.maxBuffer,
  };

  if (options.shell) {
    execOptions.shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
  }

  try {
    const { stdout, stderr } = await execAsync(command, execOptions);
    const executionTime = Date.now() - startTime;

    return {
      command,
      stdout: stdout || "",
      stderr: stderr || "",
      exitCode: 0,
      executionTime,
      cwd: options.cwd,
    };
  } catch (error: unknown) {
    return handleExecutionError(error, command, options.cwd, options.timeout ?? 30000, startTime);
  }
}
