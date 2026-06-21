# 11ty CMS

A self-hosted, Dockerized content management system for sites built with [Eleventy (11ty)](https://www.11ty.dev/) and hosted on GitHub Pages.

The CMS runs on your own VPS. It clones your site repos locally, lets you edit content through a clean web UI, then pushes changes back to GitHub — where a GitHub Actions workflow builds the 11ty site and deploys to GitHub Pages via `/docs`.

---

## Features

- **Multi-site** — manage as many 11ty sites as you want from one dashboard
- **File browser** — sidebar tree with folder collapsing and live search/filter
- **Markdown editor** — EasyMDE with live preview, side-by-side mode, and word count
- **Frontmatter editor** — auto-detected field types (text, boolean, date, number, tags) with add/remove
- **Frontmatter defaults** — define default fields per site and per folder; auto-populate on open/create
- **Media library** — upload, preview, and insert images; auto-optimized on upload
- **File management** — rename and delete files without touching the command line
- **Git history** — see the last 15 commits for any open file
- **Publish** — commit and push to GitHub with one click; GitHub Actions builds and deploys
- **Draft saves** — save locally without pushing (Cmd+S / Ctrl+S)
- **GitHub Actions setup** — automatically writes a build workflow to repos on first clone
- **Cloudflare Tunnel ready** — no open ports required on your VPS
- **Docker** — single `docker compose up -d` to deploy

---

## Requirements

- **Node.js 20+** (for local dev)
- **Docker + Docker Compose** (for VPS deployment)
- **Git** installed on the host
- A **GitHub account** with a personal access token (repo scope)
- One or more **11ty site repos** on GitHub
- (Optional) A **Cloudflare account** for tunnel-based HTTPS

---

## Quick Start — Local Dev

```bash
git clone https://github.com/YOUR_USERNAME/11ty-cms.git
cd 11ty-cms
npm install

cp .env.example .env
# Edit .env — at minimum set SESSION_SECRET, ADMIN_PASSWORD_HASH, and GITHUB_TOKEN

npm run dev
# Open http://localhost:3000
```

**Generate a password hash:**
```bash
node -e "require('bcrypt').hash('yourpassword', 12).then(console.log)"
```
Paste the output as `ADMIN_PASSWORD_HASH` in `.env`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port to listen on (default: `3000`) |
| `SESSION_SECRET` | Yes | Long random string — `openssl rand -hex 32` |
| `ADMIN_PASSWORD_HASH` | Yes | bcrypt hash of your admin password |
| `GITHUB_TOKEN` | Yes | GitHub PAT with `repo` scope and 'workflow', used to push to your site repos |
| `GIT_USER_NAME` | No | Name on CMS commits (default: `CMS Bot`) |
| `GIT_USER_EMAIL` | No | Email on CMS commits |
| `REPOS_DIR` | No | Where site repos are cloned. Defaults to `./repos/`. Docker sets this to `/repos`. |

---

## VPS Deployment

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### 2. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/11ty-cms.git /opt/11ty-cms
cd /opt/11ty-cms
cp .env.example .env
nano .env
```

### 3. Start

```bash
docker compose up -d
docker compose logs -f   # watch for errors
```

The `repos/` and `config/` directories are bind-mounted, so your site data and config survive container restarts and upgrades.

---

## Cloudflare Tunnel (recommended — no open ports needed)

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

cloudflared tunnel login
cloudflared tunnel create my-cms
# Note the UUID printed — you'll need it below
```

Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /root/.cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  - hostname: cms.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

In your **Cloudflare DNS** dashboard, add:
- **Type:** CNAME
- **Name:** `cms`
- **Target:** `<YOUR-TUNNEL-UUID>.cfargotunnel.com`
- **Proxy status:** Proxied (orange cloud)

Your CMS will be reachable at `https://cms.yourdomain.com` with no firewall rules or open ports.

---

## Setting Up a Site Repo

Before adding a site to the CMS, your GitHub repo needs GitHub Pages enabled to serve from the `/docs` folder:

1. Go to your repo on GitHub → **Settings → Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `main` — **Folder:** `/docs`
4. Save

The CMS will write a GitHub Actions workflow (`.github/workflows/build.yml`) on first clone that runs `npx @11ty/eleventy --output=docs` and commits the result. You don't need to set this up manually.

---

## Adding a Site in the CMS

1. Click **⚙ Sites** in the header
2. Fill in the **Add a site** form:
   - **Display name** — anything you want to call it
   - **GitHub repo URL** — HTTPS clone URL (e.g. `https://github.com/you/my-site.git`)
   - **Content directory** — folder with your markdown files (e.g. `src`)
   - **Media directory** — folder for uploaded images (e.g. `src/images`)
   - **Branch** — usually `main`
   - **Live site URL** — optional; enables the **Visit site ↗** button in the header
3. Click **Add & Clone**

The repo will be cloned and the GitHub Actions workflow written. Hit **Publish** once to push the workflow file to GitHub.

---

## GitHub Actions Workflow

The auto-generated workflow (also available in `site-template/`):

- Triggers on pushes to `main` that touch `src/**` or Eleventy config files
- Runs `npm ci` and `npx @11ty/eleventy --output=docs`
- Commits the `/docs` output back with `[skip ci]` to avoid loops
- GitHub Pages serves the `/docs` folder

You can customise it after the first publish by editing `.github/workflows/build.yml` directly in your site repo.

---

## Frontmatter Defaults

Open **⚙ Sites → Defaults** next to any site to define fields that auto-populate when opening or creating files:

- **Site-wide** — applies to every file
- **Per folder** — e.g. `posts/` or `projects/` override site-wide defaults

Field values support strings, numbers, booleans (`true`/`false`), and arrays (`["tag1","tag2"]`). Existing values in files are never overwritten.

---

## GitHub Token Permissions

Create a token at **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**. Required scope: `repo` (full control of private repositories — needed to push commits).

The token is stored only in your `.env` file on your VPS and injected into git remote URLs at push time. It is never logged or exposed to the browser.

---

## License

MIT — see [LICENSE](LICENSE).
