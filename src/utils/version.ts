import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let cachedVersion: string | null = null;

export function getVersion(): string {
  if (cachedVersion !== null) {
    return cachedVersion;
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    let currentDir = dirname(__filename);

    for (let i = 0; i < 5; i++) {
      const packageJsonPath = join(currentDir, "package.json");
      if (existsSync(packageJsonPath)) {
        const packageJson = readFileSync(packageJsonPath, "utf-8");
        const parsed = JSON.parse(packageJson);
        if (parsed.name === "@revenium/gemini-cli-metering") {
          const version = parsed.version || "0.1.0";
          cachedVersion = version;
          return version;
        }
      }
      currentDir = dirname(currentDir);
    }

    console.warn(
      "Warning: Could not find package.json for @revenium/gemini-cli-metering, using fallback version",
    );
    return "0.1.0";
  } catch (error) {
    console.warn(
      `Warning: Error reading version from package.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    return "0.1.0";
  }
}
