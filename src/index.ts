import "dotenv/config";
import * as readline from "node:readline/promises";
import { type ModelMessage, streamText } from "ai";
import { anthropic } from "./providers.js";
import { type CodeAgentToolResult, outputHandlers, tools } from "./tools/index.js";

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: ModelMessage[] = [];

async function main() {
  while (true) {
    const userInput = await terminal.question("You: ");
    messages.push({ role: "user", content: userInput });

    const result = streamText({
      system: `You are a helpful assistant. You have access to a tool that can list files in the directory specified. Only use the tool if the user asks for it.`,
      model: anthropic("claude-sonnet-4-20250514"),
      messages,
      tools,
    });

    process.stdout.write("\nAssistant: ");

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        process.stdout.write(chunk.text);
      } else if (chunk.type === "tool-call") {
        process.stdout.write(
          `\n\n[Tool Call: ${chunk.toolName}] - Input: ${JSON.stringify(chunk.input)}\n`,
        );
      } else if (chunk.type === "tool-result") {
        const toolResult = chunk as CodeAgentToolResult;
        if (!toolResult.dynamic) {
          outputHandlers[toolResult.toolName](toolResult.output);
        }
      }
    }

    process.stdout.write("\n\n");

    const assistantMessage = await result.response;
    messages.push(...assistantMessage.messages);
  }
}

main().catch(console.error);
