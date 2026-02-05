import type { OTLPLogsPayload, OTLPResponse, HealthCheckResult } from '../../types/index.js';
import { getFullOtlpEndpoint } from '../config/loader.js';
import { REVENIUM_API_KEY_ATTR } from '../../utils/constants.js';

/**
 * Sends an OTLP logs payload to the Revenium endpoint.
 * Note: API key is included in the payload's resource attributes, not headers,
 * because Gemini CLI doesn't support OTEL_EXPORTER_OTLP_HEADERS.
 */
export async function sendOtlpLogs(
  baseEndpoint: string,
  _apiKey: string, // API key is in the payload resource attributes
  payload: OTLPLogsPayload
): Promise<OTLPResponse> {
  const fullEndpoint = getFullOtlpEndpoint(baseEndpoint);
  const url = `${fullEndpoint}/v1/logs`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OTLP request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json() as Promise<OTLPResponse>;
}

/**
 * Options for creating a test payload.
 */
export interface TestPayloadOptions {
  /** API key for authentication (included in resource attributes) */
  apiKey: string;
  /** Optional subscriber email for attribution */
  email?: string;
}

/**
 * Creates a minimal test OTLP logs payload.
 */
export function createTestPayload(sessionId: string, options: TestPayloadOptions): OTLPLogsPayload {
  const now = Date.now() * 1_000_000; // Convert to nanoseconds

  // Build log record attributes
  const logAttributes: Array<{ key: string; value: { stringValue: string } }> = [
    { key: 'session.id', value: { stringValue: sessionId } },
    { key: 'model', value: { stringValue: 'cli-connectivity-test' } },
    { key: 'input_tokens', value: { stringValue: '0' } },
    { key: 'output_tokens', value: { stringValue: '0' } },
    { key: 'cache_read_tokens', value: { stringValue: '0' } },
    { key: 'cache_creation_tokens', value: { stringValue: '0' } },
    { key: 'cost_usd', value: { stringValue: '0.0' } },
    { key: 'duration_ms', value: { stringValue: '0' } },
  ];

  // Add optional subscriber email
  if (options.email) {
    logAttributes.push({ key: 'user.email', value: { stringValue: options.email } });
  }

  // Build resource attributes (includes API key for authentication)
  const resourceAttributes: Array<{ key: string; value: { stringValue: string } }> = [
    { key: 'service.name', value: { stringValue: 'gemini-cli' } },
    { key: REVENIUM_API_KEY_ATTR, value: { stringValue: options.apiKey } },
  ];

  // Add email to resource attributes too
  if (options.email) {
    resourceAttributes.push({ key: 'user.email', value: { stringValue: options.email } });
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
              name: 'gemini_cli',
              version: '0.1.0',
            },
            logRecords: [
              {
                timeUnixNano: now.toString(),
                body: { stringValue: 'gemini_cli.api_request' },
                attributes: logAttributes,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Generates a unique session ID for test payloads.
 */
export function generateTestSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}`;
}

/**
 * Performs a health check by sending a minimal test payload to the endpoint.
 */
export async function checkEndpointHealth(
  baseEndpoint: string,
  apiKey: string,
  options?: Omit<TestPayloadOptions, 'apiKey'>
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
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Try to extract status code from error message
    const statusMatch = message.match(/(\d{3})/);
    const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined;

    return {
      healthy: false,
      statusCode,
      message,
      latencyMs,
    };
  }
}
