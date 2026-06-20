# 11ty CMS

A self-hosted, Dockerized content management system for sites built with [Eleventy (11ty)](https://www.11ty.dev/) and hosted on GitHub Pages.

The CMS runs on your own VPS. It clones your site repos locally, lets you edit content through a clean web UI, then pushes changes back to GitHub — where a GitHub Actions workflow builds the 11ty site and deploys to GitHub Pages via `/docs`.

![11ty CMS screenshot](https://via.placeholder.com/900x500?text=11ty+CMS)

---

## Features

- **Multi-site** — manage as many 11ty sites as you want from one dashboard
- **File browser** — sidebar tree with folder collapsing and live search/filter
- **Markdown editor** — full EasyMDE editor with live preview and side-by-side mode
- **Frontmatter editor** — auto-detected fields (text, boolean, date, number, tags/arrays) with add/remove support
- **Frontmatter defaults** — define default fields per site and per folder so they pre-populate automatically
- **Media library** — upload, preview, and insert images; auto-optimized on upload via sharp
- **Rename & delete files** — full file management without touching the command line
- **Git history per file** — see the last 15 commits for any file
- **Publish** — commit and push to GitHub with one click; GitHub Actions builds and deploys
- **Draft saves** — save locally without pushing (Cmd+S / Ctrl+S)
- **Word count** — live word and line count in the editor status bar
- **GitHub Actions setup** — automatically writes a build workflow to new repos on first clone
- **Cloudflare Tunnel ready** — no open ports required on your VPS
- **Docker** — single `docker compose up -d` deployment

---

## Requirements

- A VPS (any Linux distro) with Docker installed
- A GitHub account with a personal access token (repo scope)
- One or more 11ty site repos on GitHub, configured to build to `/docs` for GitHub Pages
- (Optional) A Cloudflare account for tunnel-based HTTPS access

---

## Quick Start (local dev)

```bash
git clone https://github.com/Raylu42x/11ty-cms.git
cd 11ty-cms
npm install

cp .env.example .env
# Edit .env — set SESSION_SECRET, ADMIN_PASSWORD_HASH, and GITHUB_TOKEN

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
| `PORT` | No | Port to listen on (default: 3000) |
| `SESSION_SECRET` | Yes | Long random string for session signing |
| `ADMIN_PASSWORD_HASH` | Yes | bcrypt hash of your admin password |
| `GITHUB_TOKEN` | Yes | GitHub PAT with `repo` scope for git push |
| `GIT_USER_NAME` | No | Name used for CMS commits (default: `CMS Bot`) |
| `GIT_USER_EMAIL` | No | Email used for CMS commits |
| `REPOS_DIR` | No | Where repos are cloned. Defaults to `./repos/`. Set to `/repos` in Docker. |

---

## VPS Deployment

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### 2. Clone and configure

```bash
git clone https://github.com/Raylu42x/11ty-cms.git /opt/11ty-cms
cd /opt/11ty-cms
cp .env.example .env
nano .env   # fill in your values
```

### 3. Start

```bash
docker compose up -d
docker compose logs -f   # watch for errors
```

The `repos/` and `config/` directories are mounted as Docker volumes and persist across restarts.

---

## Cloudflare Tunnel (recommended — no open ports)

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

cloudflared tunnel login
cloudflared tunnel create my-cms
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

In your Cloudflare DNS dashboard, add a CNAME record:
- **Name:** `cms`
- **Target:** `<YOUR-TUNNEL-UUID>.cfargotunnel.com`
- **Proxy:** on

---

## Adding a Site

Once the CMS is running:

1. Click **⚙ Sites** in the header
2. Fill in the **Add a site** form:
   - **Display name** — anything you want
   - **GitHub repo URL** — HTTPS clone URL of your 11ty site repo
   - **Content directory** — folder containing your markdown files (e.g. `src`)
   - **Media directory** — folder for uploaded images (e.g. `src/images`)
   - **Branch** — usually `main`
   - **Live site URL** — optional, enables the "Visit site ↗" button
3. Click **Add & Clone**

The CMS will clone the repo and write a GitHub Actions workflow to `.github/workflows/build.yml` if one doesn't already exist. Publish the workflow with your next **Publish**.

---

## GitHub Actions Workflow

The auto-generated workflow:
- Triggers on pushes to `main` that touch `src/**` or config files
- Runs `npm ci` and `npx @11ty/eleventy --output=docs`
- Commits the `/docs` output back to the repo (with `[skip ci]` to avoid loops)
- GitHub Pages serves the `/docs` folder

You can customise it after the first publish by editing `.github/workflows/build.yml` in your site repo.

---

## Frontmatter Defaults

Open **⚙ Sites → Defaults** to define fields that auto-populate when you open or create files:

- **Site-wide** — applies to all files in the site
- **Per folder** — e.g. `posts/` or `projects/` with their own field sets

Existing file values are never overwritten.

---

## License

MIT
