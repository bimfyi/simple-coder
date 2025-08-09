import { resolve } from "node:path";
import { tool } from "ai";
import {
  type ErrorOutput,
  executeCommandInputSchema,
  executeCommandOutputSchema,
} from "./schemas.js";
import {
  checkDangerousPatterns,
  checkWarningPatterns,
  type ExecutionOptions,
  executeShellCommand,
  isSafeCommand,
  parseBaseCommand,
  requestUserApproval,
} from "./utils.js";

export const executeCommand = tool({
  description: "Execute a shell command on the user's machine with safety restrictions",
  inputSchema: executeCommandInputSchema,
  outputSchema: executeCommandOutputSchema,
  execute: async ({ command, cwd, timeout = 30000, env, shell = true }) => {
    const approvalResult = await requestUserApproval(command, cwd, timeout);

    if (!approvalResult.approved) {
      return {
        error: `User denied execution. User feedback: ${approvalResult.userFeedback}`,
        denied: true,
        userFeedback: approvalResult.userFeedback,
      };
    }

    const workingDir = cwd ? resolve(process.cwd(), cwd) : process.cwd();

    const dangerousError = checkDangerousPatterns(command);
    if (dangerousError) {
      const errorResult: ErrorOutput = {
        error: dangerousError,
        command,
        cwd: workingDir,
      };
      return errorResult;
    }

    if (!isSafeCommand(command)) {
      const baseCommand = parseBaseCommand(command);
      const errorResult: ErrorOutput = {
        error: `Command blocked: "${baseCommand}" is not in the safe commands list`,
        command,
        cwd: workingDir,
      };
      return errorResult;
    }

    const warning = checkWarningPatterns(command);
    if (warning) {
      console.warn(`⚠️  ${warning}`);
    }

    const execOptions: ExecutionOptions = {
      cwd: workingDir,
      timeout,
      env: { ...process.env, ...env },
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    };

    if (shell) {
      execOptions.shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
    }

    return await executeShellCommand(command, execOptions);
  },
});
