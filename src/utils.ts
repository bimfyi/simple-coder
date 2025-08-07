/** ANSI escape codes for terminal output colors */
export const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  yellow: "\x1b[33m",
} as const;

/**
 * Formats a file size in bytes to a human-readable string.
 * @param bytes - The file size in bytes.
 * @returns The formatted file size.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)}${units[i]}`;
}
