import * as readline from "node:readline/promises";

// Global readline interface that persists across the app
export const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function ask(prompt: string): Promise<string> {
  return terminal.question(prompt);
}
