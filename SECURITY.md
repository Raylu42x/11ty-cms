# Security Policy

## Reporting a vulnerability

If you find a security issue, **please do not open a public GitHub issue**. Instead, email the maintainer at **sizer_buffer.93@icloud.com** with:

- A description of the issue
- Steps to reproduce
- The potential impact

You should receive a response within a few days. Once the issue is confirmed and fixed, a release will be published and you'll be credited (unless you prefer to remain anonymous).

## Scope

In scope:

- Authentication and session handling
- Path traversal in file/media handling
- Command injection in git operations
- Token leakage (logs, error messages, client responses)
- Dependency vulnerabilities affecting the running server

Out of scope:

- Issues that require an already-authenticated admin (the admin has full filesystem and git access by design)
- Vulnerabilities in user 11ty sites or their GitHub Actions workflows
- Social engineering or physical access

## Supported versions

Only the latest released version receives security fixes.
