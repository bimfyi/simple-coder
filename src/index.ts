import "dotenv/config";
import * as readline from "node:readline/promises";
import { type ModelMessage, stepCountIs, streamText } from "ai";
import { systemPrompt } from "./prompts.js";
import { anthropic } from "./providers.js";
import { tools } from "./tools/index.js";
import { colors } from "./utils.js";

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
      system: systemPrompt,
      model: anthropic("claude-sonnet-4-20250514"),
      messages,
      stopWhen: stepCountIs(Infinity),
      tools,
    });

    process.stdout.write(`\n${colors.green}Assistant: `);

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        process.stdout.write(`${colors.green}${chunk.text}`);
      } else if (chunk.type === "tool-call") {
        const inputStr = JSON.stringify(chunk.input, null);
        const displayInput = inputStr.length > 100 ? `${inputStr.substring(0, 100)}...` : inputStr;
        process.stdout.write(
          `${colors.blue}\n\n[${chunk.toolName}] Tool Call - Input: ${displayInput}\n${colors.reset}`,
        );
      } else if (chunk.type === "tool-result") {
        const outputStr = JSON.stringify(chunk.output, null);
        const displayOutput =
          outputStr.length > 100 ? `${outputStr.substring(0, 100)}...` : outputStr;
        process.stdout.write(
          `${colors.blue}\n\n[${chunk.toolName}] Tool Result - Output: ${displayOutput}\n${colors.reset}`,
        );
      }
    }

    process.stdout.write(`${colors.reset}\n\n`);

    const assistantMessage = await result.response;
    messages.push(...assistantMessage.messages);
  }
}

main().catch(console.error);
