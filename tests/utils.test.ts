import { describe, expect, it } from "vitest";
import { formatFileSize } from "../src/utils.js";

describe("utils", () => {
	describe("formatFileSize", () => {
		it("should format 0 bytes correctly", () => {
			expect(formatFileSize(0)).toBe("0B");
		});

		it("should format bytes (less than 1KB)", () => {
			expect(formatFileSize(100)).toBe("100.0B");
			expect(formatFileSize(999)).toBe("999.0B");
		});

		it("should format kilobytes correctly", () => {
			expect(formatFileSize(1024)).toBe("1.0KB");
			expect(formatFileSize(1536)).toBe("1.5KB");
			expect(formatFileSize(2048)).toBe("2.0KB");
			expect(formatFileSize(10240)).toBe("10.0KB");
		});

		it("should format megabytes correctly", () => {
			expect(formatFileSize(1048576)).toBe("1.0MB");
			expect(formatFileSize(1572864)).toBe("1.5MB");
			expect(formatFileSize(5242880)).toBe("5.0MB");
			expect(formatFileSize(104857600)).toBe("100.0MB");
		});

		it("should format gigabytes correctly", () => {
			expect(formatFileSize(1073741824)).toBe("1.0GB");
			expect(formatFileSize(1610612736)).toBe("1.5GB");
			expect(formatFileSize(5368709120)).toBe("5.0GB");
			expect(formatFileSize(107374182400)).toBe("100.0GB");
		});

		it("should handle large GB values", () => {
			expect(formatFileSize(10737418240)).toBe("10.0GB");
			expect(formatFileSize(536870912000)).toBe("500.0GB");
		});

		it("should handle TB values", () => {
			expect(formatFileSize(1099511627776)).toBe("1.0TB");
			expect(formatFileSize(10995116277760)).toBe("10.0TB");
		});

		it("should handle PB values", () => {
			expect(formatFileSize(1125899906842624)).toBe("1.0PB");
			expect(formatFileSize(11258999068426240)).toBe("10.0PB");
		});

		it("should round to 1 decimal place", () => {
			expect(formatFileSize(1100)).toBe("1.1KB");
			expect(formatFileSize(1126)).toBe("1.1KB");
			expect(formatFileSize(1178)).toBe("1.2KB");
		});

		it("should handle edge case at boundaries", () => {
			expect(formatFileSize(1023)).toBe("1023.0B");
			expect(formatFileSize(1024)).toBe("1.0KB");
			expect(formatFileSize(1048575)).toBe("1024.0KB");
			expect(formatFileSize(1048576)).toBe("1.0MB");
			expect(formatFileSize(1073741823)).toBe("1024.0MB");
			expect(formatFileSize(1073741824)).toBe("1.0GB");
		});
	});
});