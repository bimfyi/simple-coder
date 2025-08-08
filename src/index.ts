import "dotenv/config";
import * as readline from "node:readline/promises";
import { type ModelMessage, smoothStream, stepCountIs, streamText } from "ai";
import { systemPrompt } from "./prompts.js";
import { openai } from "./providers.js";
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
      model: openai("gpt-5"),
      stopWhen: stepCountIs(Infinity),
      experimental_transform: smoothStream({
        delayInMs: 20,
        chunking: "word",
      }),
      messages,
      tools,
    });

    process.stdout.write(`\n${colors.green}Assistant: `);

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-start") {
        process.stdout.write(`${colors.green}\n`);
      } else if (chunk.type === "text-delta") {
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

        // Special diff rendering for editFile
        if (
          chunk.toolName === "editFile" &&
          chunk.output &&
          typeof (chunk.output as { ok?: boolean })?.ok === "boolean" &&
          (chunk.output as { ok: boolean }).ok
        ) {
          const unified: string | undefined = (chunk.output as { diff?: { unified?: string } })
            ?.diff?.unified;
          if (unified) {
            const diffLines = unified.split("\n");
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
    }

    process.stdout.write(`${colors.reset}\n\n`);

    const assistantMessage = await result.response;
    messages.push(...assistantMessage.messages);
  }
}

main().catch(console.error);
