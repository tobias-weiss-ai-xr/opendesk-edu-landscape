<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# 🌄 openDesk Edu Landscape

An interactive, visual map of the openDesk Edu open-source ecosystem — integrated services for educational institutions. Inspired by the [CNCF Landscape](https://landscape.cncf.io).

**Live Site**: https://landscape.opendesk-edu.org

## What is This?

The openDesk Edu Landscape is an interactive visualization of the complete ecosystem of open-source services that make up the openDesk Edu platform. It helps:

- 🎓 **Educational institutions** understand the complete technology stack
- 🔧 **IT administrators** evaluate and plan deployments
- 👨‍💻 **Developers** discover services and integration points
- 📊 **Decision-makers** see the scope and maturity of the ecosystem

## Features

✅ **Interactive Visualization** - Browse services across 12 categories
🔍 **Powerful Search** - Find services by name, description, or tags
🎯 **Tier Filtering** - Filter by service tier (Critical, High, Standard, Low)
📈 **Statistics** - View license distribution, tier breakdown (with donut chart), and ecosystem metrics
🔗 **Direct Links** - Click any service to see details, documentation, and repository
📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
🌙 **Light/Dark Theme** - Toggle between dark and light mode
🔎 **Search highlighting** - Matched terms are highlighted in service cards
🧹 **Active filter chips** - One-click removal of active filters and search terms
🌍 **Open Source** - Apache-2.0 licensed, community-driven

## Categories

The services are organized into 12 main categories:

1. **Operations & Infrastructure** (19 services) - Prometheus, Grafana, Loki, Uptime Kuma, Grafana Tempo, Traefik, Docker, Portainer, MinIO, Kubernetes, Helm, Harbor, Trivy, Argo CD, Cert-Manager, Restic, Velero
2. **Security** (7 services) - Vaultwarden, ClamAV, Wazuh, Fail2ban, CrowdSec, Greenbone (OpenVAS), OWASP ZAP
3. **Analytics & Search** (6 services) - Matomo, Apache Superset, Plausible, Meilisearch, Elasticsearch, OpenSearch
4. **Media** (3 services) - Jellyfin, PeerTube, Owncast
5. **Identity & Access** (9 services) - Keycloak, Nubus, Shibboleth IdP, Apereo CAS, Authelia, authentik, Self-Service Password, OpenLDAP, LDAP Account Manager
6. **Learning Management** (10 services) - ILIAS, Moodle, OpenOlat, Stud.IP, BigBlueButton, Jitsi, XWiki, H5P, Mahara, edu-sharing
7. **Content & Collaboration** (14 services) - Nextcloud, OpenCloud, Collabora, Etherpad, CryptPad, Notes, World-Office, Draw.io, Excalidraw, BookStack, TYPO3, MediaWiki, DokuWiki, HedgeDoc
8. **Project Management** (6 services) - OpenProject, Planka, Taiga, Redmine, Vikunja, Kanboard
9. **Development & DevOps** (18 services) - Forgejo, Gitea, GitLab CE, Woodpecker CI, Jenkins, JupyterHub, RStudio, Overleaf, Dask Gateway, code-server, KasmVNC, Slidev, Ansible, OpenTofu, SonarQube, Ollama, Open WebUI, ttyd
10. **Communication** (12 services) - OX App Suite, SOGo, Radicale, Dovecot, Postfix, Roundcube, Element, Synapse, Mattermost, Rocket.Chat, Zammad, LimeSurvey
11. **Research & Publishing** (2 services) - Open Journal Systems (OJS), DSpace
12. **Accessibility & Inclusion** (3 services) - Pa11y, axe-core, Lighthouse

## Service Tiers

Services are classified by criticality:

- **Critical Tier** (17 services) - Foundation services with 99.9% availability
- **High Tier** (45 services) - Important services with 99.5% availability
- **Standard Tier** (43 services) - Collaboration tools with 99.0% availability
- **Low Tier** (4 services) - Supporting tools

## How to Use

### Online

Visit **https://landscape.opendesk-edu.org** to use the interactive landscape.

### Local Development

```bash
# Clone the repository
git clone https://github.com/opendesk-edu/landscape.opendesk-edu.org.git
cd landscape.opendesk-edu.org

# Serve locally
python3 -m http.server 8000

# Open http://localhost:8000 in your browser
```

Or use any static file server:

```bash
# Node.js http-server
npx http-server -p 8000

# PHP
php -S localhost:8000
```

## Project Structure

```
landscape.opendesk-edu.org/
├── index.html              # Main HTML page
├── styles.css              # Stylesheet
├── script.js               # Interactive JavaScript
├── data/
│   ├── services.yaml       # Landscape data (YAML — source of truth)
│   └── services.js         # Auto-generated from YAML (via npm run build)
├── scripts/
│   ├── generate-data.js    # YAML → JS generator (CLI)
│   └── lib/
│       └── data-pipeline.js # Parse → validate → metadata → serialize (unit-tested)
├── tests/
│   ├── unit/               # Vitest unit + data-integrity (golden-file) tests
│   ├── property/           # fast-check property-based tests
│   └── e2e/                # Playwright browser tests (incl. axe-core a11y)
├── vitest.config.mjs       # Unit test config + coverage thresholds
├── playwright.config.js    # E2E config (system Chromium fallback)
├── stryker.config.json     # Mutation testing config
├── package.json            # Project metadata
├── CNAME                   # Custom domain configuration
└── README.md               # This file
```

## Testing

The project applies a state-of-the-art test pyramid — from fast unit checks to
full browser E2E — all enforced in CI (GitLab + GitHub Actions).

| Layer | Tool | What it covers |
|---|---|---|
| Unit (contract) | Vitest | `data-pipeline` validation: required fields, enums, cross-references, logo extension/content parity, metadata derivation |
| Data integrity | Vitest | The real 109-service dataset: counts, distributions, URL/repo allowlists, no ONLYOFFICE, golden-file parity |
| Property-based | fast-check | Arbitrary landscapes: valid data never errors, deleting any required field always errors, breakdown sums invariant |
| Frontend (jsdom) | Vitest + jsdom | `LandscapeApp` logic: filtering, search highlighting, chips, modal, escaping |
| E2E | Playwright | Real Chromium: rendering, search/filter/chips, modal, theme persistence, exports, HTTP logo contract |
| Accessibility | axe-core | WCAG AA checks on landing page + modal (contrast, ARIA roles) |
| Visual regression | Playwright | Golden screenshots (opt-in via `VISUAL=1`) |
| Mutation | Stryker | Measures test-suite effectiveness (84% score, enforced ≥60%) |

```bash
npm test                 # unit + property + e2e
npm run test:unit        # vitest unit/property/data-integrity (fast)
npm run test:coverage    # + v8 coverage report with thresholds (≥85% lines)
npm run test:e2e         # playwright browser tests
npm run test:e2e:ui      # interactive Playwright UI
npm run test:mutation    # stryker mutation testing (measures test quality)
```

**Coverage gates** (vitest.config.mjs): ≥85% statements/lines/functions, ≥80% branches — the pipeline fails below these.
**Mutation gate** (stryker.config.json): break threshold 60%, high 80%.


## Contributing

We welcome contributions! The landscape is community-driven and designed to be easy to update.

### Adding or Updating a Service

1. **Edit the data file** (`data/services.yaml` — the single source of truth):
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

2. **Run the generator** to update the JavaScript:
    ```bash
    npm run build
    ```

3. **Add a logo** (optional but recommended):
    - Place logo SVG in `hosted_logos/` directory
    - Reference it in the entry: `logo: "your-service.svg"`

4. **Open a Pull Request** with:
    - Clear description of the service
    - Justification for the category and tier
    - Confirmation that the license is compatible (open source)

### Tier Classification Guidelines

When adding a service, use these guidelines for tier classification:

- **Critical**: Service is foundational and its failure breaks multiple other services (e.g., authentication, primary storage)
- **High**: Service is important for core workflows but alternatives exist (e.g., LMS, email)
- **Standard**: Service enhances productivity but can be deferred (e.g., Kanban, surveys)
- **Low**: Service is nice-to-have or easily replaceable (e.g., simple diagram editors)

### Updating Existing Services

To update information for an existing service:

1. Edit the relevant field in the data file
2. Open a PR with a clear description of the change
3. Reference any relevant issues or discussions

## Inspiration

This project is inspired by the [CNCF Landscape](https://landscape.cncf.io), which provides an excellent interactive visualization of the cloud native ecosystem. We've adapted the concept for the openDesk Edu educational technology ecosystem.

**Key differences from CNCF Landscape:**
- Focused on educational technology use cases
- Simpler structure (integrated services vs. 1000+)
- Self-contained static site (no build process)
- Easier to contribute (YAML data file)
- Apache-2.0 licensed (CNCF is also Apache-2.0)

## Technical Details

- **No build process** - Pure HTML, CSS, and JavaScript
- **No dependencies** - Works without npm install or any package manager
- **Responsive design** - Mobile-first approach with CSS Grid and Flexbox
- **Accessible** - Semantic HTML, ARIA labels, keyboard navigation
- **Fast** - No external dependencies, loads in <1 second
- **SEO-friendly** - Proper meta tags, semantic markup

## License

Apache-2.0

Copyright 2026 openDesk Edu Contributors

## Related Projects

- **[opendesk-edu.org](https://opendesk-edu.org)** - Main project website
- **[OpenSpec Documentation](https://github.com/opendesk-edu/opendesk-edu-spec)** - Complete specifications
- **[opendesk-edu GitHub](https://github.com/opendesk-edu/opendesk-edu)** - Source code and issues
- **[CNCF Landscape](https://landscape.cncf.io)** - Inspiration for this project

## Contact

- **GitHub Issues**: https://github.com/opendesk-edu/landscape.opendesk-edu.org/issues
- **Email**: tobias.weiss@opendesk-edu.org
- **Website**: https://opendesk-edu.org

---

**Made with ❤️ by the openDesk Edu Community**
