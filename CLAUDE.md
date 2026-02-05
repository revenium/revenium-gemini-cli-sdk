# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@revenium/gemini-cli-metering`, a CLI tool that configures Gemini CLI to export OpenTelemetry (OTLP) telemetry to Revenium for AI usage metering and cost tracking. It enables organizations to monitor Gemini CLI API calls, token counts, and model usage.

## Commands

```bash
# Build TypeScript to dist/
npm run build

# Development mode with watch
npm run dev

# Run all tests
npm test

# Run single test file
npx vitest run tests/unit/loader.test.ts

# Run tests in watch mode
npm run test:watch

# Lint source files
npm run lint

# Format code
npm run format

# Run the CLI locally (after build)
npm run cli -- <command>
# or
node dist/cli/index.js <command>
```

## Architecture

### Entry Points
- `src/cli/index.ts` - CLI entry point using Commander.js, defines commands: setup, status, test
- `src/index.ts` - Library entry point, re-exports all modules for programmatic use

### Core Modules

**Config (`src/core/config/`)**
- `loader.ts` - Reads `~/.gemini/revenium.env`, parses env files, extracts API key from headers
- `writer.ts` - Generates and writes the revenium.env file with OTLP configuration
- `validator.ts` - Validates API keys (must start with `hak_`) and emails

**API (`src/core/api/`)**
- `client.ts` - Sends OTLP logs to Revenium, health checks, test payload generation

**Shell (`src/core/shell/`)**
- `detector.ts` - Detects shell type (bash/zsh/fish) from $SHELL or rc files
- `profile-updater.ts` - Updates shell profiles to source revenium.env

### CLI Commands (`src/cli/commands/`)
- `setup.ts` - Interactive wizard using inquirer for initial configuration
- `status.ts` - Shows current config and tests endpoint connectivity
- `test.ts` - Sends a test metric to verify integration

### Types and Constants
- `src/types/index.ts` - TypeScript interfaces for ReveniumConfig, OTLP payloads, etc.
- `src/utils/constants.ts` - Default URLs, env var names for Gemini CLI

### Key Data Flow
1. Setup wizard collects API key and optional email
2. Config is written to `~/.gemini/revenium.env` with Gemini telemetry env vars
3. Shell profile is updated to source the env file
4. Gemini CLI reads these env vars and exports telemetry to Revenium's OTLP endpoint

### OTLP Endpoint Path
The OTLP endpoint path is defined in `constants.ts` as `OTLP_PATH = '/meter/v2/otlp'`. The full endpoint URL for logs is `{base}/meter/v2/otlp/v1/logs`.

### Gemini CLI Environment Variables
- `GEMINI_TELEMETRY_ENABLED` - Enable telemetry (true/false)
- `GEMINI_TELEMETRY_TARGET` - Target type (local for custom OTLP)
- `GEMINI_TELEMETRY_OTLP_ENDPOINT` - OTLP endpoint URL
- `GEMINI_TELEMETRY_OTLP_PROTOCOL` - Protocol (http/grpc)
- `GEMINI_TELEMETRY_LOG_PROMPTS` - Include prompts in telemetry
- `OTEL_EXPORTER_OTLP_HEADERS` - Authentication headers

## Testing

Tests are in `tests/unit/` using Vitest. Test files should import from source with `.js` extension (NodeNext module resolution).

```typescript
import { describe, it, expect } from 'vitest';
import { someFunction } from '../../src/module/file.js';
```

## Module System

The project uses ES modules with NodeNext resolution. All imports must use `.js` extension even for TypeScript files:

```typescript
import { something } from './other-file.js';  // correct
import { something } from './other-file';     // incorrect
```
