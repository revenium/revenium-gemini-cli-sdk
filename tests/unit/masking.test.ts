import { describe, it, expect } from "vitest";
import { maskApiKey, maskEmail } from "../../src/utils/masking.js";

describe("masking", () => {
  describe("maskApiKey", () => {
    it("should mask a normal API key", () => {
      const result = maskApiKey("hak_tenant_abc123xyz");
      expect(result).toBe("hak_***3xyz");
    });

    it("should mask API key showing only prefix and last 4 chars", () => {
      const result = maskApiKey("hak_1234567890abcdef");
      expect(result).toBe("hak_***cdef");
    });

    it("should return *** for short API keys (< 12 chars)", () => {
      expect(maskApiKey("hak_short")).toBe("***");
      expect(maskApiKey("hak_12345")).toBe("***");
      expect(maskApiKey("hak_123456")).toBe("***");
    });

    it("should return *** for exactly 11 chars", () => {
      expect(maskApiKey("hak_1234567")).toBe("***");
    });

    it("should mask API key with exactly 12 chars", () => {
      const result = maskApiKey("hak_12345678");
      expect(result).toBe("hak_***5678");
    });

    it("should return *** for empty string", () => {
      expect(maskApiKey("")).toBe("***");
    });

    it("should handle API keys with special characters", () => {
      const result = maskApiKey("hak_tenant_abc-123_xyz");
      expect(result).toBe("hak_***_xyz");
    });
  });

  describe("maskEmail", () => {
    it("should mask a normal email", () => {
      const result = maskEmail("dev@company.com");
      expect(result).toBe("d***@company.com");
    });

    it("should mask email showing only first char and domain", () => {
      const result = maskEmail("john.doe@example.org");
      expect(result).toBe("j***@example.org");
    });

    it("should return *** for invalid email without @", () => {
      expect(maskEmail("notanemail")).toBe("***");
    });

    it("should return *** for email starting with @", () => {
      expect(maskEmail("@example.com")).toBe("***");
    });

    it("should handle single character before @", () => {
      const result = maskEmail("a@example.com");
      expect(result).toBe("a***@example.com");
    });

    it("should handle long email addresses", () => {
      const result = maskEmail("very.long.email.address@company.com");
      expect(result).toBe("v***@company.com");
    });
  });
});

