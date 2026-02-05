# @revenium/gemini-cli-metering

A CLI tool to configure Gemini CLI telemetry export to Revenium for AI usage metering and cost tracking.

## Overview

This package configures Gemini CLI to export OpenTelemetry (OTLP) telemetry data to Revenium's metering infrastructure. This enables:

- **Usage Tracking**: Monitor Gemini CLI API calls, token counts, and model usage
- **Cost Attribution**: Track AI spend per developer, team, or project
- **Real-time Visibility**: See usage data as it happens in the Revenium dashboard

## Installation

```bash
npm install -g @revenium/gemini-cli-metering
```

Or with npx (no install required):

```bash
npx @revenium/gemini-cli-metering setup
```

## Quick Start

### 1. Run the Setup Wizard

```bash
revenium-gemini setup
```

The wizard will prompt you for:
- **API Key**: Your Revenium API key (`hak_...`)
- **Email**: For usage attribution (optional)
- **Organization Name**: For cost attribution by customer or team (optional)
- **Product Name**: For cost attribution by project or product (optional)
- **Cost Multiplier**: Pricing adjustment factor, e.g., `0.8` for 20% discount (optional)

### 2. Restart Your Terminal

The setup automatically updates your shell profile. Either:
- Open a new terminal, OR
- Run: `source ~/.gemini/revenium.env`

### 3. Use Gemini CLI Normally

That's it! Telemetry will be sent to Revenium automatically when you use Gemini CLI.

> **Using an IDE?** If you use Gemini CLI through VS Code, Cursor, Windsurf, or JetBrains IDEs, see [IDE Configuration](#ide-configuration) for additional setup steps.

## Commands

### `revenium-gemini setup`

Interactive setup wizard to configure Gemini CLI metering.

```bash
revenium-gemini setup [options]

Options:
  -k, --api-key <key>          Revenium API key (hak_...)
  -e, --email <email>          Email for usage attribution
  -o, --organization <name>    Organization name for cost attribution
  -p, --product <name>         Product name for cost attribution
  --cost-multiplier <number>   Pricing adjustment factor (default: 1.0)
  --endpoint <url>             Revenium API endpoint (default: https://api.revenium.ai)
  --skip-shell-update          Skip automatic shell profile update
```

**Non-interactive mode:**

```bash
revenium-gemini setup \
  --api-key hak_your_key_here \
  --email developer@company.com \
  --organization "Acme Corp" \
  --product "AI Platform"
```

### `revenium-gemini status`

Check current configuration and endpoint connectivity.

```bash
revenium-gemini status
```

Outputs:
- Current configuration settings
- Endpoint health check
- Authentication status

### `revenium-gemini test`

Send a test metric to verify the integration is working.

```bash
revenium-gemini test [options]

Options:
  -v, --verbose    Show detailed payload information
```

## Configuration

The setup wizard creates `~/.gemini/revenium.env` with the following environment variables:

| Variable | Description |
|----------|-------------|
| `GEMINI_TELEMETRY_ENABLED` | Enables Gemini CLI telemetry export |
| `GEMINI_TELEMETRY_TARGET` | Target type (`local` for custom OTLP endpoint) |
| `GEMINI_TELEMETRY_OTLP_ENDPOINT` | Revenium OTLP endpoint URL |
| `GEMINI_TELEMETRY_OTLP_PROTOCOL` | OTLP protocol (`http`) |
| `GEMINI_TELEMETRY_LOG_PROMPTS` | Include prompts in telemetry |
| `OTEL_EXPORTER_OTLP_HEADERS` | API key authentication header |
| `OTEL_RESOURCE_ATTRIBUTES` | Business metadata for cost attribution |
| `REVENIUM_ORGANIZATION_NAME` | Organization name (optional) |
| `REVENIUM_PRODUCT_NAME` | Product name (optional) |
| `REVENIUM_COST_MULTIPLIER` | Pricing adjustment factor (optional) |

## Cost Attribution

Revenium supports flexible cost attribution to track AI spend across your organization:

| Field | Use Case | Example |
|-------|----------|---------|
| **Organization** | Attribute costs to a customer, team, or business unit | `Acme Corp`, `Engineering Team` |
| **Product** | Track costs by project, application, or service | `Customer Support Bot`, `Code Assistant` |
| **Cost Multiplier** | Apply negotiated discounts or internal chargebacks | `0.8` = 20% discount, `1.2` = 20% markup |

These fields are included in the OTLP resource attributes and appear in Revenium dashboards for filtering and reporting.

## How It Works

1. **Gemini CLI** exports OTLP telemetry when configured with the proper environment variables
2. **This package** generates the configuration file (`~/.gemini/revenium.env`) with the correct settings
3. **Revenium's OTLP endpoint** receives and translates the telemetry
4. **Revenium** processes the data for cost tracking, attribution, and analytics

### Telemetry Data

Gemini CLI exports the following data points:
- Session ID
- Model used (gemini-2.0-flash, gemini-1.5-pro, etc.)
- Input token count
- Output token count
- Cached tokens
- Thought tokens (for reasoning models)
- Tool call tokens
- Request timestamps

## Manual Configuration

If automatic shell profile update fails, add this line to your shell profile:

**Bash** (`~/.bashrc` or `~/.bash_profile`):
```bash
[ -f ~/.gemini/revenium.env ] && source ~/.gemini/revenium.env
```

**Zsh** (`~/.zshrc`):
```zsh
[ -f ~/.gemini/revenium.env ] && source ~/.gemini/revenium.env
```

**Fish** (`~/.config/fish/config.fish`):
```fish
if test -f ~/.gemini/revenium.env
    source ~/.gemini/revenium.env
end
```

## IDE Configuration

If you use Gemini CLI through an IDE's integrated terminal, the shell profile configuration from `revenium-gemini setup` should work automatically - just restart your IDE.

If telemetry isn't working, configure the environment variables directly in your IDE:

### VS Code, Cursor, Windsurf (and other VS Code-based editors)

Add to your `settings.json` (use `terminal.integrated.env.windows` or `.linux` as needed):

```json
{
  "terminal.integrated.env.osx": {
    "GEMINI_TELEMETRY_ENABLED": "true",
    "GEMINI_TELEMETRY_TARGET": "local",
    "GEMINI_TELEMETRY_OTLP_ENDPOINT": "https://api.revenium.ai/meter/v2/otlp",
    "GEMINI_TELEMETRY_OTLP_PROTOCOL": "http",
    "GEMINI_TELEMETRY_LOG_PROMPTS": "true",
    "OTEL_EXPORTER_OTLP_HEADERS": "x-api-key=hak_YOUR_API_KEY_HERE",
    "OTEL_RESOURCE_ATTRIBUTES": "cost_multiplier=1.0,organization.name=YOUR_ORG,product.name=YOUR_PRODUCT"
  }
}
```

**Tip:** Run `revenium-gemini setup` first, then copy the values from `~/.gemini/revenium.env`.

### JetBrains IDEs

Go to **Settings** > **Tools** > **Terminal** > **Environment variables** and add the same variables in semicolon-separated format.

### Other IDEs

Configure these environment variables in your IDE's terminal settings:

| Variable | Value |
|----------|-------|
| `GEMINI_TELEMETRY_ENABLED` | `true` |
| `GEMINI_TELEMETRY_TARGET` | `local` |
| `GEMINI_TELEMETRY_OTLP_ENDPOINT` | `https://api.revenium.ai/meter/v2/otlp` |
| `GEMINI_TELEMETRY_OTLP_PROTOCOL` | `http` |
| `GEMINI_TELEMETRY_LOG_PROMPTS` | `true` |
| `OTEL_EXPORTER_OTLP_HEADERS` | `x-api-key=hak_YOUR_API_KEY` |
| `OTEL_RESOURCE_ATTRIBUTES` | `cost_multiplier=1.0,organization.name=YOUR_ORG,product.name=YOUR_PRODUCT` |

## Troubleshooting

### Telemetry not appearing in Revenium

1. **Check configuration:**
   ```bash
   revenium-gemini status
   ```

2. **Verify environment variables are loaded:**
   ```bash
   echo $GEMINI_TELEMETRY_ENABLED  # Should output: true
   echo $GEMINI_TELEMETRY_OTLP_ENDPOINT  # Should show the Revenium endpoint
   ```

3. **Send a test metric:**
   ```bash
   revenium-gemini test --verbose
   ```

4. **Restart your terminal** - environment variables only load in new sessions

### "API key validation failed"

- Verify your API key starts with `hak_`
- Check that the API key is active in your Revenium dashboard
- Ensure network connectivity to `api.revenium.ai`

### Shell profile not updated

Run the setup with manual instructions:
```bash
revenium-gemini setup --skip-shell-update
```
Then manually add the source line to your shell profile.

## Local Development Testing

For testing against local Revenium infrastructure:

```bash
revenium-gemini setup \
  --api-key hak_your_test_key \
  --endpoint http://localhost:8082
```

Note: The local metering service must be running on port 8082 with Kafka connectivity.

## Requirements

- Node.js >= 18.0.0
- Gemini CLI installed
- Revenium API key (obtain from app.revenium.ai)

## License

MIT

## Support

- Issues: https://github.com/revenium/revenium-gemini-cli-sdk/issues
- Documentation: https://docs.revenium.ai
- Dashboard: https://app.revenium.ai
