import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { program } from "../../src/cli/index.js";
import * as setupModule from "../../src/cli/commands/setup.js";
import * as statusModule from "../../src/cli/commands/status.js";
import * as testModule from "../../src/cli/commands/test.js";

vi.mock("../../src/cli/commands/setup.js");
vi.mock("../../src/cli/commands/status.js");
vi.mock("../../src/cli/commands/test.js");

describe("CLI index", () => {
  let mockExit: any;
  let mockConsoleError: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit unexpectedly called with "${code}"`);
    }) as any);
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (mockExit) {
      mockExit.mockRestore();
    }
    if (mockConsoleError) {
      mockConsoleError.mockRestore();
    }
  });

  describe("program metadata", () => {
    it("should have correct name", () => {
      expect(program.name()).toBe("revenium-gemini");
    });

    it("should have description", () => {
      expect(program.description()).toBe(
        "Configure Gemini CLI telemetry export to Revenium",
      );
    });
  });

  describe("setup command costMultiplier validation", () => {
    it("should accept valid decimal with trailing zero (1.0)", async () => {
      vi.mocked(setupModule.setupCommand).mockResolvedValue();

      await program.parseAsync([
        "node",
        "cli",
        "setup",
        "--api-key",
        "hak_test123",
        "--cost-multiplier",
        "1.0",
      ]);

      expect(setupModule.setupCommand).toHaveBeenCalledWith({
        apiKey: "hak_test123",
        email: undefined,
        organizationName: undefined,
        productName: undefined,
        costMultiplier: 1,
        endpoint: undefined,
        skipShellUpdate: undefined,
      });
    });

    it("should accept valid decimal with trailing zeros (0.50)", async () => {
      vi.mocked(setupModule.setupCommand).mockResolvedValue();

      await program.parseAsync([
        "node",
        "cli",
        "setup",
        "--api-key",
        "hak_test123",
        "--cost-multiplier",
        "0.50",
      ]);

      expect(setupModule.setupCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          costMultiplier: 0.5,
        }),
      );
    });

    it("should accept valid decimal (2.00)", async () => {
      vi.mocked(setupModule.setupCommand).mockResolvedValue();

      await program.parseAsync([
        "node",
        "cli",
        "setup",
        "--api-key",
        "hak_test123",
        "--cost-multiplier",
        "2.00",
      ]);

      expect(setupModule.setupCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          costMultiplier: 2,
        }),
      );
    });

    it("should reject invalid string with number prefix (1abc)", async () => {
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "setup",
          "--api-key",
          "hak_test123",
          "--cost-multiplier",
          "1abc",
        ]),
      ).rejects.toThrow('process.exit unexpectedly called with "1"');

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error: --cost-multiplier must be a valid positive number greater than 0",
      );
    });

    it("should reject negative number", async () => {
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "setup",
          "--api-key",
          "hak_test123",
          "--cost-multiplier",
          "-1",
        ]),
      ).rejects.toThrow('process.exit unexpectedly called with "1"');
    });

    it("should reject zero", async () => {
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "setup",
          "--api-key",
          "hak_test123",
          "--cost-multiplier",
          "0",
        ]),
      ).rejects.toThrow('process.exit unexpectedly called with "1"');
    });

    it("should reject non-numeric string", async () => {
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "setup",
          "--api-key",
          "hak_test123",
          "--cost-multiplier",
          "abc",
        ]),
      ).rejects.toThrow('process.exit unexpectedly called with "1"');
    });
  });
});

