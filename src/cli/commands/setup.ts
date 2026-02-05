import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { DEFAULT_REVENIUM_URL } from '../../utils/constants.js';
import { maskApiKey, maskEmail } from '../../utils/masking.js';
import { validateApiKey, validateEmail } from '../../core/config/validator.js';
import { writeConfig } from '../../core/config/writer.js';
import { checkEndpointHealth } from '../../core/api/client.js';
import { updateShellProfile, getManualInstructions } from '../../core/shell/profile-updater.js';
import { detectShell } from '../../core/shell/detector.js';
import type { ReveniumConfig } from '../../types/index.js';

interface SetupOptions {
  apiKey?: string;
  email?: string;
  endpoint?: string;
  skipShellUpdate?: boolean;
}

/**
 * Interactive setup wizard for Revenium Gemini CLI metering.
 */
export async function setupCommand(options: SetupOptions = {}): Promise<void> {
  console.log(chalk.bold('\nRevenium Gemini CLI Metering Setup\n'));
  console.log(
    chalk.dim(
      'This wizard will configure Gemini CLI to export telemetry to Revenium.\n'
    )
  );

  // Collect configuration
  const config = await collectConfiguration(options);

  // Validate API key with endpoint
  const spinner = ora('Testing API key...').start();

  try {
    const healthResult = await checkEndpointHealth(config.endpoint, config.apiKey);

    if (!healthResult.healthy) {
      spinner.fail(`API key validation failed: ${healthResult.message}`);
      console.log(
        chalk.yellow(
          '\nPlease check your API key and try again. If the problem persists, contact support.'
        )
      );
      process.exit(1);
    }

    spinner.succeed(
      `API key validated (${healthResult.latencyMs}ms latency)`
    );
  } catch (error) {
    spinner.fail('Failed to validate API key');
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  // Write configuration file
  const writeSpinner = ora('Writing configuration...').start();

  try {
    const configPath = await writeConfig(config);
    writeSpinner.succeed(`Configuration written to ${chalk.cyan(configPath)}`);
  } catch (error) {
    writeSpinner.fail('Failed to write configuration');
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  // Update shell profile
  if (!options.skipShellUpdate) {
    const shellSpinner = ora('Updating shell profile...').start();

    try {
      const shellResult = await updateShellProfile();

      if (shellResult.success) {
        shellSpinner.succeed(shellResult.message);
      } else {
        shellSpinner.warn(shellResult.message);
        const shellType = detectShell();
        console.log(chalk.dim(`\nManual setup:\n${getManualInstructions(shellType)}`));
      }
    } catch (error) {
      shellSpinner.warn('Could not update shell profile automatically');
      const shellType = detectShell();
      console.log(chalk.dim(`\nManual setup:\n${getManualInstructions(shellType)}`));
    }
  }

  // Print success message
  printSuccessMessage(config);
}

async function collectConfiguration(options: SetupOptions): Promise<ReveniumConfig> {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Revenium API key:',
      when: !options.apiKey,
      validate: (input: string) => {
        const result = validateApiKey(input);
        return result.valid || result.errors.join(', ');
      },
      mask: '*',
    },
    {
      type: 'input',
      name: 'email',
      message: 'Enter your email (for usage attribution, optional):',
      when: !options.email,
      validate: (input: string) => {
        if (!input) return true; // Optional
        const result = validateEmail(input);
        return result.valid || result.errors.join(', ');
      },
    },
    {
      type: 'input',
      name: 'endpoint',
      message: 'Revenium API endpoint:',
      default: DEFAULT_REVENIUM_URL,
      when: !options.endpoint,
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
  ]);

  // Normalize endpoint by removing trailing slashes and /meter paths
  const rawEndpoint = options.endpoint || answers.endpoint || DEFAULT_REVENIUM_URL;
  let endpoint = rawEndpoint.replace(/\/+$/, ''); // Remove trailing slashes

  // Strip /meter paths if user included them
  try {
    const url = new URL(endpoint);
    if (url.pathname.includes('/meter')) {
      url.pathname = url.pathname.split('/meter')[0];
      endpoint = url.origin + url.pathname;
    }
  } catch {
    // If URL parsing fails, just use the cleaned endpoint as-is
  }

  // Remove any remaining trailing slashes after path manipulation
  endpoint = endpoint.replace(/\/+$/, '');

  return {
    apiKey: options.apiKey || answers.apiKey,
    email: options.email || answers.email || undefined,
    endpoint,
  };
}

function printSuccessMessage(config: ReveniumConfig): void {
  console.log('\n' + chalk.green.bold('Setup complete!') + '\n');

  console.log(chalk.bold('Configuration:'));
  console.log(`  API Key:    ${maskApiKey(config.apiKey)}`);
  console.log(`  Endpoint:   ${config.endpoint}`);
  if (config.email) {
    console.log(`  Email:      ${maskEmail(config.email)}`);
  }

  console.log('\n' + chalk.yellow.bold('Next steps:'));
  console.log('  1. Restart your terminal or run:');
  console.log(chalk.cyan('     source ~/.gemini/revenium.env'));
  console.log('  2. Start using Gemini CLI - telemetry will be sent automatically');
  console.log('  3. Check your usage at https://app.revenium.ai');

  console.log(
    '\n' +
    chalk.dim(
      'Run `revenium-gemini status` to verify the configuration at any time.'
    )
  );
}
