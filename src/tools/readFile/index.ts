import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { tool } from "ai";
import {
  type ErrorOutput,
  readFileInputSchema,
  readFileOutputSchema,
  type SuccessOutput,
} from "./schemas.js";
import { applyRange, detectEol, parseLines } from "./utils.js";

/**
 * Tool for reading file contents from the filesystem as lines.
 * Returns content as an array of lines for precise editing and diff generation.
 */
export const readFile = tool({
  description: "Read the contents of a file from the filesystem as lines",
  inputSchema: readFileInputSchema,
  outputSchema: readFileOutputSchema,
  execute: async ({ path, range }) => {
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
      const allLines = parseLines(content);
      const eol = detectEol(content);
      const { lines, range: appliedRange } = applyRange(allLines, range);

      const result: SuccessOutput = {
        path: targetPath,
        lines,
        total: allLines.length,
        size: Number(stats.size),
        encoding: "utf-8",
        eol,
        ...(appliedRange && { range: appliedRange }),
      };

      return result;
    } catch (error) {
      const errorResult: ErrorOutput = {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        path: resolve(process.cwd(), path),
      };

      return errorResult;
    }
  },
});
