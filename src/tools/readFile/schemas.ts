import { z } from "zod";

const lineInfoSchema = z.object({
  line: z.number().describe("1-based line number"),
  text: z.string().describe("Line content without newline"),
});

const successOutputSchema = z.object({
  path: z.string(),
  lines: z.array(lineInfoSchema),
  total: z.number().describe("Total line count"),
  size: z.number(),
  encoding: z.string(),
  eol: z.enum(["LF", "CRLF", "CR"]).describe("End-of-line style"),
  range: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .optional()
    .describe("Range of lines returned if partial read"),
});

const errorOutputSchema = z.object({
  error: z.string(),
  path: z.string(),
});

export const readFileInputSchema = z.object({
  path: z.string().describe("Relative path to the file to read from current working directory"),
  range: z
    .object({
      start: z.number().positive().describe("Start line (1-based)"),
      end: z.number().positive().describe("End line (1-based, inclusive)"),
    })
    .optional()
    .describe("Read specific line range"),
});

export const readFileOutputSchema = z.union([successOutputSchema, errorOutputSchema]);

export type LineInfo = z.infer<typeof lineInfoSchema>;
export type SuccessOutput = z.infer<typeof successOutputSchema>;
export type ErrorOutput = z.infer<typeof errorOutputSchema>;
export type ReadFileOutput = z.infer<typeof readFileOutputSchema>;
