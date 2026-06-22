# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- GitHub issue and PR templates
- Dependabot config (weekly npm, monthly GitHub Actions and Docker)
- Prettier + ESLint config and `npm run format` / `npm run lint` scripts
- GitHub Actions CI workflow running format check, lint, and tests on PRs
- GitHub Actions release workflow publishing multi-arch (`amd64` + `arm64`) Docker images to GHCR on tags
- `/healthz` endpoint and Docker healthcheck
- `.nvmrc` and `engines.node >=20`
- README badges and prebuilt-image quick start
- Smoke tests via `node --test`
- Boot-time warnings for missing `ADMIN_PASSWORD_HASH`, missing `GITHUB_TOKEN`, weak `SESSION_SECRET`, and in-memory session store in production
- Publish-error hints surfaced in the UI for common failures (missing `workflow` scope, auth, repo not found, rebase conflict)
- Optional update-check banner (`UPDATE_CHECK_ENABLED=true`) that pings GitHub once a day for a newer release

## [1.0.0]

Initial release. Multi-site 11ty CMS with file browser, markdown editor, frontmatter defaults, media library, git history, one-click publish, and single-admin auth. Dockerized deploy.
