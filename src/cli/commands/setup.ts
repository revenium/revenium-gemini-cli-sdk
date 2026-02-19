import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { DEFAULT_REVENIUM_URL } from "../../utils/constants.js";
import { maskApiKey, maskEmail } from "../../utils/masking.js";
import { validateApiKey, validateEmail } from "../../core/config/validator.js";
import { writeConfig } from "../../core/config/writer.js";
import { checkEndpointHealth } from "../../core/api/client.js";
import {
  updateShellProfile,
  getManualInstructions,
} from "../../core/shell/profile-updater.js";
import { detectShell } from "../../core/shell/detector.js";
import type { ReveniumConfig } from "../../types/index.js";

interface SetupOptions {
  apiKey?: string;
  email?: string;
  organizationName?: string;
  productName?: string;
  costMultiplier?: number;
  endpoint?: string;
  skipShellUpdate?: boolean;
}

export async function setupCommand(options: SetupOptions = {}): Promise<void> {
  console.log(chalk.bold("\nRevenium Gemini CLI Metering Setup\n"));
  console.log(
    chalk.dim(
      "This wizard will configure Gemini CLI to export telemetry to Revenium.\n",
    ),
  );

  const config = await collectConfiguration(options);
  const spinner = ora("Testing API key...").start();

  try {
    const healthResult = await checkEndpointHealth(
      config.endpoint,
      config.apiKey,
      {
        email: config.email,
        organizationName: config.organizationName,
        productName: config.productName,
        costMultiplier: config.costMultiplier,
      },
    );

    if (!healthResult.healthy) {
      spinner.fail(`API key validation failed: ${healthResult.message}`);
      console.log(
        chalk.yellow(
          "\nPlease check your API key and try again. If the problem persists, contact support.",
        ),
      );
      process.exit(1);
    }

    spinner.succeed(`API key validated (${healthResult.latencyMs}ms latency)`);
  } catch (error) {
    spinner.fail("Failed to validate API key");
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }

  const writeSpinner = ora("Writing configuration...").start();

  try {
    const { envPath, fishPath } = await writeConfig(config);
    writeSpinner.succeed(
      `Configuration written to ${chalk.cyan(envPath)} and ${chalk.cyan(fishPath)}`,
    );
  } catch (error) {
    writeSpinner.fail("Failed to write configuration");
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
    process.exit(1);
  }

  if (!options.skipShellUpdate) {
    const shellSpinner = ora("Updating shell profile...").start();

    try {
      const shellResult = await updateShellProfile();

      if (shellResult.success) {
        shellSpinner.succeed(shellResult.message);
      } else {
        shellSpinner.warn(shellResult.message);
        const shellType = detectShell();
        console.log(
          chalk.dim(`\nManual setup:\n${getManualInstructions(shellType)}`),
        );
      }
    } catch {
      shellSpinner.warn("Could not update shell profile automatically");
      const shellType = detectShell();
      console.log(
        chalk.dim(`\nManual setup:\n${getManualInstructions(shellType)}`),
      );
    }
  }

  printSuccessMessage(config);
}

async function collectConfiguration(
  options: SetupOptions,
): Promise<ReveniumConfig> {
  const answers = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: "Enter your Revenium API key:",
      when: !options.apiKey,
      validate: (input: string) => {
        const result = validateApiKey(input);
        return result.valid || result.errors.join(", ");
      },
      mask: "*",
    },
    {
      type: "input",
      name: "email",
      message: "Enter your email (for usage attribution, optional):",
      when: !options.email,
      validate: (input: string) => {
        if (!input) return true;
        const result = validateEmail(input);
        return result.valid || result.errors.join(", ");
      },
    },
    {
      type: "input",
      name: "organizationName",
      message: "Organization name (for cost attribution, optional):",
      when: !options.organizationName,
      validate: (input: string) => {
        if (!input) return true;
        const trimmed = input.trim();
        if (trimmed.length === 0) {
          return "Organization name cannot be empty or whitespace-only";
        }
        if (trimmed.length > 255) {
          return "Organization name is too long (max 255 characters)";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "productName",
      message: "Product name (for cost attribution, optional):",
      when: !options.productName,
      validate: (input: string) => {
        if (!input) return true;
        const trimmed = input.trim();
        if (trimmed.length === 0) {
          return "Product name cannot be empty or whitespace-only";
        }
        if (trimmed.length > 255) {
          return "Product name is too long (max 255 characters)";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "costMultiplier",
      message: "Cost multiplier (default: 1.0, optional):",
      when: options.costMultiplier === undefined,
      validate: (input: string) => {
        if (!input) return true;
        const num = Number(input.trim());
        if (isNaN(num) || !isFinite(num)) {
          return "Please enter a valid number";
        }
        if (num <= 0) return "Cost multiplier must be greater than 0";
        return true;
      },
    },
    {
      type: "input",
      name: "endpoint",
      message: "Revenium API endpoint:",
      default: DEFAULT_REVENIUM_URL,
      when: !options.endpoint,
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return "Please enter a valid URL";
        }
      },
    },
  ]);

  const rawEndpoint =
    options.endpoint || answers.endpoint || DEFAULT_REVENIUM_URL;
  let endpoint = rawEndpoint.replace(/\/+$/, "");

  try {
    const url = new URL(endpoint);
    if (url.pathname.includes("/meter")) {
      url.pathname = url.pathname.split("/meter")[0];
      endpoint = url.origin + url.pathname;
    }
  } catch {
    // Ignore URL parsing errors - use cleaned endpoint as-is
  }

  endpoint = endpoint.replace(/\/+$/, "");

  const costMultiplierStr =
    options.costMultiplier !== undefined
      ? options.costMultiplier.toString()
      : answers.costMultiplier;
  const costMultiplier =
    costMultiplierStr && costMultiplierStr.toString().trim()
      ? parseFloat(costMultiplierStr.toString())
      : undefined;

  return {
    apiKey: options.apiKey || answers.apiKey,
    email: options.email || answers.email?.trim() || undefined,
    organizationName:
      options.organizationName?.trim() ||
      answers.organizationName?.trim() ||
      undefined,
    productName:
      options.productName?.trim() || answers.productName?.trim() || undefined,
    costMultiplier:
      costMultiplier !== undefined && !isNaN(costMultiplier)
        ? costMultiplier
        : undefined,
    endpoint,
  };
}

function printSuccessMessage(config: ReveniumConfig): void {
  console.log("\n" + chalk.green.bold("Setup complete!") + "\n");

  console.log(chalk.bold("Configuration:"));
  console.log(`  API Key:    ${maskApiKey(config.apiKey)}`);
  console.log(`  Endpoint:   ${config.endpoint}`);
  if (config.email) {
    console.log(`  Email:      ${maskEmail(config.email)}`);
  }
  if (config.organizationName) {
    console.log(`  Organization: ${config.organizationName}`);
  }
  if (config.productName) {
    console.log(`  Product:    ${config.productName}`);
  }
  if (config.costMultiplier !== undefined) {
    console.log(`  Cost Multiplier: ${config.costMultiplier}`);
  }

  const shellType = detectShell();
  const configFile =
    shellType === "fish" ? "~/.gemini/revenium.fish" : "~/.gemini/revenium.env";

  console.log("\n" + chalk.yellow.bold("Next steps:"));
  console.log("  1. Restart your terminal or run:");
  console.log(chalk.cyan(`     source ${configFile}`));
  console.log(
    "  2. Start using Gemini CLI - telemetry will be sent automatically",
  );
  console.log("  3. Check your usage at https://app.revenium.ai");

  console.log(
    "\n" +
      chalk.dim(
        "Run `revenium-gemini status` to verify the configuration at any time.",
      ),
  );
}
