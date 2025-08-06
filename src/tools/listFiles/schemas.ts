import { z } from "zod";

const fileItemSchema = z.object({
  name: z.string(),
  type: z.enum(["file", "directory"]),
  extension: z.string().optional(),
  size: z.number().optional(),
  modified: z.string().optional(),
  isHidden: z.boolean(),
  isExecutable: z.boolean().optional(),
});

const statsSchema = z.object({
  totalFiles: z.number(),
  totalDirectories: z.number(),
  totalSize: z.number(),
});

const successOutputSchema = z.object({
  path: z.string(),
  items: z.array(fileItemSchema),
  stats: statsSchema,
});

const errorOutputSchema = z.object({
  error: z.string(),
  path: z.string(),
});

export const listFilesInputSchema = z.object({
  path: z
    .string()
    .optional()
    .describe("Relative path to directory (defaults to current working directory)"),
});

export const listFilesOutputSchema = z.union([successOutputSchema, errorOutputSchema]);

export type FileItem = z.infer<typeof fileItemSchema>;
export type Stats = z.infer<typeof statsSchema>;
export type SuccessOutput = z.infer<typeof successOutputSchema>;
export type ErrorOutput = z.infer<typeof errorOutputSchema>;
export type ListFilesOutput = z.infer<typeof listFilesOutputSchema>;
