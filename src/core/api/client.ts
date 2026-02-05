import type {
  OTLPLogsPayload,
  OTLPResponse,
  HealthCheckResult,
} from "../../types/index.js";
import { getFullOtlpEndpoint } from "../config/loader.js";
import { DEFAULT_COST_MULTIPLIER, REVENIUM_API_KEY_ATTR } from "../../utils/constants.js";
import { getVersion } from "../../utils/version.js";

const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function isRetryableError(error: Error): boolean {
  return (
    error.message.includes("ECONNRESET") ||
    error.message.includes("ETIMEDOUT") ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("network") ||
    error.message.includes("timeout")
  );
}

function isRetryableStatusCode(status: number): boolean {
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeErrorMessage(message: string, apiKey: string): string {
  // Escape regex metacharacters to treat API key as literal string
  const escapedKey = apiKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return message.replace(new RegExp(escapedKey, "g"), "***");
}

export async function sendOtlpLogs(
  baseEndpoint: string,
  apiKey: string,
  payload: OTLPLogsPayload,
): Promise<OTLPResponse> {
  const fullEndpoint = getFullOtlpEndpoint(baseEndpoint);
  const url = `${fullEndpoint}/v1/logs`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        clearTimeout(timeoutId);
        const sanitizedError = sanitizeErrorMessage(errorText, apiKey);

        if (
          isRetryableStatusCode(response.status) &&
          attempt < MAX_RETRIES - 1
        ) {
          lastError = new Error(
            `OTLP request failed: ${response.status} ${response.statusText} - ${sanitizedError}`,
          );
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }

        throw new Error(
          `OTLP request failed: ${response.status} ${response.statusText} - ${sanitizedError}`,
        );
      }

      const result = await response.json();
      clearTimeout(timeoutId);
      return result as OTLPResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          lastError = new Error(
            `Request timeout after ${REQUEST_TIMEOUT_MS}ms`,
          );
        } else {
          lastError = new Error(sanitizeErrorMessage(error.message, apiKey));
        }

        if (isRetryableError(lastError) && attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }

        throw lastError;
      }
      throw error;
    }
  }

  throw lastError || new Error("Request failed after retries");
}

export interface TestPayloadOptions {
  /** API key for authentication (included in resource attributes) */
  apiKey?: string;
  email?: string;
  organizationName?: string;
  productName?: string;
  costMultiplier?: number;
}

export function createTestPayload(
  sessionId: string,
  options: TestPayloadOptions,
): OTLPLogsPayload {
  const version = getVersion();
  const now = BigInt(Date.now()) * 1_000_000n;

  const logAttributes: Array<{ key: string; value: { stringValue: string } }> =
    [
      { key: "session.id", value: { stringValue: sessionId } },
      { key: "model", value: { stringValue: "cli-connectivity-test" } },
      { key: "input_tokens", value: { stringValue: "0" } },
      { key: "output_tokens", value: { stringValue: "0" } },
      { key: "cache_read_tokens", value: { stringValue: "0" } },
      { key: "cache_creation_tokens", value: { stringValue: "0" } },
      { key: "cost_usd", value: { stringValue: "0.0" } },
      { key: "duration_ms", value: { stringValue: "0" } },
    ];

  if (options.email) {
    logAttributes.push({
      key: "user.email",
      value: { stringValue: options.email },
    });
  }

  if (!options.apiKey) {
    throw new Error("API key is required for test payload");
  }

  const resourceAttributes: Array<{
    key: string;
    value: { stringValue: string };
  }> = [
    { key: "service.name", value: { stringValue: "gemini-cli" } },
    { key: REVENIUM_API_KEY_ATTR, value: { stringValue: options.apiKey } },
  ];

  const costMultiplier = options.costMultiplier ?? DEFAULT_COST_MULTIPLIER;
  resourceAttributes.push({
    key: "cost_multiplier",
    value: { stringValue: costMultiplier.toString() },
  });

  if (options.email) {
    resourceAttributes.push({
      key: "user.email",
      value: { stringValue: options.email },
    });
  }

  if (options.organizationName) {
    resourceAttributes.push({
      key: "organization.name",
      value: { stringValue: options.organizationName },
    });
  }

  if (options.productName) {
    resourceAttributes.push({
      key: "product.name",
      value: { stringValue: options.productName },
    });
  }

  return {
    resourceLogs: [
      {
        resource: {
          attributes: resourceAttributes,
        },
        scopeLogs: [
          {
            scope: {
              name: "gemini_cli",
              version,
            },
            logRecords: [
              {
                timeUnixNano: now.toString(),
                body: { stringValue: "gemini_cli.api_response" },
                attributes: logAttributes,
              },
            ],
          },
        ],
      },
    ],
  };
}

export function generateTestSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}`;
}

export async function checkEndpointHealth(
  baseEndpoint: string,
  apiKey: string,
  options?: TestPayloadOptions,
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const sessionId = generateTestSessionId();
    const payload = createTestPayload(sessionId, { apiKey, ...options });
    const response = await sendOtlpLogs(baseEndpoint, apiKey, payload);

    const latencyMs = Date.now() - startTime;

    return {
      healthy: true,
      statusCode: 200,
      message: `Endpoint healthy. Processed ${response.processedEvents} event(s).`,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";
    // Extract HTTP status code only from "OTLP request failed: XXX" pattern
    const statusMatch = message.match(/OTLP request failed: (\d{3})/);
    const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined;

    return {
      healthy: false,
      statusCode,
      message,
      latencyMs,
    };
  }
}
