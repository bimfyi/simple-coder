import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { tool } from "ai";
import { z } from "zod";

const listFilesInputSchema = z.object({
  path: z
    .string()
    .optional()
    .describe("Relative path to directory (defaults to current working directory)"),
});

const listFilesOutputSchema = z.union([
  // success case
  z.object({
    path: z.string(),
    files: z.array(z.string()),
    folders: z.array(z.string()),
    items: z.array(
      z.object({
        name: z.string(),
        type: z.enum(["file", "folder"]),
      }),
    ),
  }),
  // error case
  z.object({
    error: z.string(),
    path: z.string(),
  }),
]);

type ListFilesOutput = z.infer<typeof listFilesOutputSchema>;

/**
 * Tool for listing files and folders in a directory.
 */
export const listFiles = tool({
  description: "List files and folders in a directory",
  inputSchema: listFilesInputSchema,
  outputSchema: listFilesOutputSchema,
  execute: async ({ path = "." }) => {
    try {
      const targetPath = resolve(process.cwd(), path);
      const entries = await fs.readdir(targetPath, { withFileTypes: true });

      const files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => ({
          name: entry.name,
          type: "file" as const,
        }));

      const folders = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          name: entry.name,
          type: "folder" as const,
        }));

      return {
        path: targetPath,
        files: files.map((f) => f.name),
        folders: folders.map((f) => f.name),
        items: [...folders, ...files].map((item) => ({
          name: item.name,
          type: item.type,
        })),
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          error: error.message,
          path: resolve(process.cwd(), path),
        };
      }
      return {
        error: "Unknown error occurred",
        path: resolve(process.cwd(), path),
      };
    }
  },
});

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
      const icon = item.type === "folder" ? "📂 " : "📄 ";
      process.stdout.write(`${prefix}${icon}${item.name}\n`);
    });

    if (items.length === 0) {
      process.stdout.write("└── (empty)\n");
    }
  }
}
