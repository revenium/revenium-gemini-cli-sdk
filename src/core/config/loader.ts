import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  GEMINI_CONFIG_DIR,
  REVENIUM_ENV_FILE,
  ENV_VARS,
  OTLP_PATH,
  REVENIUM_API_KEY_ATTR,
} from "../../utils/constants.js";
import type { ReveniumConfig } from "../../types/index.js";
import { detectShell } from "../shell/detector.js";

export function getConfigPath(): string {
  return join(homedir(), GEMINI_CONFIG_DIR, REVENIUM_ENV_FILE);
}

/**
 * Gets the config path for the current shell.
 * Returns .fish for Fish shell, .env for others.
 */
function getShellSpecificConfigPath(): string {
  const shellType = detectShell();
  if (shellType === "fish") {
    return join(homedir(), GEMINI_CONFIG_DIR, "revenium.fish");
  }
  return getConfigPath();
}

export function configExists(): boolean {
  // Check if either .env or shell-specific config exists
  const envPath = getConfigPath();
  const shellPath = getShellSpecificConfigPath();
  return existsSync(envPath) || existsSync(shellPath);
}

function parseEnvContent(
  content: string,
  isFish = false,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    let trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Handle both POSIX (export VAR=value) and Fish (set -gx VAR value) syntax
    if (isFish && trimmed.startsWith("set -gx ")) {
      trimmed = trimmed.substring(8).trim();
      // Fish format: set -gx KEY 'value' or set -gx KEY value
      const spaceIndex = trimmed.indexOf(" ");
      if (spaceIndex === -1) continue;

      const key = trimmed.substring(0, spaceIndex).trim();
      let value = trimmed.substring(spaceIndex + 1).trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
        // Unescape Fish-style escapes: \' becomes ' and \\ becomes \
        value = value.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      }

      result[key] = value;
    } else {
      // POSIX format: export KEY=value or KEY=value
      if (trimmed.startsWith("export ")) {
        trimmed = trimmed.substring(7).trim();
      }

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) {
        continue;
      }

      const key = trimmed.substring(0, equalsIndex).trim();
      let value = trimmed.substring(equalsIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
        // Unescape shell-escaped single quotes: '\'' becomes '
        // Pattern matches the exact sequence produced by escapeShellValue
        value = value.replace(/'\\''/g, "'");
      }

      result[key] = value;
    }
  }

  return result;
}

/**
 * Extracts the API key from OTEL_RESOURCE_ATTRIBUTES value.
 * Format: "revenium.api_key=hak_xxx,other=value"
 */
function extractApiKeyFromResourceAttrs(attrs: string): string | undefined {
  const pairs = attrs.split(",");
  for (const pair of pairs) {
    const equalsIndex = pair.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = pair.substring(0, equalsIndex).trim();
    const value = pair.substring(equalsIndex + 1).trim();

    if (key === REVENIUM_API_KEY_ATTR && value) {
      return value;
    }
  }
  return undefined;
}

function extractBaseEndpoint(fullEndpoint: string): string {
  try {
    const url = new URL(fullEndpoint);
    const path = url.pathname;
    if (path.includes("/meter/v2/otlp") || path.includes("/meter/v2/ai/otlp")) {
      url.pathname = "";
    }
    return url.origin;
  } catch {
    return fullEndpoint;
  }
}

export async function loadConfig(): Promise<ReveniumConfig | null> {
  // Try to load shell-specific config first, fallback to .env
  const shellPath = getShellSpecificConfigPath();
  const envPath = getConfigPath();
  const shellType = detectShell();

  let configPath = envPath;
  let isFish = false;

  // Prefer shell-specific config if it exists
  if (existsSync(shellPath)) {
    configPath = shellPath;
    isFish = shellType === "fish";
  } else if (!existsSync(envPath)) {
    return null;
  }

  try {
    const content = await readFile(configPath, "utf-8");
    const env = parseEnvContent(content, isFish);

    const fullEndpoint = env[ENV_VARS.TELEMETRY_OTLP_ENDPOINT] || "";
    const resourceAttrs = env[ENV_VARS.RESOURCE_ATTRIBUTES] || "";
    const apiKey = extractApiKeyFromResourceAttrs(resourceAttrs);

    if (!apiKey) {
      return null;
    }

    const costMultiplierStr = env[ENV_VARS.COST_MULTIPLIER];
    let costMultiplier: number | undefined = undefined;
    if (costMultiplierStr) {
      const parsed = parseFloat(costMultiplierStr);
      if (isFinite(parsed) && parsed > 0) {
        costMultiplier = parsed;
      }
    }

    return {
      apiKey,
      endpoint: extractBaseEndpoint(fullEndpoint),
      email: env[ENV_VARS.SUBSCRIBER_EMAIL],
      organizationName: env[ENV_VARS.ORGANIZATION_NAME],
      productName: env[ENV_VARS.PRODUCT_NAME],
      costMultiplier,
    };
  } catch {
    return null;
  }
}

export function isEnvLoaded(): boolean {
  return (
    process.env[ENV_VARS.TELEMETRY_ENABLED] === "true" &&
    !!process.env[ENV_VARS.TELEMETRY_OTLP_ENDPOINT] &&
    !!process.env[ENV_VARS.RESOURCE_ATTRIBUTES]
  );
}

export function getFullOtlpEndpoint(baseUrl: string): string {
  const cleanUrl = baseUrl.replace(/\/$/, "");
  return `${cleanUrl}${OTLP_PATH}`;
}
