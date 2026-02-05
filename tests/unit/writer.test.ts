import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  writeConfig,
  getConfigFilePath,
} from "../../src/core/config/writer.js";
import { writeFile, mkdir, chmod } from "node:fs/promises";
import { homedir } from "node:os";

vi.mock("node:fs/promises");
vi.mock("node:os");

describe("writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue("/home/user");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("writeConfig", () => {
    it("should create directory with restrictive permissions", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      };

      await writeConfig(config);

      expect(mkdir).toHaveBeenCalledWith("/home/user/.gemini", {
        recursive: true,
        mode: 0o700,
      });
    });

    it("should write both .env and .fish config files", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      };

      const result = await writeConfig(config);

      expect(result.envPath).toBe("/home/user/.gemini/revenium.env");
      expect(result.fishPath).toBe("/home/user/.gemini/revenium.fish");

      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.gemini/revenium.env",
        expect.stringContaining("export GEMINI_TELEMETRY_ENABLED=true"),
        { encoding: "utf-8" },
      );
      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.gemini/revenium.fish",
        expect.stringContaining("set -gx GEMINI_TELEMETRY_ENABLED true"),
        { encoding: "utf-8" },
      );
    });

    it("should include email when provided", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        email: "test@example.com",
      };

      await writeConfig(config);

      const writeFileCall = vi.mocked(writeFile).mock.calls[0];
      const content = writeFileCall[1] as string;

      expect(content).toContain(
        "export REVENIUM_SUBSCRIBER_EMAIL='test@example.com'",
      );
      expect(content).toContain("user.email=test@example.com");
    });

    it("should include organizationName when provided", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        organizationName: "Acme Corp",
      };

      await writeConfig(config);

      const writeFileCall = vi.mocked(writeFile).mock.calls[0];
      const content = writeFileCall[1] as string;

      expect(content).toContain(
        "export REVENIUM_ORGANIZATION_NAME='Acme Corp'",
      );
      expect(content).toContain("organization.name=Acme Corp");
    });

    it("should include productName when provided", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        productName: "AI Platform",
      };

      await writeConfig(config);

      const writeFileCall = vi.mocked(writeFile).mock.calls[0];
      const content = writeFileCall[1] as string;

      expect(content).toContain("export REVENIUM_PRODUCT_NAME='AI Platform'");
      expect(content).toContain("product.name=AI Platform");
    });

    it("should include costMultiplier when provided", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        costMultiplier: 0.8,
      };

      await writeConfig(config);

      const writeFileCall = vi.mocked(writeFile).mock.calls[0];
      const content = writeFileCall[1] as string;

      expect(content).toContain("export REVENIUM_COST_MULTIPLIER='0.8'");
      expect(content).toContain("cost_multiplier=0.8");
    });

    it("should use default cost multiplier when not provided", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      };

      await writeConfig(config);

      const writeFileCall = vi.mocked(writeFile).mock.calls[0];
      const content = writeFileCall[1] as string;

      expect(content).toContain("cost_multiplier=1");
    });

    it("should escape special characters in values", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        organizationName: "Acme, Inc.",
        productName: "AI=Platform",
      };

      await writeConfig(config);

      const writeFileCall = vi.mocked(writeFile).mock.calls[0];
      const content = writeFileCall[1] as string;

      expect(content).toContain("organization.name=Acme%2C Inc.");
      expect(content).toContain("product.name=AI%3DPlatform");
    });
  });

  describe("getConfigFilePath", () => {
    it("should return correct config file path", () => {
      const path = getConfigFilePath();
      expect(path).toBe("/home/user/.gemini/revenium.env");
    });
  });
});
