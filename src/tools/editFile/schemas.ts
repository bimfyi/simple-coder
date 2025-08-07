import { z } from "zod";

const editOpSchema = z.object({
  type: z.enum(["replace", "insert", "delete"]),
  start: z.number().positive().describe("Start line number (1-based)"),
  end: z.number().positive().optional().describe("End line for multi-line ops"),
  text: z.union([z.string(), z.array(z.string())]).optional(),
});

export const editFileInputSchema = z.object({
  path: z.string().describe("Relative path to file from cwd"),
  ops: z.array(editOpSchema).describe("Edit operations to perform"),
  create: z.boolean().optional().describe("Create file if not exists"),
  keepEol: z.boolean().optional().describe("Preserve original line endings"),
});

const diffChangeSchema = z.object({
  type: z.enum(["add", "del"]),
  line: z.number(),
  text: z.string(),
});

const successOutputSchema = z.object({
  ok: z.literal(true),
  path: z.string(),
  diff: z.object({
    unified: z.string(),
    changes: z.array(diffChangeSchema),
  }),
  linesModified: z.number(),
  newTotal: z.number(),
});

const errorOutputSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  path: z.string(),
});

export const editFileOutputSchema = z.union([successOutputSchema, errorOutputSchema]);

export type EditOperation = z.infer<typeof editOpSchema>;
export type EditFileInput = z.infer<typeof editFileInputSchema>;
export type EditFileSuccess = z.infer<typeof successOutputSchema>;
export type EditFileError = z.infer<typeof errorOutputSchema>;
export type EditFileOutput = z.infer<typeof editFileOutputSchema>;
