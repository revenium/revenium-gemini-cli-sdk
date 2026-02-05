import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testCommand } from "../../src/cli/commands/test.js";
import * as loader from "../../src/core/config/loader.js";
import * as client from "../../src/core/api/client.js";

vi.mock("../../src/core/config/loader.js");
vi.mock("../../src/core/api/client.js");
vi.mock("chalk", () => ({
  default: {
    bold: (str: string) => str,
    green: {
      bold: (str: string) => str,
    },
    red: (str: string) => str,
    yellow: (str: string) => str,
    dim: (str: string) => str,
  },
}));
vi.mock("ora", () => ({
  default: () => ({
    start: () => ({
      succeed: vi.fn(),
      fail: vi.fn(),
    }),
  }),
}));

describe("testCommand", () => {
  let mockExit: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockExit = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
      throw new Error(`process.exit unexpectedly called with "${code}"`);
    });
  });

  afterEach(() => {
    if (mockExit) {
      mockExit.mockRestore();
    }
  });

  it("should exit with error when config does not exist", async () => {
    vi.mocked(loader.configExists).mockReturnValue(false);

    await expect(testCommand()).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
  });

  it("should exit with error when config cannot be loaded", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.loadConfig).mockResolvedValue(null);

    await expect(testCommand()).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
  });

  it("should send test payload successfully", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
    });
    vi.mocked(client.generateTestSessionId).mockReturnValue("test-session-123");
    vi.mocked(client.createTestPayload).mockReturnValue({
      resourceLogs: [],
    });
    vi.mocked(client.sendOtlpLogs).mockResolvedValue({
      id: "metric-123",
      resourceType: "gemini-cli-metering",
      processedEvents: 1,
      created: "2024-01-01T00:00:00Z",
    });

    await testCommand();

    expect(client.sendOtlpLogs).toHaveBeenCalledWith(
      "https://api.revenium.ai",
      "hak_test123",
      { resourceLogs: [] },
    );
  });

  it("should include organizationName and productName in payload", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
      organizationName: "org-123",
      productName: "prod-456",
    });
    vi.mocked(client.generateTestSessionId).mockReturnValue("test-session-123");
    vi.mocked(client.createTestPayload).mockReturnValue({
      resourceLogs: [],
    });
    vi.mocked(client.sendOtlpLogs).mockResolvedValue({
      id: "metric-123",
      resourceType: "gemini-cli-metering",
      processedEvents: 1,
      created: "2024-01-01T00:00:00Z",
    });

    await testCommand();

    expect(client.createTestPayload).toHaveBeenCalledWith("test-session-123", {
      apiKey: "hak_test123",
      email: undefined,
      organizationName: "org-123",
      productName: "prod-456",
      costMultiplier: undefined,
    });
  });

  it("should include costMultiplier in payload", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
      costMultiplier: 0.8,
    });
    vi.mocked(client.generateTestSessionId).mockReturnValue("test-session-123");
    vi.mocked(client.createTestPayload).mockReturnValue({
      resourceLogs: [],
    });
    vi.mocked(client.sendOtlpLogs).mockResolvedValue({
      id: "metric-123",
      resourceType: "gemini-cli-metering",
      processedEvents: 1,
      created: "2024-01-01T00:00:00Z",
    });

    await testCommand();

    expect(client.createTestPayload).toHaveBeenCalledWith("test-session-123", {
      apiKey: "hak_test123",
      email: undefined,
      organizationName: undefined,
      productName: undefined,
      costMultiplier: 0.8,
    });
  });

  it("should handle API errors gracefully", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
    });
    vi.mocked(client.generateTestSessionId).mockReturnValue("test-session-123");
    vi.mocked(client.createTestPayload).mockReturnValue({
      resourceLogs: [],
    });
    vi.mocked(client.sendOtlpLogs).mockRejectedValue(
      new Error("Network error"),
    );

    await expect(testCommand()).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
  });
});
