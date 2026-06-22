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
- First-run `/setup` wizard to create the admin password in the browser. Hash is stored in `config/admin.json`.
- Rate-limiting on `/api/auth/*` (20 attempts per 15 minutes)
- README hero screenshot and new "What this isn't", "Backup and Restore", and "FAQ" sections

### Changed

- Default bind interface is now `127.0.0.1` (localhost only). Set `HOST=0.0.0.0` to expose. Docker images set this automatically.
- Replaced `bcrypt` with `bcryptjs` (pure JS — no native build, no `tar` vulnerability, works cleanly on arm64)
- Replaced `express-session` (in-memory) with `cookie-session` (signed cookie, survives restarts, no extra store needed)
- Token-in-git-URL now uses the `https://x-access-token:TOKEN@github.com/...` form for broader compatibility

### Fixed

- Resolved 2 high-severity `tar` advisories by removing `@mapbox/node-pre-gyp` from the dep tree

## [1.0.0]

Initial release. Multi-site 11ty CMS with file browser, markdown editor, frontmatter defaults, media library, git history, one-click publish, and single-admin auth. Dockerized deploy.
