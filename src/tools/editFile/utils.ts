import type { LineInfo } from "../readFile/schemas.js";
import { parseLines as parseLinesFromReader } from "../readFile/utils.js";

import type { EditOperation } from "./schemas.js";

export function parseLines(content: string): LineInfo[] {
  return parseLinesFromReader(content);
}

function splitToLines(textOrLines: string | string[] | undefined): string[] {
  if (textOrLines === undefined) {
    return [];
  }
  if (Array.isArray(textOrLines)) {
    return textOrLines;
  }
  if (textOrLines.length === 0) {
    return [""];
  }
  return textOrLines.split(/\r\n|\r|\n/);
}

export function applyOps(
  originalLines: LineInfo[],
  ops: EditOperation[],
): { modified: LineInfo[]; linesChanged: number } {
  // Work on a mutable copy of the text contents only
  const working: string[] = originalLines.map((l) => l.text);

  // Validate and sort operations by start asc, then type priority (delete, replace, insert)
  const typePriority = { delete: 0, replace: 1, insert: 2 } as const;
  const sorted = [...ops].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return typePriority[a.type] - typePriority[b.type];
  });

  let totalAdds = 0;
  let totalDels = 0;

  // Apply sequentially, adjusting indices as we go
  for (const op of sorted) {
    // Convert 1-based to 0-based index positions relative to current working array
    if (op.type === "insert") {
      const insertIndex = Math.max(0, Math.min(working.length, op.start - 1));
      const linesToInsert = splitToLines(op.text);
      working.splice(insertIndex, 0, ...linesToInsert);
      totalAdds += linesToInsert.length;
      continue;
    }

    const startIdx = Math.max(0, Math.min(working.length - 1, op.start - 1));
    const endLine = op.end ?? op.start;
    const endIdx = Math.max(0, Math.min(working.length - 1, endLine - 1));
    const deleteCount = endIdx - startIdx + 1;

    if (deleteCount <= 0) {
      continue;
    }

    if (op.type === "delete") {
      working.splice(startIdx, deleteCount);
      totalDels += deleteCount;
    } else if (op.type === "replace") {
      const replacementLines = splitToLines(op.text);
      working.splice(startIdx, deleteCount, ...replacementLines);
      totalDels += deleteCount;
      totalAdds += replacementLines.length;
    }
  }

  const modified: LineInfo[] = working.map((text, idx) => ({ line: idx + 1, text }));
  return { modified, linesChanged: totalAdds + totalDels };
}

/**
 * Generate a unified diff between two line arrays.
 * Very small, LCS-based implementation with 3-line context.
 */
export function generateDiff(
  before: LineInfo[],
  after: LineInfo[],
  path: string,
): { unified: string; changes: Array<{ type: "add" | "del"; line: number; text: string }> } {
  const a = before.map((l) => l.text);
  const b = after.map((l) => l.text);

  // LCS table
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if ((a[i] ?? "") === (b[j] ?? "")) {
        lcs[i]![j]! = (lcs[i + 1]![j + 1]! ?? 0) + 1;
      } else {
        const v1 = lcs[i + 1]![j]! ?? 0;
        const v2 = lcs[i]![j + 1]! ?? 0;
        lcs[i]![j]! = Math.max(v1, v2);
      }
    }
  }

  type Op = { type: "equal" | "del" | "add"; aIndex: number; bIndex: number; text: string };
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const ai = a[i] ?? "";
    const bj = b[j] ?? "";
    if (ai === bj) {
      ops.push({ type: "equal", aIndex: i, bIndex: j, text: ai });
      i++;
      j++;
    } else if ((lcs[i + 1]![j]! ?? 0) >= (lcs[i]![j + 1]! ?? 0)) {
      ops.push({ type: "del", aIndex: i, bIndex: j, text: ai });
      i++;
    } else {
      ops.push({ type: "add", aIndex: i, bIndex: j, text: bj });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "del", aIndex: i, bIndex: j, text: a[i] ?? "" });
    i++;
  }
  while (j < m) {
    ops.push({ type: "add", aIndex: i, bIndex: j, text: b[j] ?? "" });
    j++;
  }

  // Build changes list (line numbers: del uses original line, add uses new line)
  const changes: Array<{ type: "add" | "del"; line: number; text: string }> = [];
  let newLineCursor = 1;
  let oldLineCursor = 1;
  for (const op of ops) {
    if (op.type === "equal") {
      newLineCursor++;
      oldLineCursor++;
    } else if (op.type === "del") {
      changes.push({ type: "del", line: oldLineCursor, text: op.text });
      oldLineCursor++;
    } else if (op.type === "add") {
      changes.push({ type: "add", line: newLineCursor, text: op.text });
      newLineCursor++;
    }
  }

  // Build unified hunks with proper context handling
  const context = 3;
  type HunkLine = { prefix: " " | "+" | "-"; text: string };
  type Hunk = { aStart: number; aLen: number; bStart: number; bLen: number; lines: HunkLine[] };
  const hunks: Hunk[] = [];

  let aLine = 1;
  let bLine = 1;
  let hunk: Hunk | null = null;
  let preContext: string[] = [];
  let pendingEqual: string[] = [];

  function openHunk(): Hunk {
    const aStart = Math.max(1, aLine - preContext.length);
    const bStart = Math.max(1, bLine - preContext.length);
    const created: Hunk = { aStart, aLen: 0, bStart, bLen: 0, lines: [] };
    for (const t of preContext) {
      created.lines.push({ prefix: " ", text: t });
      created.aLen++;
      created.bLen++;
    }
    preContext = [];
    hunk = created;
    return created;
  }

  function closeHunk(): void {
    if (!hunk) {
      return;
    }
    const current: Hunk = hunk;
    // include up to context trailing equals
    const trail = pendingEqual.slice(0, context);
    for (const t of trail) {
      current.lines.push({ prefix: " ", text: t });
      current.aLen++;
      current.bLen++;
    }
    pendingEqual = [];
    hunks.push(current);
    hunk = null;
  }

  function getOrOpenHunk(): Hunk {
    return hunk ?? openHunk();
  }

  for (const op of ops) {
    if (op.type === "equal") {
      // Maintain rolling buffers
      if (hunk) {
        // we delay emitting equals until we know if more changes follow
        pendingEqual.push(op.text);
        // if equals exceed context after last change, close current hunk keeping only trailing context
        if (pendingEqual.length > context) {
          closeHunk();
          // after closing, keep last context equals as pre-context for potential next hunk
          preContext = pendingEqual.slice(-context);
          pendingEqual = [];
        }
      } else {
        preContext.push(op.text);
        if (preContext.length > context) {
          preContext.shift();
        }
      }
      aLine++;
      bLine++;
    } else if (op.type === "del") {
      const cur = getOrOpenHunk();
      // flush pending equals into hunk as context between changes
      if (pendingEqual.length > 0) {
        for (const t of pendingEqual) {
          cur.lines.push({ prefix: " ", text: t });
          cur.aLen++;
          cur.bLen++;
        }
        pendingEqual = [];
      }
      cur.lines.push({ prefix: "-", text: op.text });
      cur.aLen++;
      aLine++;
    } else if (op.type === "add") {
      const cur = getOrOpenHunk();
      if (pendingEqual.length > 0) {
        for (const t of pendingEqual) {
          cur.lines.push({ prefix: " ", text: t });
          cur.aLen++;
          cur.bLen++;
        }
        pendingEqual = [];
      }
      cur.lines.push({ prefix: "+", text: op.text });
      cur.bLen++;
      bLine++;
    }
  }

  if (hunk) {
    // Include remaining trailing equals up to context
    const current: Hunk = hunk;
    const trail = pendingEqual.slice(0, context);
    for (const t of trail) {
      current.lines.push({ prefix: " ", text: t });
      current.aLen++;
      current.bLen++;
    }
    pendingEqual = [];
    hunks.push(current);
    hunk = null;
  }

  let unified = `--- a/${path}\n+++ b/${path}`;
  for (const h of hunks) {
    const aCount = Math.max(0, h.aLen);
    const bCount = Math.max(0, h.bLen);
    unified += `\n@@ -${h.aStart},${aCount} +${h.bStart},${bCount} @@`;
    for (const hl of h.lines) {
      unified += `\n${hl.prefix}${hl.text}`;
    }
  }

  if (hunks.length === 0) {
    unified += `\n@@ -1,0 +1,0 @@`;
  }

  return { unified, changes };
}
