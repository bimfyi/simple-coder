import { type ExecOptions, exec } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { tool } from "ai";
import { ask } from "../../readline.js";
import { colors } from "../../utils.js";
import {
  type ErrorOutput,
  executeCommandInputSchema,
  executeCommandOutputSchema,
  type SuccessOutput,
} from "./schemas.js";

const execAsync = promisify(exec);

// Patterns that are always dangerous
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\/(?:\s|$)/, // rm -rf /
  /rm\s+-rf\s+\/\*/, // rm -rf /*
  /dd\s+if=\/dev\/(?:zero|random|urandom)\s+of=\//, // dd overwriting system files
  /mkfs\./, // format filesystem
  /:\(\)\{:\|:&\};:/, // fork bomb
  /chmod\s+-R\s+000\s+\//, // remove all permissions from root
  />\s*\/dev\/(?:sda|hda|nvme)/, // overwrite disk
  /\bsudo\s+/, // sudo commands should be explicit
];

// Commands that are generally safe for development
const SAFE_COMMANDS = new Set([
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

/**
 * Tool for executing shell commands safely on the user's machine.
 * Includes security safeguards and command validation.
 */
export const executeCommand = tool({
  description: "Execute a shell command on the user's machine with safety restrictions",
  inputSchema: executeCommandInputSchema,
  outputSchema: executeCommandOutputSchema,
  execute: async ({ command, cwd, timeout = 30000, env, shell = true }) => {
    // Check for auto-approval first
    const safeReadOnlyCommands = ["pwd", "whoami", "date"];
    const trimmedCommand = command.trim();
    const baseCommand = trimmedCommand.split(" ")[0];

    // Only auto-approve if it's a simple command with no arguments
    const isAutoApproved =
      trimmedCommand === baseCommand && safeReadOnlyCommands.includes(baseCommand);

    if (!isAutoApproved) {
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

      if (!approved) {
        return {
          error: `User denied execution. User feedback: ${response}`,
          denied: true,
          userFeedback: response,
        };
      }
    } else {
      console.log(`\n${colors.green}✓ Auto-approved safe command: ${command}${colors.reset}`);
    }

    const startTime = Date.now();
    const workingDir = cwd ? resolve(process.cwd(), cwd) : process.cwd();

    try {
      // Security check: block dangerous patterns
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(command)) {
          const errorResult: ErrorOutput = {
            error: `Command blocked: contains dangerous pattern`,
            command,
            cwd: workingDir,
          };
          return errorResult;
        }
      }

      // Parse command to extract the base command
      // Handle cases like: "npm run build", "./script.sh", "/usr/bin/node"
      const trimmedCommand = command.trim();
      let baseCommand = "";

      // Extract first command, handling quotes and paths
      const match = trimmedCommand.match(/^(?:(?:\.\/|\/)?[\w\-/]+\/)?(\w+)/);
      if (match?.[1]) {
        baseCommand = match[1];
      }

      // Check if it's a safe command
      if (!SAFE_COMMANDS.has(baseCommand)) {
        // Special cases: allow npm/yarn/pnpm with any subcommand
        const packageManagers = ["npm", "yarn", "pnpm", "bun"];
        const isPackageManagerCommand = packageManagers.some((pm) =>
          trimmedCommand.startsWith(`${pm} `),
        );

        if (!isPackageManagerCommand) {
          const errorResult: ErrorOutput = {
            error: `Command blocked: "${baseCommand}" is not in the safe commands list`,
            command,
            cwd: workingDir,
          };
          return errorResult;
        }
      }

      // Additional check: warn about potentially destructive operations
      const warningPatterns = [
        /rm\s+-rf?\s+\./, // rm -rf .
        /git\s+reset\s+--hard/, // git reset --hard
        /git\s+clean\s+-fd/, // git clean -fd
      ];

      for (const pattern of warningPatterns) {
        if (pattern.test(command)) {
          console.warn(`⚠️  Executing potentially destructive command: ${command}`);
          break;
        }
      }

      // Execute the command with timeout
      const execOptions: ExecOptions = {
        cwd: workingDir,
        timeout,
        env: { ...process.env, ...env },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      };

      // Set shell option - true uses default shell, false means no shell
      if (shell) {
        execOptions.shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
      }

      const { stdout, stderr } = await execAsync(command, execOptions);

      const executionTime = Date.now() - startTime;

      const result: SuccessOutput = {
        command,
        stdout: stdout || "",
        stderr: stderr || "",
        exitCode: 0,
        executionTime,
        cwd: workingDir,
      };

      return result;
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;

      // Type guard for exec errors with better typing
      interface ExecError extends Error {
        code?: string | number;
        stdout?: string;
        stderr?: string;
        signal?: NodeJS.Signals;
        killed?: boolean;
      }

      const isExecError = (err: unknown): err is ExecError => {
        return err instanceof Error;
      };

      if (!isExecError(error)) {
        const errorResult: ErrorOutput = {
          error: String(error),
          command,
          cwd: workingDir,
        };
        return errorResult;
      }

      // Handle timeout
      if (error.killed && error.signal === "SIGTERM") {
        const errorResult: ErrorOutput = {
          error: `Command timed out after ${timeout}ms`,
          command,
          stderr: error.stderr,
          cwd: workingDir,
        };
        return errorResult;
      }

      // Handle command not found
      if (error.code === "ENOENT") {
        const errorResult: ErrorOutput = {
          error: `Command not found: ${command.split(" ")[0]}`,
          command,
          cwd: workingDir,
        };
        return errorResult;
      }

      // Handle non-zero exit codes (not really an error, just non-zero exit)
      if (typeof error.code === "number") {
        const result: SuccessOutput = {
          command,
          stdout: error.stdout || "",
          stderr: error.stderr || "",
          exitCode: error.code,
          executionTime,
          cwd: workingDir,
        };
        return result;
      }

      // Handle other errors
      const errorResult: ErrorOutput = {
        error: error.message,
        command,
        stderr: error.stderr,
        exitCode: typeof error.code === "number" ? error.code : undefined,
        cwd: workingDir,
      };

      return errorResult;
    }
  },
});
