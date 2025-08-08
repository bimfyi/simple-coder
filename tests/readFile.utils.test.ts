import { describe, expect, it } from "vitest";
import {
	detectEol,
	parseLines,
	applyRange,
} from "../src/tools/readFile/utils.js";
import type { LineInfo } from "../src/tools/readFile/schemas.js";

describe("readFile/utils", () => {
	describe("detectEol", () => {
		it("should detect LF (Unix/Linux/Mac)", () => {
			expect(detectEol("line1\nline2\nline3")).toBe("LF");
			expect(detectEol("single line\n")).toBe("LF");
			expect(detectEol("\n\n\n")).toBe("LF");
		});

		it("should detect CRLF (Windows)", () => {
			expect(detectEol("line1\r\nline2\r\nline3")).toBe("CRLF");
			expect(detectEol("single line\r\n")).toBe("CRLF");
			expect(detectEol("\r\n\r\n\r\n")).toBe("CRLF");
		});

		it("should detect CR (old Mac)", () => {
			expect(detectEol("line1\rline2\rline3")).toBe("CR");
			expect(detectEol("single line\r")).toBe("CR");
			expect(detectEol("\r\r\r")).toBe("CR");
		});

		it("should handle mixed EOL styles (prefer most common)", () => {
			expect(detectEol("line1\r\nline2\r\nline3\n")).toBe("CRLF");
			expect(detectEol("line1\nline2\nline3\r\n")).toBe("LF");
			expect(detectEol("line1\rline2\rline3\n")).toBe("CR");
		});

		it("should default to LF for empty string", () => {
			expect(detectEol("")).toBe("LF");
		});

		it("should default to LF when no line endings present", () => {
			expect(detectEol("single line without ending")).toBe("LF");
		});

		it("should handle equal counts by preferring CRLF > CR > LF", () => {
			expect(detectEol("a\r\nb\nc\r")).toBe("CRLF");
			expect(detectEol("a\nb\r")).toBe("CR");
		});

		it("should handle content with only one type of line ending", () => {
			const lfOnly = "line1\nline2\nline3\nline4\nline5";
			expect(detectEol(lfOnly)).toBe("LF");

			const crlfOnly = "line1\r\nline2\r\nline3\r\nline4\r\nline5";
			expect(detectEol(crlfOnly)).toBe("CRLF");

			const crOnly = "line1\rline2\rline3\rline4\rline5";
			expect(detectEol(crOnly)).toBe("CR");
		});

		it("should correctly count line endings without false matches", () => {
			expect(detectEol("\r\n\n\n")).toBe("LF");
			expect(detectEol("\r\n\r\n")).toBe("CRLF");
			expect(detectEol("\r\r\n")).toBe("CRLF");
		});
	});

	describe("parseLines", () => {
		it("should parse empty content", () => {
			expect(parseLines("")).toEqual([]);
		});

		it("should parse single line without ending", () => {
			expect(parseLines("hello")).toEqual([{ line: 1, text: "hello" }]);
		});

		it("should parse multiple lines with LF", () => {
			const content = "line1\nline2\nline3";
			expect(parseLines(content)).toEqual([
				{ line: 1, text: "line1" },
				{ line: 2, text: "line2" },
				{ line: 3, text: "line3" },
			]);
		});

		it("should parse multiple lines with CRLF", () => {
			const content = "line1\r\nline2\r\nline3";
			expect(parseLines(content)).toEqual([
				{ line: 1, text: "line1" },
				{ line: 2, text: "line2" },
				{ line: 3, text: "line3" },
			]);
		});

		it("should parse multiple lines with CR", () => {
			const content = "line1\rline2\rline3";
			expect(parseLines(content)).toEqual([
				{ line: 1, text: "line1" },
				{ line: 2, text: "line2" },
				{ line: 3, text: "line3" },
			]);
		});

		it("should handle empty lines", () => {
			const content = "line1\n\nline3";
			expect(parseLines(content)).toEqual([
				{ line: 1, text: "line1" },
				{ line: 2, text: "" },
				{ line: 3, text: "line3" },
			]);
		});

		it("should handle trailing newline", () => {
			const content = "line1\nline2\n";
			expect(parseLines(content)).toEqual([
				{ line: 1, text: "line1" },
				{ line: 2, text: "line2" },
				{ line: 3, text: "" },
			]);
		});

		it("should handle mixed line endings", () => {
			const content = "line1\r\nline2\nline3\rline4";
			expect(parseLines(content)).toEqual([
				{ line: 1, text: "line1" },
				{ line: 2, text: "line2" },
				{ line: 3, text: "line3" },
				{ line: 4, text: "line4" },
			]);
		});

		it("should preserve spaces and tabs", () => {
			const content = "  line1\t\n\tline2  \n line3 ";
			expect(parseLines(content)).toEqual([
				{ line: 1, text: "  line1\t" },
				{ line: 2, text: "\tline2  " },
				{ line: 3, text: " line3 " },
			]);
		});

		it("should handle only newlines", () => {
			expect(parseLines("\n\n\n")).toEqual([
				{ line: 1, text: "" },
				{ line: 2, text: "" },
				{ line: 3, text: "" },
				{ line: 4, text: "" },
			]);
		});

		it("should handle very long lines", () => {
			const longLine = "x".repeat(10000);
			const content = `${longLine}\nshort\n${longLine}`;
			const result = parseLines(content);
			expect(result).toHaveLength(3);
			expect(result[0].text).toHaveLength(10000);
			expect(result[1].text).toBe("short");
			expect(result[2].text).toHaveLength(10000);
		});

		it("should number lines sequentially starting from 1", () => {
			const content = "a\nb\nc\nd\ne";
			const result = parseLines(content);
			expect(result.map((l) => l.line)).toEqual([1, 2, 3, 4, 5]);
		});
	});

	describe("applyRange", () => {
		const sampleLines: LineInfo[] = [
			{ line: 1, text: "line1" },
			{ line: 2, text: "line2" },
			{ line: 3, text: "line3" },
			{ line: 4, text: "line4" },
			{ line: 5, text: "line5" },
		];

		it("should return all lines when no range specified", () => {
			const result = applyRange(sampleLines);
			expect(result.lines).toEqual(sampleLines);
			expect(result.range).toBeUndefined();
		});

		it("should return lines within valid range", () => {
			const result = applyRange(sampleLines, { start: 2, end: 4 });
			expect(result.lines).toEqual([
				{ line: 2, text: "line2" },
				{ line: 3, text: "line3" },
				{ line: 4, text: "line4" },
			]);
			expect(result.range).toEqual({ start: 2, end: 4 });
		});

		it("should handle single line range", () => {
			const result = applyRange(sampleLines, { start: 3, end: 3 });
			expect(result.lines).toEqual([{ line: 3, text: "line3" }]);
			expect(result.range).toEqual({ start: 3, end: 3 });
		});

		it("should handle range starting at first line", () => {
			const result = applyRange(sampleLines, { start: 1, end: 3 });
			expect(result.lines).toEqual([
				{ line: 1, text: "line1" },
				{ line: 2, text: "line2" },
				{ line: 3, text: "line3" },
			]);
			expect(result.range).toEqual({ start: 1, end: 3 });
		});

		it("should handle range ending at last line", () => {
			const result = applyRange(sampleLines, { start: 3, end: 5 });
			expect(result.lines).toEqual([
				{ line: 3, text: "line3" },
				{ line: 4, text: "line4" },
				{ line: 5, text: "line5" },
			]);
			expect(result.range).toEqual({ start: 3, end: 5 });
		});

		it("should handle range covering all lines", () => {
			const result = applyRange(sampleLines, { start: 1, end: 5 });
			expect(result.lines).toEqual(sampleLines);
			expect(result.range).toEqual({ start: 1, end: 5 });
		});

		it("should clamp start to 1 if less than 1", () => {
			const result = applyRange(sampleLines, { start: -5, end: 3 });
			expect(result.lines).toEqual([
				{ line: 1, text: "line1" },
				{ line: 2, text: "line2" },
				{ line: 3, text: "line3" },
			]);
			expect(result.range).toEqual({ start: 1, end: 3 });
		});

		it("should clamp end to lines length if greater", () => {
			const result = applyRange(sampleLines, { start: 3, end: 10 });
			expect(result.lines).toEqual([
				{ line: 3, text: "line3" },
				{ line: 4, text: "line4" },
				{ line: 5, text: "line5" },
			]);
			expect(result.range).toEqual({ start: 3, end: 5 });
		});

		it("should return empty array when start > end", () => {
			const result = applyRange(sampleLines, { start: 5, end: 2 });
			expect(result.lines).toEqual([]);
			expect(result.range).toEqual({ start: 5, end: 2 });
		});

		it("should return empty array when start > lines length", () => {
			const result = applyRange(sampleLines, { start: 10, end: 15 });
			expect(result.lines).toEqual([]);
			expect(result.range).toEqual({ start: 10, end: 5 });
		});

		it("should handle empty lines array", () => {
			const result = applyRange([], { start: 1, end: 5 });
			expect(result.lines).toEqual([]);
			expect(result.range).toEqual({ start: 1, end: 0 });
		});

		it("should handle range with both bounds out of range", () => {
			const result = applyRange(sampleLines, { start: -10, end: 20 });
			expect(result.lines).toEqual(sampleLines);
			expect(result.range).toEqual({ start: 1, end: 5 });
		});

		it("should preserve line numbers in filtered result", () => {
			const result = applyRange(sampleLines, { start: 3, end: 4 });
			expect(result.lines[0].line).toBe(3);
			expect(result.lines[1].line).toBe(4);
		});
	});
});