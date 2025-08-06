import type { InferToolOutput, TypedToolCall, TypedToolResult } from "ai";
import { handleListFileOutput, listFiles } from "./listFiles/index.js";

export const tools = {
  listFiles,
};

export const outputHandlers: Record<
  keyof typeof tools,
  (output: InferToolOutput<(typeof tools)[keyof typeof tools]>) => void
> = {
  listFiles: handleListFileOutput,
};

export type CodeAgentToolCall = TypedToolCall<typeof tools>;
export type CodeAgentToolResult = TypedToolResult<typeof tools>;
