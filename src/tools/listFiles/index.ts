import { promises as fs } from "node:fs";
import { extname, resolve } from "node:path";
import { tool } from "ai";
import {
  type ErrorOutput,
  type FileItem,
  listFilesInputSchema,
  listFilesOutputSchema,
  type Stats,
} from "./schemas.js";

/**
 * Tool for listing files and folders in a directory with enhanced metadata.
 */
export const listFiles = tool({
  description: "List files and folders in a directory with metadata useful for coding assistance",
  inputSchema: listFilesInputSchema,
  outputSchema: listFilesOutputSchema,
  execute: async ({ path = "." }) => {
    try {
      const targetPath = resolve(process.cwd(), path);
      const entries = await fs.readdir(targetPath, { withFileTypes: true });

      const { items, stats } = await entries.reduce<Promise<{ items: FileItem[]; stats: Stats }>>(
        async (accPromise, entry) => {
          const acc = await accPromise;
          const fullPath = resolve(targetPath, entry.name);

          let fileStats: Awaited<ReturnType<typeof fs.stat>> | undefined;
          try {
            fileStats = await fs.stat(fullPath);
          } catch {
            // continue with basic info
          }

          const item: FileItem = {
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            isHidden: entry.name.startsWith("."),
          };

          if (entry.isFile()) {
            const ext = extname(entry.name);
            if (ext) {
              item.extension = ext;
            }
          }

          if (fileStats) {
            item.size = Number(fileStats.size);
            item.modified = fileStats.mtime.toISOString();

            if (!entry.isDirectory() && (Number(fileStats.mode) & 0o111) > 0) {
              item.isExecutable = true;
            }
          }

          acc.items.push(item);

          if (entry.isDirectory()) {
            acc.stats.totalDirectories++;
          } else {
            acc.stats.totalFiles++;
            if (fileStats) {
              acc.stats.totalSize += Number(fileStats.size);
            }
          }

          return acc;
        },

        Promise.resolve({
          items: [],
          stats: {
            totalFiles: 0,
            totalDirectories: 0,
            totalSize: 0,
          },
        }),
      );

      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        path: targetPath,
        items,
        stats,
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
