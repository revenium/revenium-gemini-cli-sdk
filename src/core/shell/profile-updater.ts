import { readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ShellType, ShellUpdateResult } from "../../types/index.js";
import { detectShell, getProfilePath, getSourceCommand } from "./detector.js";
import { getConfigFilePath } from "../config/writer.js";

/** Marker comment to identify our configuration block */
const CONFIG_MARKER_START = "# >>> revenium-gemini-cli-metering >>>";
const CONFIG_MARKER_END = "# <<< revenium-gemini-cli-metering <<<";

/**
 * Checks if the shell profile already has the Revenium source command.
 */
async function hasReveniumConfig(profilePath: string): Promise<boolean> {
  if (!existsSync(profilePath)) {
    return false;
  }

  const content = await readFile(profilePath, "utf-8");
  return content.includes(CONFIG_MARKER_START);
}

/**
 * Generates the complete configuration block for the shell profile.
 */
function generateConfigBlock(shellType: ShellType, configPath: string): string {
  const sourceCmd = getSourceCommand(shellType, configPath);
  return `\n${CONFIG_MARKER_START}\n${sourceCmd}\n${CONFIG_MARKER_END}\n`;
}

/**
 * Removes existing Revenium configuration from profile content.
 */
function removeExistingConfig(content: string): string {
  const startIndex = content.indexOf(CONFIG_MARKER_START);
  const endIndex = content.indexOf(CONFIG_MARKER_END);

  if (startIndex === -1 || endIndex === -1) {
    return content;
  }

  const before = content.substring(0, startIndex).trimEnd();
  const after = content
    .substring(endIndex + CONFIG_MARKER_END.length)
    .trimStart();

  return before + (after ? "\n" + after : "");
}

/**
 * Creates a backup of the shell profile file and cleans up old backups.
 * Keeps only the 5 most recent backups.
 */
async function createBackup(profilePath: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${profilePath}.revenium-backup-${timestamp}`;
  await copyFile(profilePath, backupPath);

  // Clean up old backups - keep only the 5 most recent
  try {
    const { readdir, unlink, stat } = await import("node:fs/promises");
    const { dirname, basename, join } = await import("node:path");

    const dir = dirname(profilePath);
    const baseFilename = basename(profilePath);
    const files = await readdir(dir);

    const backupFiles = files
      .filter((f) => f.startsWith(`${baseFilename}.revenium-backup-`))
      .map((f) => ({ name: f, path: join(dir, f) }));

    if (backupFiles.length > 5) {
      // Get file stats to sort by modification time
      const filesWithStats = await Promise.all(
        backupFiles.map(async (f) => ({
          ...f,
          mtime: (await stat(f.path)).mtime,
        })),
      );

      // Sort by modification time (oldest first)
      filesWithStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      // Delete oldest backups, keeping only 5 most recent
      const toDelete = filesWithStats.slice(0, filesWithStats.length - 5);
      await Promise.all(toDelete.map((f) => unlink(f.path)));
    }
  } catch {
    // Ignore cleanup errors - backup was created successfully
  }
}

/**
 * Updates the shell profile to source the Revenium configuration file.
 * Returns details about the update operation.
 */
export async function updateShellProfile(): Promise<ShellUpdateResult> {
  const shellType = detectShell();

  if (shellType === "unknown") {
    return {
      success: false,
      shellType,
      message:
        "Could not detect shell type. Please manually add the source command to your shell profile.",
    };
  }

  const profilePath = getProfilePath(shellType);

  if (!profilePath) {
    return {
      success: false,
      shellType,
      message: `Could not determine profile path for ${shellType}.`,
    };
  }

  const configPath = getConfigFilePath();

  // Check if already configured
  if (await hasReveniumConfig(profilePath)) {
    await createBackup(profilePath);
    let content = await readFile(profilePath, "utf-8");
    content = removeExistingConfig(content);
    const configBlock = generateConfigBlock(shellType, configPath);
    await writeFile(profilePath, content + configBlock, "utf-8");

    return {
      success: true,
      shellType,
      profilePath,
      message: `Updated existing configuration in ${profilePath}`,
    };
  }

  // Add new configuration
  let content = "";
  if (existsSync(profilePath)) {
    await createBackup(profilePath);
    content = await readFile(profilePath, "utf-8");
  }

  const configBlock = generateConfigBlock(shellType, configPath);
  await writeFile(profilePath, content + configBlock, "utf-8");

  return {
    success: true,
    shellType,
    profilePath,
    message: `Added configuration to ${profilePath}`,
  };
}

/**
 * Gets instructions for manual shell profile configuration.
 */
export function getManualInstructions(shellType: ShellType): string {
  const configPath = getConfigFilePath();
  // For Fish shell, use .fish file instead of .env
  const actualConfigPath =
    shellType === "fish" ? configPath.replace(/\.env$/, ".fish") : configPath;
  const sourceCmd = getSourceCommand(shellType, actualConfigPath);
  const profilePath = getProfilePath(shellType);

  return `Add the following to ${profilePath || "your shell profile"}:\n\n${sourceCmd}`;
}
