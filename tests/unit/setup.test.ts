import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("inquirer");
vi.mock("../../src/core/config/writer.js");
vi.mock("../../src/core/api/client.js");
vi.mock("../../src/core/shell/profile-updater.js");
vi.mock("../../src/core/shell/detector.js");
vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    text: "",
  })),
}));

import { setupCommand } from "../../src/cli/commands/setup.js";
import inquirer from "inquirer";
import * as writer from "../../src/core/config/writer.js";
import * as client from "../../src/core/api/client.js";
import * as profileUpdater from "../../src/core/shell/profile-updater.js";
import * as detector from "../../src/core/shell/detector.js";

describe("setupCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Setup Flow", () => {
    it("should complete setup with minimal config", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 50,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.gemini/revenium.env",
      );

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: true,
        shellType: "bash",
        message: "Updated",
      });

      await setupCommand({});

      expect(writer.writeConfig).toHaveBeenCalledWith({
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      });
    });

    it("should include optional fields when provided", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        email: "test@example.com",
        organizationName: "Acme Corp",
        productName: "AI Platform",
        costMultiplier: "0.8",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 50,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.gemini/revenium.env",
      );

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: true,
        shellType: "bash",
        message: "Updated",
      });

      await setupCommand({});

      expect(writer.writeConfig).toHaveBeenCalledWith({
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        email: "test@example.com",
        organizationName: "Acme Corp",
        productName: "AI Platform",
        costMultiplier: 0.8,
      });
    });
  });

  describe("API Key Validation", () => {
    it("should exit on invalid API key", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "invalid_key",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: false,
        statusCode: 401,
        message: "Unauthorized",
        latencyMs: 50,
      });

      await expect(setupCommand({})).rejects.toThrow("process.exit(1)");
    });

    it("should validate API key with endpoint", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 50,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.gemini/revenium.env",
      );

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: true,
        shellType: "bash",
        message: "Updated",
      });

      await setupCommand({});

      expect(client.checkEndpointHealth).toHaveBeenCalledWith(
        "https://api.revenium.ai",
        "hak_test123",
        expect.any(Object),
      );
    });
  });
});
