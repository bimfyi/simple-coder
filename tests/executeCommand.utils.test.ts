import { describe, expect, it } from "vitest";
import {
  checkDangerousPatterns,
  checkWarningPatterns,
  isAutoApproved,
  isSafeCommand,
  parseBaseCommand,
} from "../src/tools/executeCommand/utils.js";

describe("executeCommand utils", () => {
  describe("parseBaseCommand", () => {
    it("should extract simple commands", () => {
      expect(parseBaseCommand("ls")).toBe("ls");
      expect(parseBaseCommand("pwd")).toBe("pwd");
      expect(parseBaseCommand("mkdir")).toBe("mkdir");
    });

    it("should extract command from commands with arguments", () => {
      expect(parseBaseCommand("ls -la")).toBe("ls");
      expect(parseBaseCommand("mkdir -p docs/vatu")).toBe("mkdir");
      expect(parseBaseCommand("rm -rf node_modules")).toBe("rm");
      expect(parseBaseCommand("git status")).toBe("git");
    });

    it("should handle commands with paths", () => {
      expect(parseBaseCommand("/usr/bin/node script.js")).toBe("node");
      expect(parseBaseCommand("./script.sh")).toBe("script");
      expect(parseBaseCommand("./path/to/script.sh")).toBe("script");
      expect(parseBaseCommand("/bin/bash -c 'echo hello'")).toBe("bash");
    });

    it("should handle edge cases", () => {
      expect(parseBaseCommand("")).toBe("");
      expect(parseBaseCommand("   ")).toBe("");
      expect(parseBaseCommand("123")).toBe(""); // Pure numbers should not be commands
      expect(parseBaseCommand("-flag")).toBe("");
    });
  });

  describe("checkDangerousPatterns", () => {
    it("should detect dangerous rm commands", () => {
      expect(checkDangerousPatterns("rm -rf /")).toBe("Command blocked: contains dangerous pattern");
      expect(checkDangerousPatterns("rm -rf /*")).toBe("Command blocked: contains dangerous pattern");
    });

    it("should detect fork bombs", () => {
      // Should detect fork bomb with spaces (common format)
      expect(checkDangerousPatterns(":(){ :|:& };:")).toBe("Command blocked: contains dangerous pattern");
      // Should also detect without spaces
      expect(checkDangerousPatterns(":(){:|:&};:")).toBe("Command blocked: contains dangerous pattern");
    });

    it("should detect dangerous dd commands", () => {
      expect(checkDangerousPatterns("dd if=/dev/zero of=/dev/sda")).toBe(
        "Command blocked: contains dangerous pattern",
      );
    });

    it("should detect sudo commands", () => {
      expect(checkDangerousPatterns("sudo rm -rf /")).toBe("Command blocked: contains dangerous pattern");
    });

    it("should allow safe commands", () => {
      expect(checkDangerousPatterns("rm -rf node_modules")).toBe(null);
      expect(checkDangerousPatterns("ls -la")).toBe(null);
      expect(checkDangerousPatterns("mkdir -p docs")).toBe(null);
    });
  });

  describe("checkWarningPatterns", () => {
    it("should warn about rm -rf .", () => {
      expect(checkWarningPatterns("rm -rf .")).toBe("Executing potentially destructive command: rm -rf .");
      expect(checkWarningPatterns("rm -r .")).toBe("Executing potentially destructive command: rm -r .");
    });

    it("should warn about git reset --hard", () => {
      expect(checkWarningPatterns("git reset --hard")).toBe(
        "Executing potentially destructive command: git reset --hard",
      );
    });

    it("should warn about git clean -fd", () => {
      expect(checkWarningPatterns("git clean -fd")).toBe(
        "Executing potentially destructive command: git clean -fd",
      );
    });

    it("should not warn about safe commands", () => {
      expect(checkWarningPatterns("git status")).toBe(null);
      expect(checkWarningPatterns("rm node_modules")).toBe(null);
      expect(checkWarningPatterns("ls")).toBe(null);
    });
  });

  describe("isSafeCommand", () => {
    it("should allow commands in safe list", () => {
      expect(isSafeCommand("ls")).toBe(true);
      expect(isSafeCommand("pwd")).toBe(true);
      expect(isSafeCommand("mkdir -p docs")).toBe(true);
      expect(isSafeCommand("git status")).toBe(true);
      expect(isSafeCommand("npm install")).toBe(true);
      expect(isSafeCommand("node script.js")).toBe(true);
    });

    it("should allow package manager commands", () => {
      expect(isSafeCommand("npm run build")).toBe(true);
      expect(isSafeCommand("yarn add express")).toBe(true);
      expect(isSafeCommand("pnpm install")).toBe(true);
      expect(isSafeCommand("bun test")).toBe(true);
    });

    it("should block unsafe commands", () => {
      expect(isSafeCommand("curl http://example.com")).toBe(false);
      expect(isSafeCommand("wget http://example.com")).toBe(false);
      expect(isSafeCommand("nc -l 8080")).toBe(false);
      expect(isSafeCommand("kill -9 1234")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isSafeCommand("")).toBe(false);
      expect(isSafeCommand("   ")).toBe(false);
    });
  });

  describe("isAutoApproved", () => {
    it("should auto-approve simple safe commands without arguments", () => {
      expect(isAutoApproved("pwd")).toBe(true);
      expect(isAutoApproved("whoami")).toBe(true);
      expect(isAutoApproved("date")).toBe(true);
    });

    it("should not auto-approve commands with arguments", () => {
      expect(isAutoApproved("pwd -P")).toBe(false);
      expect(isAutoApproved("whoami --help")).toBe(false);
      expect(isAutoApproved("date +%Y")).toBe(false);
    });

    it("should not auto-approve other commands", () => {
      expect(isAutoApproved("ls")).toBe(false);
      expect(isAutoApproved("rm")).toBe(false);
      expect(isAutoApproved("mkdir")).toBe(false);
    });

    it("should handle whitespace", () => {
      expect(isAutoApproved("  pwd  ")).toBe(true);
      expect(isAutoApproved("  pwd  -P  ")).toBe(false);
    });
  });
});