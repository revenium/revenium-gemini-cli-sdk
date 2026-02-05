/**
 * Constants for the Revenium Gemini CLI Metering package
 */

/** Default Revenium API base URL */
export const DEFAULT_REVENIUM_URL = 'https://api.revenium.ai';

/** Path appended to base URL for OTLP endpoint */
export const OTLP_PATH = '/meter/v2/otlp';

/** API key prefix required for valid Revenium API keys */
export const API_KEY_PREFIX = 'hak_';

/** Directory for Gemini CLI configuration */
export const GEMINI_CONFIG_DIR = '.gemini';

/** Filename for Revenium environment configuration */
export const REVENIUM_ENV_FILE = 'revenium.env';

/** File permissions for config file (owner read/write only) */
export const CONFIG_FILE_MODE = 0o600;

/** Environment variable names for Gemini CLI telemetry */
export const ENV_VARS = {
  // Gemini CLI telemetry settings
  TELEMETRY_ENABLED: 'GEMINI_TELEMETRY_ENABLED',
  TELEMETRY_TARGET: 'GEMINI_TELEMETRY_TARGET',
  TELEMETRY_OTLP_ENDPOINT: 'GEMINI_TELEMETRY_OTLP_ENDPOINT',
  TELEMETRY_OTLP_PROTOCOL: 'GEMINI_TELEMETRY_OTLP_PROTOCOL',
  TELEMETRY_LOG_PROMPTS: 'GEMINI_TELEMETRY_LOG_PROMPTS',
  // OTEL resource attributes (used for API key since Gemini CLI doesn't support OTLP headers)
  RESOURCE_ATTRIBUTES: 'OTEL_RESOURCE_ATTRIBUTES',
  // Revenium-specific
  SUBSCRIBER_EMAIL: 'REVENIUM_SUBSCRIBER_EMAIL',
  ORGANIZATION_ID: 'REVENIUM_ORGANIZATION_ID',
  PRODUCT_ID: 'REVENIUM_PRODUCT_ID',
} as const;

/** Resource attribute key for Revenium API key */
export const REVENIUM_API_KEY_ATTR = 'revenium.api_key';
