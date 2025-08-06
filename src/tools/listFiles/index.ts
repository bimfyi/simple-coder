import { promises as fs } from "node:fs";
import { extname, resolve } from "node:path";
import { tool } from "ai";
import {
  type ErrorOutput,
  type FileItem,
  type ListFilesOutput,
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

/**
 * Handles the output of the listFiles tool; if successful, prints the list of files and folders to stdout as
 * a tree structure. If there is an error, it prints the error message to stdout.
 * @param output - The output of the listFiles tool.
 */
export function handleListFileOutput(output: ListFilesOutput) {
  if ("error" in output) {
    process.stdout.write(`Error: ${output.error}\n`);
  } else {
    process.stdout.write(`\n📁 ${output.path}\n`);

    const items = output.items;
    const lastIndex = items.length - 1;

    items.forEach((item, index) => {
      const isLast = index === lastIndex;
      const prefix = isLast ? "└── " : "├── ";
      const icon = item.type === "directory" ? "📂 " : "📄 ";

      let info = `${prefix}${icon}${item.name}`;

      if (item.type === "file" && item.extension && !item.name.includes(item.extension)) {
        info += ` (${item.extension})`;
      }

      if (item.type === "file" && item.size !== undefined) {
        const sizeStr = formatFileSize(item.size);
        info += ` [${sizeStr}]`;
      }

      if (item.isHidden) {
        info += " (hidden)";
      }

      if (item.isExecutable) {
        info += " *";
      }

      process.stdout.write(`${info}\n`);
    });

    if (items.length === 0) {
      process.stdout.write("└── (empty)\n");
    } else {
      // Show summary stats
      process.stdout.write(
        `\n📊 ${output.stats.totalFiles} files, ${output.stats.totalDirectories} directories`,
      );
      if (output.stats.totalSize > 0) {
        process.stdout.write(` (${formatFileSize(output.stats.totalSize)} total)`);
      }
      process.stdout.write("\n");
    }
  }
}

/**
 * Formats a file size in bytes to a human-readable string.
 * @param bytes - The file size in bytes.
 * @returns The formatted file size.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)}${units[i]}`;
}
