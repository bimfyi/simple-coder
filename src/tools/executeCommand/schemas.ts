import { z } from "zod";

const successOutputSchema = z.object({
  command: z.string().describe("The executed command"),
  stdout: z.string().describe("Standard output from the command"),
  stderr: z.string().describe("Standard error output from the command"),
  exitCode: z.number().describe("Exit code of the command"),
  executionTime: z.number().describe("Execution time in milliseconds"),
  cwd: z.string().describe("Working directory where command was executed"),
});

const errorOutputSchema = z.object({
  error: z.string().describe("Error message"),
  command: z.string().describe("The command that failed"),
  stderr: z.string().optional().describe("Standard error if available"),
  exitCode: z.number().optional().describe("Exit code if available"),
  cwd: z.string().describe("Working directory where command was attempted"),
});

const denialOutputSchema = z.object({
  error: z.string().describe("Error message indicating denial"),
  denied: z.literal(true).describe("Indicates user denied execution"),
  userFeedback: z.string().describe("User's alternative instructions or feedback"),
});

export const executeCommandInputSchema = z.object({
  command: z.string().describe("Shell command to execute"),
  cwd: z
    .string()
    .optional()
    .describe("Working directory for command execution (relative to project root)"),
  timeout: z
    .number()
    .positive()
    .optional()
    .default(30000)
    .describe("Command timeout in milliseconds (default: 30000)"),
  env: z.record(z.string()).optional().describe("Additional environment variables for the command"),
  shell: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to run command in a shell (default: true)"),
});

export const executeCommandOutputSchema = z.union([
  successOutputSchema,
  errorOutputSchema,
  denialOutputSchema,
]);

export type SuccessOutput = z.infer<typeof successOutputSchema>;
export type ErrorOutput = z.infer<typeof errorOutputSchema>;
export type DenialOutput = z.infer<typeof denialOutputSchema>;
export type ExecuteCommandOutput = z.infer<typeof executeCommandOutputSchema>;
