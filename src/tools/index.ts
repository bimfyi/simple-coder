import type { ToolSet, TypedToolCall, TypedToolResult } from "ai";
import { editFile } from "./editFile/index.js";
import { executeCommand } from "./executeCommand/index.js";
import { listFiles } from "./listFiles/index.js";
import { readFile } from "./readFile/index.js";

export const tools = {
  listFiles,
  readFile,
  editFile,
  executeCommand,
} satisfies ToolSet;

export type CodeAgentToolCall = TypedToolCall<typeof tools>;
export type CodeAgentToolResult = TypedToolResult<typeof tools>;
