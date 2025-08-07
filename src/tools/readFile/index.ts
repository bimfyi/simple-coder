import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { tool } from "ai";
import { type ErrorOutput, readFileInputSchema, readFileOutputSchema } from "./schemas.js";

/**
 * Tool for reading file contents from the filesystem.
 */
export const readFile = tool({
  description: "Read the contents of a file from the filesystem",
  inputSchema: readFileInputSchema,
  outputSchema: readFileOutputSchema,
  execute: async ({ path }) => {
    try {
      const targetPath = resolve(process.cwd(), path);
      const stats = await fs.stat(targetPath);

      if (stats.isDirectory()) {
        const errorResult: ErrorOutput = {
          error: "Path is a directory, not a file",
          path: targetPath,
        };
        return errorResult;
      }

      const content = await fs.readFile(targetPath, "utf-8");

      return {
        path: targetPath,
        content,
        size: Number(stats.size),
        encoding: "utf-8",
      };
    } catch (error) {
      const errorResult: ErrorOutput = {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        path: resolve(process.cwd(), path),
      };

      return errorResult;
    }
  },
});
