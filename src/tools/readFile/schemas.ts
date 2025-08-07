import { z } from "zod";

const successOutputSchema = z.object({
  path: z.string(),
  content: z.string(),
  size: z.number(),
  encoding: z.string(),
});

const errorOutputSchema = z.object({
  error: z.string(),
  path: z.string(),
});

export const readFileInputSchema = z.object({
  path: z.string().describe("Relative path to the file to read from current working directory"),
});

export const readFileOutputSchema = z.union([successOutputSchema, errorOutputSchema]);

export type SuccessOutput = z.infer<typeof successOutputSchema>;
export type ErrorOutput = z.infer<typeof errorOutputSchema>;
export type ReadFileOutput = z.infer<typeof readFileOutputSchema>;
