#!/usr/bin/env node
import "dotenv/config";
import { type ModelMessage, smoothStream, stepCountIs, streamText } from "ai";
import { systemPrompt } from "./prompts.js";
import { openai } from "./providers.js";
import { terminal } from "./readline.js";
import { tools } from "./tools/index.js";
import { colors } from "./utils.js";

const messages: ModelMessage[] = [];

async function main() {
  while (true) {
    const userInput = await terminal.question("You: ");
    messages.push({ role: "user", content: userInput });

    const result = streamText({
      system: systemPrompt,
      model: openai("gpt-5"),
      stopWhen: stepCountIs(Infinity),
      experimental_transform: smoothStream({
        delayInMs: 20,
        chunking: "word",
      }),
      messages,
      tools,
    });

    process.stdout.write(`\n${colors.purple}Assistant: `);
    let hasStartedText = false;
    const toolCallsInProgress = new Map<string, boolean>();

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-start") {
        hasStartedText = true;
      } else if (chunk.type === "text-delta") {
        if (!hasStartedText) {
          process.stdout.write(`\n`);
          hasStartedText = true;
        }
        process.stdout.write(`${colors.purple}${chunk.text}`);
      } else if (chunk.type === "tool-call") {
        if (!hasStartedText) {
          process.stdout.write(`\n`);
          hasStartedText = true;
        }
        toolCallsInProgress.set(chunk.toolCallId, true);
        const inputStr = JSON.stringify(chunk.input, null);
        const displayInput = inputStr.length > 100 ? `${inputStr.substring(0, 100)}...` : inputStr;
        process.stdout.write(
          `${colors.blue}\n[Tool Call] ${chunk.toolName} called with: ${displayInput}${colors.reset}`,
        );
      } else if (chunk.type === "tool-result") {
        // no dynamic tools here; skip so type inference works later
        if (chunk.dynamic) {
          continue;
        }

        // Don't clear the initial call - show both the call and result
        toolCallsInProgress.delete(chunk.toolCallId);

        // Regular tool-result printing
        const outputStr = JSON.stringify(chunk.output, null);
        const displayOutput =
          outputStr.length > 100 ? `${outputStr.substring(0, 100)}...` : outputStr;
        process.stdout.write(
          `${colors.blue}\n[Tool Call] ${chunk.toolName} succeeded ✓ - returned: ${displayOutput}${colors.reset}\n`,
        );

        // Special diff rendering for editFile
        if (chunk.toolName === "editFile" && chunk.output.ok) {
          const diffLines = chunk.output.diff.unified.split("\n");
          process.stdout.write(`\n`);
          for (const line of diffLines) {
            if (line.startsWith("+")) {
              process.stdout.write(`${colors.green}${line}\n`);
            } else if (line.startsWith("-")) {
              process.stdout.write(`${colors.red}${line}\n`);
            } else if (line.startsWith("@@")) {
              process.stdout.write(`${colors.cyan}${line}\n`);
            } else if (line.startsWith("+++") || line.startsWith("---")) {
              process.stdout.write(`${colors.cyan}${line}\n`);
            } else {
              process.stdout.write(`${colors.gray}${line}\n`);
            }
          }
          process.stdout.write(colors.reset);
        }
      }
    }

    process.stdout.write(`${colors.reset}\n\n`);

    const assistantMessage = await result.response;
    messages.push(...assistantMessage.messages);
  }
}

main().catch(console.error);
