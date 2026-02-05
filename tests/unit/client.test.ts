import { describe, it, expect } from "vitest";
import {
  createTestPayload,
  generateTestSessionId,
} from "../../src/core/api/client.js";

describe("generateTestSessionId", () => {
  it("should generate unique session IDs", () => {
    const id1 = generateTestSessionId();
    const id2 = generateTestSessionId();
    expect(id1).not.toBe(id2);
  });

  it("should start with test- prefix", () => {
    const id = generateTestSessionId();
    expect(id.startsWith("test-")).toBe(true);
  });
});

describe("createTestPayload", () => {
  const testApiKey = "hak_test_abc123";

  it("should create valid OTLP logs payload", () => {
    const sessionId = "test-session-123";
    const payload = createTestPayload(sessionId, { apiKey: testApiKey });

    expect(payload).toHaveProperty("resourceLogs");
    expect(Array.isArray(payload.resourceLogs)).toBe(true);
    expect(payload.resourceLogs.length).toBeGreaterThan(0);
  });

  it("should include session ID in log attributes", () => {
    const sessionId = "test-session-456";
    const payload = createTestPayload(sessionId, { apiKey: testApiKey });

    const logRecord = payload.resourceLogs[0]?.scopeLogs[0]?.logRecords[0];
    const sessionAttr = logRecord?.attributes?.find(
      (attr) => attr.key === "session.id",
    );

    expect(sessionAttr?.value.stringValue).toBe(sessionId);
  });

  it("should include API key in resource attributes", () => {
    const sessionId = "test-session-apikey";
    const payload = createTestPayload(sessionId, { apiKey: testApiKey });

    const resourceAttrs = payload.resourceLogs[0]?.resource?.attributes || [];
    const apiKeyAttr = resourceAttrs.find(
      (attr) => attr.key === "revenium.api_key",
    );

    expect(apiKeyAttr?.value.stringValue).toBe(testApiKey);
  });

  it("should include email in resource attributes when provided", () => {
    const sessionId = "test-session-789";
    const payload = createTestPayload(sessionId, {
      apiKey: testApiKey,
      email: "test@example.com",
    });

    const resourceAttrs = payload.resourceLogs[0]?.resource?.attributes || [];
    const emailAttr = resourceAttrs.find((attr) => attr.key === "user.email");

    expect(emailAttr?.value.stringValue).toBe("test@example.com");
  });

  it("should include organizationName in resource attributes when provided", () => {
    const sessionId = "test-session-org";
    const payload = createTestPayload(sessionId, {
      apiKey: testApiKey,
      organizationName: "Acme Corp",
    });

    const resourceAttrs = payload.resourceLogs[0]?.resource?.attributes || [];
    const orgAttr = resourceAttrs.find(
      (attr) => attr.key === "organization.name",
    );

    expect(orgAttr?.value.stringValue).toBe("Acme Corp");
  });

  it("should include productName in resource attributes when provided", () => {
    const sessionId = "test-session-prod";
    const payload = createTestPayload(sessionId, {
      apiKey: testApiKey,
      productName: "AI Platform",
    });

    const resourceAttrs = payload.resourceLogs[0]?.resource?.attributes || [];
    const prodAttr = resourceAttrs.find((attr) => attr.key === "product.name");

    expect(prodAttr?.value.stringValue).toBe("AI Platform");
  });

  it("should include costMultiplier in resource attributes", () => {
    const sessionId = "test-session-cost";
    const payload = createTestPayload(sessionId, {
      apiKey: testApiKey,
      costMultiplier: 0.8,
    });

    const resourceAttrs = payload.resourceLogs[0]?.resource?.attributes || [];
    const costAttr = resourceAttrs.find(
      (attr) => attr.key === "cost_multiplier",
    );

    expect(costAttr?.value.stringValue).toBe("0.8");
  });

  it("should use default cost multiplier when not provided", () => {
    const sessionId = "test-session-default";
    const payload = createTestPayload(sessionId, { apiKey: testApiKey });

    const resourceAttrs = payload.resourceLogs[0]?.resource?.attributes || [];
    const costAttr = resourceAttrs.find(
      (attr) => attr.key === "cost_multiplier",
    );

    expect(costAttr?.value.stringValue).toBe("1");
  });

  it("should throw error when apiKey is missing", () => {
    const sessionId = "test-session-no-key";
    expect(() => createTestPayload(sessionId, {})).toThrow(
      "API key is required for test payload",
    );
  });
});
