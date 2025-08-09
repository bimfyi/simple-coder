import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { tool } from "ai";
import { detectEol, parseLines } from "../readFile/utils.js";
import { editFileInputSchema, editFileOutputSchema } from "./schemas.js";
import { applyOps, generateDiff } from "./utils.js";

export const editFile = tool({
  description: "Edit file contents with line-based operations and diff generation",
  inputSchema: editFileInputSchema,
  outputSchema: editFileOutputSchema,
  execute: async ({ path, ops, create = false, keepEol = true }) => {
    try {
      const targetPath = resolve(process.cwd(), path);

      let original = "";
      let exists = true;
      try {
        original = await fs.readFile(targetPath, "utf-8");
      } catch {
        if (!create) {
          return {
            ok: false,
            error: "File does not exist",
            path: targetPath,
          };
        }
        exists = false;
      }

      const before = parseLines(original);
      const { modified: after, linesChanged } = applyOps(before, ops);

      const diff = generateDiff(before, after, targetPath);

      const eolStyle = keepEol && exists ? detectEol(original) : "LF";
      const eolSeq = eolStyle === "CRLF" ? "\r\n" : eolStyle === "CR" ? "\r" : "\n";

      const content = after.map((l) => l.text).join(eolSeq);
      await fs.writeFile(targetPath, content, "utf-8");

      return {
        ok: true,
        path: targetPath,
        diff,
        linesModified: linesChanged,
        newTotal: after.length,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        path: resolve(process.cwd(), path),
      };
    }
  },
});
