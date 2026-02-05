/**
 * @revenium/gemini-cli-metering
 *
 * A CLI tool to configure Gemini CLI telemetry export to Revenium.
 */

// Types
export type {
  ReveniumConfig,
  ValidationResult,
  HealthCheckResult,
  ShellType,
  ShellUpdateResult,
  OTLPLogsPayload,
  OTLPValue,
  OTLPResponse,
} from './types/index.js';

// Config
export { loadConfig, configExists, isEnvLoaded, getConfigPath, getFullOtlpEndpoint } from './core/config/loader.js';
export { writeConfig, getConfigFilePath } from './core/config/writer.js';
export { validateApiKey, validateEmail, validateConfig } from './core/config/validator.js';

// API
export { sendOtlpLogs, createTestPayload, generateTestSessionId, checkEndpointHealth } from './core/api/client.js';

// Shell
export { detectShell, getProfilePath, getSourceCommand } from './core/shell/detector.js';
export { updateShellProfile, getManualInstructions } from './core/shell/profile-updater.js';

// Utils
export { maskApiKey, maskEmail } from './utils/masking.js';
export { DEFAULT_REVENIUM_URL, OTLP_PATH, API_KEY_PREFIX, GEMINI_CONFIG_DIR, REVENIUM_ENV_FILE, ENV_VARS } from './utils/constants.js';
