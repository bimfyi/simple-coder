import type { TypedToolCall, TypedToolResult } from "ai";
import { listFiles } from "./listFiles/index.js";
import { readFile } from "./readFile/index.js";

export const tools = {
  listFiles,
  readFile,
};

export type CodeAgentToolCall = TypedToolCall<typeof tools>;
export type CodeAgentToolResult = TypedToolResult<typeof tools>;
