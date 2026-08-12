# Deployment Guide - openDesk Edu Landscape

# Deployment Guide - openDesk Edu Landscape

## Current Status

✅ **Live**: <https://landscape.opendesk-edu.org> (HTTP 200, 109 services)

The site is served by the **`landscape-opendesk-edu`** Docker container on the
production host (178.254.2.90 / v22290.1blu.de), built from the git checkout
at `/opt/landscape` (docker-compose project) and routed by a **Traefik
docker-label** router (priority 100) with TLS via `mytlschallenge`.

> ⚠️ The old `hugo-chemie-lernen-org` based deployment (bind-mounted
> `/opt/git/hugo-chemie-lernen-org/myhugoapp/static/landscape`) is **not**
> the live path — its Traefik file-provider router loses to the docker-label
> router. Do not use it.

## Deploying

Use `scripts/deploy-landscape.sh` (rewritten for the real infra). It:

1. Runs a **pre-deploy gate**: validates `data/services.yaml` (YAML → JS),
   optionally the full unit suite (`RUN_TESTS=1`)
2. `git pull --ff-only origin main` into `/opt/landscape` (refuses to
   fast-forward over local changes)
3. Preserves the current image as `landscape-opendesk-edu:previous` for
   instant rollback
4. `docker compose build && docker compose up -d`
5. Verifies the live site: HTTP 200, service count ≥ 109, World-Office
   present, no ONLYOFFICE references, spot-checked logos

```bash
# on the production host
bash /opt/landscape/scripts/deploy-landscape.sh

# from a dev machine (copies & runs the script on the host)
DEPLOY_HOST=root@178.254.2.90 bash scripts/deploy-landscape.sh

# knobs
DRY_RUN=1      # plan only, change nothing
SKIP_PULL=1    # deploy the current checkout without pulling
RUN_TESTS=1    # run the vitest unit suite before deploying
```

### Manual deploy

```bash
ssh root@178.254.2.90
cd /opt/landscape
git config --global --add safe.directory /opt/landscape   # if 'dubious ownership'
git pull --ff-only origin main
docker compose build && docker compose up -d
```

### Rollback

```bash
cd /opt/landscape
docker tag landscape-opendesk-edu:previous landscape-opendesk-edu:latest
docker compose up -d
```

## Health Check

```bash
bash /opt/landscape/scripts/health-check.sh        # on the host
bash scripts/health-check.sh                        # from a dev machine
```

## Testing Locally

Before deploying, test the site locally:

```bash
npm test                    # unit + property + E2E (full suite)
python3 -m http.server 8000 # or: npx http-server -p 8000

# Then open http://localhost:8000 in your browser
```
## Features Implemented

✅ **Interactive Visualization**
- Browse services across 5 categories
- Hierarchical category → subcategory → service structure

✅ **Search Functionality**
- Real-time search across names, descriptions, tags
- Case-insensitive matching

✅ **Filtering**
- Filter by service tier (Critical, High, Standard, Low)
- Active filter button highlighting

✅ **Statistics Dashboard**
- License distribution
- Service tier breakdown
- Total counts and metrics

✅ **Direct Links**
- Click any service to visit its website
- Repository links in service cards

✅ **Responsive Design**
- Works on desktop, tablet, mobile
- Modern dark theme with gradients
- Smooth animations and transitions

✅ **Accessibility**
- Semantic HTML
- Keyboard navigation
- ARIA labels

## Customization

### Adding a New Service

Edit `data/services.yaml` (for future use) or `script.js` (currently embedded):

```yaml
- name: "Your Service"
  description: "Brief description"
  url: "https://example.com"
  repository: "https://github.com/org/repo"
  license: "Apache-2.0"
  category: "lms"
  subcategory: "LMS Platforms"
  tier: "high"
  maturity: "production"
  tags: ["tag1", "tag2"]
```

### Changing the Theme

Edit `styles.css` and modify the CSS custom properties:

```css
:root {
  --primary: #06ffa5;     /* Main accent color */
  --secondary: #00b894;   /* Secondary accent */
  --dark: #0a0e27;        /* Background */
  --light: #ffffff;       /* Text */
}
```

### Adding a New Category

Add a new category object to the `categories` array in `script.js`:

```javascript
{
  id: "new-category",
  name: "New Category",
  description: "Category description",
  color: "#FF6B6B",
  icon: "🆕",
  subcategories: [...]
}
```

## Repository Information

- **Repository Name**: `landscape.opendesk-edu.org`
- **Domain**: `landscape.opendesk-edu.org`
- **License**: Apache-2.0
- **Status**: Live at https://landscape.opendesk-edu.org
- **Last Updated**: 2026-08-12

## Support

If you need help with deployment:
- 📧 Email: tobias.weiss@opendesk-edu.org
- 🐛 Issues: Create an issue in the repository once created
- 📖 Documentation: See README.md in the repository

## Why This Name?

The repository is named `landscape.opendesk-edu.org` to:
1. **Match the domain name** for easy DNS configuration
2. **Follow the CNCF convention** (landscape.cncf.io, landscape.cncf.io)
3. **Self-documenting** - the repository name IS the URL
4. **Easy to remember** - clear connection between repo and site

This naming convention is common for sub-domain projects and makes the relationship between code and deployment explicit.
