# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2026-02-19

### Added

- Tool metering support (meterTool, reportToolCall, setToolContext)
- outputFields feature for automatic result extraction
- Fetch timeout to sendOtlpLogs
- Public allowlist for npm publishing

## [0.1.1] - 2026-02-06

### Fixed

- Fixed TypeScript compilation errors for npm publication
- Added missing `costMultiplier` property to `ReveniumConfig` type
- Added missing `organizationName`, `productName`, and `costMultiplier` to `SetupOptions` interface
- Created `src/utils/version.ts` utility to read package version dynamically
- Removed `import.meta` usage for CommonJS compatibility

### Changed

- Simplified CLI entry point to always parse commands

## [0.1.0] - 2026-02-06

### Added

- Initial release of Revenium Gemini CLI SDK
- OpenTelemetry-based integration for Gemini CLI metering
- Support for Bash, Zsh, and Fish shell configurations
- Automatic session tracking and cost attribution
- Environment variable configuration via `OTEL_EXPORTER_OTLP_HEADERS` and `OTEL_RESOURCE_ATTRIBUTES`
- Support for `billingUnit` field (required by Revenium API)
- Cost multiplier validation for decimal values
- Comprehensive security hardening

### Security

- Input validation for all configuration parameters
- Safe handling of API keys and credentials
- Shell injection prevention in configuration scripts
