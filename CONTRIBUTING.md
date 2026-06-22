# Contributing

Thanks for your interest in improving 11ty CMS.

## Local development

```bash
git clone https://github.com/Raylu42x/11ty-cms.git
cd 11ty-cms
npm install
cp .env.example .env
```

Generate an admin password hash and paste it into `.env` as `ADMIN_PASSWORD_HASH`:

```bash
node -e "console.log(require('bcrypt').hashSync('your-password-here', 10))"
```

Add a GitHub Personal Access Token with `repo` and `workflow` scopes to `.env` as `GITHUB_TOKEN`, then:

```bash
npm run dev
```

The app runs on `http://localhost:3000` (or the `PORT` you set).

## Filing issues

Use the bug report or feature request templates. For bugs, please include:

- What you did, what you expected, what happened
- Relevant entries from `config/sites.json` (redact tokens)
- Whether you're running via Docker or `node` directly
- Any error output from the server console

## Pull requests

- Keep PRs focused — one concern per PR
- Match existing code style (vanilla JS, CommonJS on the server, no build step on the frontend)
- Don't introduce new dependencies without a clear reason
- Update the README if you change setup, env vars, or user-facing behavior
- Test the publish flow against a real (test) repo before submitting changes to `server/git.js`

## What's in scope

- Bug fixes
- UX improvements to the editor, file browser, and publish flow
- Better error messages
- Documentation
- Docker / deploy ergonomics

## What's out of scope (for now)

- Multi-user / RBAC — single-admin is intentional
- Database backends — git is the database
- Non-GitHub providers (GitLab, Gitea) unless behind a clean abstraction
- Build-step frontends (React, Vue, etc.)
