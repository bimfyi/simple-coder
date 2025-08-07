import type { LineInfo } from "./schemas.js";

/**
 * Detects the predominant end-of-line style in content
 */
export function detectEol(content: string): "LF" | "CRLF" | "CR" {
  const crlf = (content.match(/\r\n/g) || []).length;
  const lf = (content.match(/(?<!\r)\n/g) || []).length;
  const cr = (content.match(/\r(?!\n)/g) || []).length;

  if (crlf > lf && crlf > cr) {
    return "CRLF";
  }
  if (cr > lf) {
    return "CR";
  }
  return "LF";
}

/**
 * Parses content into line information array
 */
export function parseLines(content: string): LineInfo[] {
  if (!content) {
    return [];
  }

  const lines = content.split(/\r\n|\r|\n/);

  return lines.map((text, index) => ({
    line: index + 1,
    text,
  }));
}

/**
 * Applies range filtering to lines array
 */
export function applyRange(
  lines: LineInfo[],
  range?: { start: number; end: number },
): { lines: LineInfo[]; range?: { start: number; end: number } } {
  if (!range) {
    return { lines };
  }

  const start = Math.max(1, range.start);
  const end = Math.min(lines.length, range.end);

  if (start > end || start > lines.length) {
    return { lines: [], range: { start, end } };
  }

  const filteredLines = lines.slice(start - 1, end);

  return {
    lines: filteredLines,
    range: { start, end },
  };
}
