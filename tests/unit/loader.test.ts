import { describe, it, expect } from "vitest";
import { getFullOtlpEndpoint } from "../../src/core/config/loader.js";

describe("getFullOtlpEndpoint", () => {
  it("should append OTLP path to base URL", () => {
    const result = getFullOtlpEndpoint("https://api.revenium.ai");
    expect(result).toBe("https://api.revenium.ai/meter/v2/otlp");
  });

  it("should handle base URL with trailing slash", () => {
    const result = getFullOtlpEndpoint("https://api.revenium.ai/");
    expect(result).toBe("https://api.revenium.ai/meter/v2/otlp");
  });

  it("should handle localhost", () => {
    const result = getFullOtlpEndpoint("http://localhost:8080");
    expect(result).toBe("http://localhost:8080/meter/v2/otlp");
  });
});

