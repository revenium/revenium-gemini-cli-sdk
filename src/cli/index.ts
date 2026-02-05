#!/usr/bin/env node

import { Command } from 'commander';
import { setupCommand } from './commands/setup.js';
import { statusCommand } from './commands/status.js';
import { testCommand } from './commands/test.js';

const program = new Command();

program
  .name('revenium-gemini')
  .description('Configure Gemini CLI telemetry export to Revenium')
  .version('0.1.0');

program
  .command('setup')
  .description('Interactive setup wizard to configure Gemini CLI metering')
  .option('-k, --api-key <key>', 'Revenium API key (hak_...)')
  .option('-e, --email <email>', 'Email for usage attribution')
  .option('--endpoint <url>', 'Revenium API endpoint URL')
  .option('--skip-shell-update', 'Skip automatic shell profile update')
  .action(async (options) => {
    await setupCommand({
      apiKey: options.apiKey,
      email: options.email,
      endpoint: options.endpoint,
      skipShellUpdate: options.skipShellUpdate,
    });
  });

program
  .command('status')
  .description('Check current configuration and endpoint connectivity')
  .action(async () => {
    await statusCommand();
  });

program
  .command('test')
  .description('Send a test metric to verify the integration')
  .option('-v, --verbose', 'Show detailed payload information')
  .action(async (options) => {
    await testCommand({ verbose: options.verbose });
  });

program.parse();
