# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this package, please report it to us.

**DO NOT** create a public GitHub issue for security vulnerabilities.

### How to Report

Email: support@revenium.io

Please include:
- Package name and version
- Description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Suggested fix (if available)

We will review and respond to security reports in a timely manner.

## Security Best Practices

When using this CLI tool:

1. **API Keys**: Never commit API keys to version control
2. **Environment Variables**: The tool stores config in `~/.gemini/revenium.env` with appropriate permissions
3. **PII Handling**: Only email (optional) is sent for attribution - no other PII is transmitted
4. **Network Security**: All connections use HTTPS to api.revenium.ai
5. **Updates**: Keep the package updated to the latest version

## Data Transmission

This tool configures Gemini CLI to send the following telemetry data:
- Session ID (anonymous identifier)
- Model used (e.g., gemini-2.0-flash)
- Token counts (input, output, cached, thought, tool call)
- Timestamps
- Cost multiplier (pricing adjustment)

No conversation content or PII (beyond optional email) is transmitted.

## Additional Resources

- [Revenium Documentation](https://docs.revenium.io)
- [Revenium Privacy Policy](https://www.revenium.ai/privacy)
