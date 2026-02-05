import { describe, it, expect } from "vitest";
import {
  validateApiKey,
  validateEmail,
  validateConfig,
} from "../../src/core/config/validator.js";

describe("validateApiKey", () => {
  it("should accept valid API key", () => {
    const result = validateApiKey("hak_tenant_abc123xyz");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject empty API key", () => {
    const result = validateApiKey("");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("API key is required");
  });

  it("should reject API key without correct prefix", () => {
    const result = validateApiKey("invalid_key_123");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('API key must start with "hak_"');
  });

  it("should reject API key with incorrect format", () => {
    const result = validateApiKey("hak_only");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "API key format should be: hak_{tenant}_{key}",
    );
  });

  it("should reject too short API key", () => {
    const result = validateApiKey("hak_t_k");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("API key appears too short");
  });
});

describe("validateEmail", () => {
  it("should accept valid email", () => {
    const result = validateEmail("user@example.com");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should accept empty email (optional)", () => {
    const result = validateEmail("");
    expect(result.valid).toBe(true);
  });

  it("should reject invalid email format", () => {
    const result = validateEmail("invalid-email");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid email format");
  });

  it("should reject email with single character TLD", () => {
    const result = validateEmail("user@example.c");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid email format");
  });

  it("should reject email without domain", () => {
    const result = validateEmail("user@");
    expect(result.valid).toBe(false);
  });

  it("should reject email that is too long", () => {
    const longEmail = "a".repeat(250) + "@example.com";
    const result = validateEmail(longEmail);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Email address is too long (max 254 characters)",
    );
  });

  it("should accept email with valid special characters", () => {
    const result = validateEmail("user.name+tag@example.co.uk");
    expect(result.valid).toBe(true);
  });
});

describe("validateConfig", () => {
  it("should accept valid complete config", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://api.revenium.ai",
      email: "user@example.com",
      organizationName: "Acme Corp",
      productName: "AI Platform",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should accept valid minimal config", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://api.revenium.ai",
    });
    expect(result.valid).toBe(true);
  });

  it("should reject config with invalid API key", () => {
    const result = validateConfig({
      apiKey: "invalid",
      endpoint: "https://api.revenium.ai",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject config without endpoint", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Endpoint URL is required");
  });

  it("should reject config with invalid endpoint URL", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "not-a-url",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid endpoint URL format");
  });

  it("should reject HTTP endpoint (non-localhost)", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "http://api.revenium.ai",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Endpoint must use HTTPS (except for localhost)",
    );
  });

  it("should accept HTTP for localhost", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "http://localhost:8080",
    });
    expect(result.valid).toBe(true);
  });

  it("should accept HTTP for 127.0.0.1", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "http://127.0.0.1:8080",
    });
    expect(result.valid).toBe(true);
  });

  it("should reject non-HTTP(S) protocols like ftp", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "ftp://localhost:8080",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Endpoint must use HTTP or HTTPS protocol");
  });

  it("should reject non-HTTP(S) protocols like file", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "file:///tmp/test",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Endpoint must use HTTP or HTTPS protocol");
  });

  it("should reject organizationName that is too long", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://api.revenium.ai",
      organizationName: "a".repeat(256),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Organization name is too long (max 255 characters)",
    );
  });

  it("should accept organizationName with 255 characters", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://api.revenium.ai",
      organizationName: "a".repeat(255),
    });
    expect(result.valid).toBe(true);
  });

  it("should reject productName that is too long", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://api.revenium.ai",
      productName: "a".repeat(256),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Product name is too long (max 255 characters)",
    );
  });

  it("should accept productName with 255 characters", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://api.revenium.ai",
      productName: "a".repeat(255),
    });
    expect(result.valid).toBe(true);
  });

  it("should accumulate multiple validation errors", () => {
    const result = validateConfig({
      apiKey: "invalid",
      endpoint: "http://api.revenium.ai",
      email: "invalid-email",
      organizationName: "a".repeat(256),
      productName: "a".repeat(256),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(3);
  });

  it("should reject endpoint with embedded credentials", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://user:pass@api.revenium.ai",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Endpoint must not contain embedded credentials (username:password)",
    );
  });

  it("should reject endpoint with username only", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://user@api.revenium.ai",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Endpoint must not contain embedded credentials (username:password)",
    );
  });

  it("should accept endpoint without credentials", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://api.revenium.ai",
    });
    expect(result.valid).toBe(true);
  });
});
