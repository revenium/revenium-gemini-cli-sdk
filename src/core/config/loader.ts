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

/**
 * Gets the path to the Revenium configuration file.
 */
export function getConfigPath(): string {
  return join(homedir(), GEMINI_CONFIG_DIR, REVENIUM_ENV_FILE);
}

/**
 * Checks if the configuration file exists.
 */
export function configExists(): boolean {
  return existsSync(getConfigPath());
}

/**
 * Parses an .env file content into key-value pairs.
 */
function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    let trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Handle 'export' prefix
    if (trimmed.startsWith("export ")) {
      trimmed = trimmed.substring(7).trim();
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, equalsIndex).trim();
    let value = trimmed.substring(equalsIndex + 1).trim();

    // Remove surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Parses OTEL_RESOURCE_ATTRIBUTES value into key-value pairs.
 * Format: "key1=value1,key2=value2"
 */
function parseOtelResourceAttributes(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!value || typeof value !== "string") return result;

  const pairs = value.split(",");
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.substring(0, equalsIndex).trim();
    let attrValue = trimmed.substring(equalsIndex + 1).trim();

    try {
      attrValue = decodeURIComponent(attrValue);
    } catch {
      // If decoding fails, use raw value
    }

    if (key) result[key] = attrValue;
  }
  return result;
}

/**
 * Extracts the API key from OTEL_RESOURCE_ATTRIBUTES value.
 * Format: "revenium.api_key=hak_xxx,other=value"
 */
function extractApiKeyFromResourceAttrs(attrs: string): string | undefined {
  const parsed = parseOtelResourceAttributes(attrs);
  return parsed[REVENIUM_API_KEY_ATTR];
}

/**
 * Extracts the base endpoint from the full OTLP endpoint URL.
 * Example: "https://api.revenium.ai/meter/v2/otlp" -> "https://api.revenium.ai"
 */
function extractBaseEndpoint(fullEndpoint: string): string {
  try {
    const url = new URL(fullEndpoint);
    // Remove the OTLP path suffix to get the base URL
    const path = url.pathname;
    if (path.includes("/meter/v2/otlp") || path.includes("/meter/v2/ai/otlp")) {
      url.pathname = "";
    }
    return url.origin;
  } catch {
    return fullEndpoint;
  }
}

/**
 * Loads the Revenium configuration from the .env file.
 * Returns null if the file doesn't exist.
 */
export async function loadConfig(): Promise<ReveniumConfig | null> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = await readFile(configPath, "utf-8");
    const env = parseEnvContent(content);

    const fullEndpoint = env[ENV_VARS.TELEMETRY_OTLP_ENDPOINT] || "";
    const resourceAttrsStr = env[ENV_VARS.RESOURCE_ATTRIBUTES] || "";
    const apiKey = extractApiKeyFromResourceAttrs(resourceAttrsStr);

    if (!apiKey) {
      return null;
    }

    // Parse OTEL_RESOURCE_ATTRIBUTES for org/product (primary source)
    const resourceAttrs = parseOtelResourceAttributes(resourceAttrsStr);

    // Support both .name (preferred) and .id (legacy), with fallback to standalone vars
    const organizationName =
      resourceAttrs["organization.name"] ||
      resourceAttrs["organization.id"] ||
      env[ENV_VARS.ORGANIZATION_ID];

    const productName =
      resourceAttrs["product.name"] ||
      resourceAttrs["product.id"] ||
      env[ENV_VARS.PRODUCT_ID];

    return {
      apiKey,
      endpoint: extractBaseEndpoint(fullEndpoint),
      email: env[ENV_VARS.SUBSCRIBER_EMAIL],
      organizationName,
      organizationId: organizationName, // Keep for backward compatibility
      productName,
      productId: productName, // Keep for backward compatibility
    };
  } catch {
    return null;
  }
}

/**
 * Checks if the environment variables are currently loaded in the shell.
 */
export function isEnvLoaded(): boolean {
  return (
    process.env[ENV_VARS.TELEMETRY_ENABLED] === "true" &&
    !!process.env[ENV_VARS.TELEMETRY_OTLP_ENDPOINT] &&
    !!process.env[ENV_VARS.RESOURCE_ATTRIBUTES]
  );
}

/**
 * Gets the full OTLP endpoint URL from a base URL.
 */
export function getFullOtlpEndpoint(baseUrl: string): string {
  // Remove trailing slash if present
  const cleanUrl = baseUrl.replace(/\/$/, "");
  return `${cleanUrl}${OTLP_PATH}`;
}
