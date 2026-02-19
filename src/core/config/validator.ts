import { API_KEY_PREFIX } from "../../utils/constants.js";
import type { ReveniumConfig, ValidationResult } from "../../types/index.js";

/**
 * Validates that an API key has the correct format.
 * Valid format: hak_{tenant}_{random}
 */
export function validateApiKey(apiKey: string): ValidationResult {
  const errors: string[] = [];

  if (!apiKey || apiKey.trim() === "") {
    errors.push("API key is required");
    return { valid: false, errors };
  }

  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    errors.push(`API key must start with "${API_KEY_PREFIX}"`);
  }

  // Check for at least two underscores (hak_tenant_random)
  const parts = apiKey.split("_");
  if (parts.length < 3) {
    errors.push("API key format should be: hak_{tenant}_{key}");
  }

  // Minimum length check
  if (apiKey.length < 12) {
    errors.push("API key appears too short");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an email address format.
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || email.trim() === "") {
    return { valid: true, errors: [] };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    errors.push("Invalid email format");
  }

  if (email.length > 254) {
    errors.push("Email address is too long (max 254 characters)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a complete Revenium configuration.
 */
export function validateConfig(
  config: Partial<ReveniumConfig>,
): ValidationResult {
  const allErrors: string[] = [];

  const apiKeyResult = validateApiKey(config.apiKey || "");
  allErrors.push(...apiKeyResult.errors);

  const emailResult = validateEmail(config.email || "");
  allErrors.push(...emailResult.errors);

  if (!config.endpoint || config.endpoint.trim() === "") {
    allErrors.push("Endpoint URL is required");
  } else {
    try {
      const url = new URL(config.endpoint);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        allErrors.push("Endpoint must use HTTP or HTTPS protocol");
      } else if (
        url.protocol !== "https:" &&
        url.hostname !== "localhost" &&
        url.hostname !== "127.0.0.1"
      ) {
        allErrors.push("Endpoint must use HTTPS (except for localhost)");
      }
      if (url.username || url.password) {
        allErrors.push(
          "Endpoint must not contain embedded credentials (username:password)",
        );
      }
    } catch {
      allErrors.push("Invalid endpoint URL format");
    }
  }

  if (config.organizationName && config.organizationName.length > 255) {
    allErrors.push("Organization name is too long (max 255 characters)");
  }

  if (config.productName && config.productName.length > 255) {
    allErrors.push("Product name is too long (max 255 characters)");
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
