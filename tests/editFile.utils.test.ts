import { describe, expect, it } from "vitest";
import { applyOps } from "../src/tools/editFile/utils.js";
import type { LineInfo } from "../src/tools/readFile/schemas.js";
import type { EditOperation } from "../src/tools/editFile/schemas.js";

describe("editFile/utils", () => {
	describe("applyOps", () => {
		const sampleLines: LineInfo[] = [
			{ line: 1, text: "line1" },
			{ line: 2, text: "line2" },
			{ line: 3, text: "line3" },
			{ line: 4, text: "line4" },
			{ line: 5, text: "line5" },
		];

		describe("insert operations", () => {
			it("should insert at the beginning", () => {
				const ops: EditOperation[] = [{ type: "insert", start: 1, text: "line0" }];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toEqual([
					{ line: 1, text: "line0" },
					{ line: 2, text: "line1" },
					{ line: 3, text: "line2" },
					{ line: 4, text: "line3" },
					{ line: 5, text: "line4" },
					{ line: 6, text: "line5" },
				]);
				expect(result.linesChanged).toBe(1);
			});

			it("should insert in the middle", () => {
				const ops: EditOperation[] = [{ type: "insert", start: 3, text: "inserted" }];
				const result = applyOps(sampleLines, ops);
				expect(result.modified[2]).toEqual({ line: 3, text: "inserted" });
				expect(result.modified).toHaveLength(6);
				expect(result.linesChanged).toBe(1);
			});

			it("should insert at the end", () => {
				const ops: EditOperation[] = [{ type: "insert", start: 6, text: "line6" }];
				const result = applyOps(sampleLines, ops);
				expect(result.modified[5]).toEqual({ line: 6, text: "line6" });
				expect(result.modified).toHaveLength(6);
				expect(result.linesChanged).toBe(1);
			});

			it("should insert multiple lines", () => {
				const ops: EditOperation[] = [
					{ type: "insert", start: 3, text: "new1\nnew2\nnew3" },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toHaveLength(8);
				expect(result.linesChanged).toBe(3);
			});

			it("should handle array of lines for insert", () => {
				const ops: EditOperation[] = [
					{ type: "insert", start: 2, text: ["newA", "newB"] },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.modified[1]).toEqual({ line: 2, text: "newA" });
				expect(result.modified[2]).toEqual({ line: 3, text: "newB" });
				expect(result.modified).toHaveLength(7);
				expect(result.linesChanged).toBe(2);
			});
		});

		describe("delete operations", () => {
			it("should delete a single line", () => {
				const ops: EditOperation[] = [{ type: "delete", start: 3 }];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toEqual([
					{ line: 1, text: "line1" },
					{ line: 2, text: "line2" },
					{ line: 3, text: "line4" },
					{ line: 4, text: "line5" },
				]);
				expect(result.linesChanged).toBe(1);
			});

			it("should delete multiple lines with end specified", () => {
				const ops: EditOperation[] = [{ type: "delete", start: 2, end: 4 }];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toEqual([
					{ line: 1, text: "line1" },
					{ line: 2, text: "line5" },
				]);
				expect(result.linesChanged).toBe(3);
			});

			it("should delete first line", () => {
				const ops: EditOperation[] = [{ type: "delete", start: 1 }];
				const result = applyOps(sampleLines, ops);
				expect(result.modified[0]).toEqual({ line: 1, text: "line2" });
				expect(result.modified).toHaveLength(4);
				expect(result.linesChanged).toBe(1);
			});

			it("should delete last line", () => {
				const ops: EditOperation[] = [{ type: "delete", start: 5 }];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toHaveLength(4);
				expect(result.modified[3]).toEqual({ line: 4, text: "line4" });
				expect(result.linesChanged).toBe(1);
			});

			it("should delete all lines", () => {
				const ops: EditOperation[] = [{ type: "delete", start: 1, end: 5 }];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toEqual([]);
				expect(result.linesChanged).toBe(5);
			});
		});

		describe("replace operations", () => {
			it("should replace a single line", () => {
				const ops: EditOperation[] = [
					{ type: "replace", start: 3, text: "replaced" },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.modified[2]).toEqual({ line: 3, text: "replaced" });
				expect(result.modified).toHaveLength(5);
				expect(result.linesChanged).toBe(2);
			});

			it("should replace multiple lines with single line", () => {
				const ops: EditOperation[] = [
					{ type: "replace", start: 2, end: 4, text: "replaced" },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toEqual([
					{ line: 1, text: "line1" },
					{ line: 2, text: "replaced" },
					{ line: 3, text: "line5" },
				]);
				expect(result.linesChanged).toBe(4);
			});

			it("should replace single line with multiple lines", () => {
				const ops: EditOperation[] = [
					{ type: "replace", start: 3, text: "new1\nnew2\nnew3" },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toHaveLength(7);
				expect(result.modified[2]).toEqual({ line: 3, text: "new1" });
				expect(result.modified[3]).toEqual({ line: 4, text: "new2" });
				expect(result.modified[4]).toEqual({ line: 5, text: "new3" });
				expect(result.linesChanged).toBe(4);
			});

			it("should handle empty replacement", () => {
				const ops: EditOperation[] = [{ type: "replace", start: 3, text: "" }];
				const result = applyOps(sampleLines, ops);
				expect(result.modified[2]).toEqual({ line: 3, text: "" });
				expect(result.modified).toHaveLength(5);
				expect(result.linesChanged).toBe(2);
			});
		});

		describe("multiple operations", () => {
			it("should apply operations in order", () => {
				const ops: EditOperation[] = [
					{ type: "delete", start: 2 },
					{ type: "insert", start: 4, text: "inserted" },
					{ type: "replace", start: 1, text: "replaced" },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toHaveLength(5);
				expect(result.linesChanged).toBe(4);
			});

			it("should handle operations at same position correctly", () => {
				const ops: EditOperation[] = [
					{ type: "delete", start: 3 },
					{ type: "insert", start: 3, text: "inserted" },
					{ type: "replace", start: 3, text: "replaced" },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toHaveLength(5);
			});

			it("should handle complex sequence of operations", () => {
				const ops: EditOperation[] = [
					{ type: "insert", start: 1, text: "header" },
					{ type: "delete", start: 3, end: 4 },
					{ type: "replace", start: 5, text: "footer" },
					{ type: "insert", start: 6, text: "end" },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.linesChanged).toBe(4);
			});
		});

		describe("edge cases", () => {
			it("should handle empty lines array", () => {
				const ops: EditOperation[] = [{ type: "insert", start: 1, text: "new" }];
				const result = applyOps([], ops);
				expect(result.modified).toEqual([{ line: 1, text: "new" }]);
				expect(result.linesChanged).toBe(1);
			});

			it("should handle out of bounds operations gracefully", () => {
				const ops: EditOperation[] = [
					{ type: "delete", start: 10 },
					{ type: "replace", start: 10, text: "test" },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toHaveLength(5);
				expect(result.linesChanged).toBe(0);
			});

			it("should handle undefined text as empty array for insert", () => {
				const ops: EditOperation[] = [
					{ type: "insert", start: 3, text: undefined },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.modified).toHaveLength(5);
				expect(result.linesChanged).toBe(0);
			});

			it("should preserve empty lines in multiline text", () => {
				const ops: EditOperation[] = [
					{ type: "replace", start: 3, text: "line1\n\nline3" },
				];
				const result = applyOps(sampleLines, ops);
				expect(result.modified[2]).toEqual({ line: 3, text: "line1" });
				expect(result.modified[3]).toEqual({ line: 4, text: "" });
				expect(result.modified[4]).toEqual({ line: 5, text: "line3" });
			});

			it("should handle single empty string as single empty line", () => {
				const ops: EditOperation[] = [{ type: "insert", start: 3, text: "" }];
				const result = applyOps(sampleLines, ops);
				expect(result.modified[2]).toEqual({ line: 3, text: "" });
				expect(result.modified).toHaveLength(6);
				expect(result.linesChanged).toBe(1);
			});
		});
	});
});