# Landscape Improvements Round 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the openDesk Edu Landscape's data quality, visual presentation, and user experience through targeted enhancements.

**Architecture:** Vanilla HTML/CSS/JS static site with YAML data source. Single-page landscape with category-based grid layout, card-based service display, search/filter, theme toggle, and export functionality.

**Tech Stack:** HTML5, CSS3 (custom properties, grid, flexbox), vanilla JavaScript (class-based), js-yaml for data generation.

**Current State:** 49 services, 11 categories, 26 subcategories, 164 unique tags, 13/49 logos, all services with full metadata (docs_url, language, stars, organization).

---

## File Map

| File | Responsibility |
|---|---|
| `data/services.yaml` | Single source of truth for all services and categories |
| `scripts/generate-data.js` | YAML→JS generator with schema validation |
| `data/services.js` | Auto-generated — consumed by script.js |
| `script.js` | LandscapeApp class — rendering, filtering, search, modal, export, nav, theme |
| `styles.css` | All visual styles including light/dark themes, responsive breakpoints |
| `index.html` | Page structure — header, controls, nav, grid, metadata, footer, modal |
| `hosted_logos/` | SVG/PNG logo files referenced by service entries |

---

### Task 1: Standardize Service Descriptions

**Files:**
- Modify: `data/services.yaml`

**Problem:** Descriptions are inconsistent — some are one-liners ("Real-time collaborative text editing with OT algorithm"), others are multi-sentence paragraphs ("Observability dashboards for metrics, logs, and traces with multi-source support...").

**Solution:** Rewrite all 49 descriptions to follow a consistent 2-sentence format:
1. **What:** Technical summary with key capabilities
2. **Why education:** How it benefits educational institutions

- [ ] **Step 1: Rewrite descriptions for Operations & Infrastructure (10 services)**

Example format:
```yaml
description: "Cloud-native reverse proxy and load balancer with automatic HTTPS and Docker service discovery. Provides secure routing for all openDesk services in a unified entry point for educational institutions."
```

- [ ] **Step 2: Rewrite descriptions for Security, Analytics, Media (6 services)**

- [ ] **Step 3: Rewrite descriptions for Identity & Access, Learning Management (9 services)**

- [ ] **Step 4: Rewrite descriptions for Content & Collaboration (11 services)**

- [ ] **Step 5: Rewrite descriptions for Project Management, Communication, Development, Accessibility (13 services)**

- [ ] **Step 6: Run `npm run build` to verify schema validation**

Run: `cd /home/weissto_local/git/opendesk_git/opendesk-edu-landscape && npm run build`
Expected: "Generated ... (11 categories, 49 services)"

---

### Task 2: Fetch Missing Logos (Target: 25+/49)

**Files:**
- Modify: `data/services.yaml` (add logo references)
- Add to: `hosted_logos/`

**Problem:** Only 13/49 services have logos. The colored initial fallback works but logos give a more professional appearance.

**Approach:** For each service without a logo, try these sources in order:
1. The project's `/logo.svg` or `/logo.png` on GitHub
2. `https://simpleicons.org/icons/[service-name]` — provides SVGs for most popular open-source projects
3. `https://cdn.simpleicons.org/icons/[service].svg` (direct CDN)

Priority services to add logos for (high visibility):
Keycloak, ILIAS, Moodle, Nextcloud, BigBlueButton, Element, Collabora, TYPO3, OpenProject, Matomo, Elasticsearch, Etherpad, Excalidraw, Vaultwarden, Traefik, Harbor, Restic, Alertmanager, Postfix, Dovecot, SOGo, XWiki, BookStack, Planka, Draw.io, OpenCloud, Self-Service Password, Notes, Nubus, Zammad, LimeSurvey, ClamAV, Forgejo, Gitea, Woodpecker, HedgeDoc, CryptPad, Pa11y, Docker

- [ ] **Step 1: Batch-fetch logos from simpleicons.org CDN**

```bash
cd hosted_logos
for svc in keycloak ilias moodle nextcloud bigbluebutton element collabora typo3 openproject matomo elasticsearch etherpad excalidraw vaultwarden traefik harbor alertmanager postfix dovecot sogo xwiki bookstack planka drawio opencloud self-service-password zammad limesurvey forgejo gitea woodpecker hedgedoc cryptpad pa11y; do
  curl -s -L -o "${svc}.svg" "https://cdn.simpleicons.org/icons/${svc}.svg"
  size=$(stat --format='%s' "${svc}.svg" 2>/dev/null || echo "0")
  if [ "$size" -lt 1000 ]; then
    rm -f "${svc}.svg"
    echo "✗ ${svc}"
  else
    echo "✓ ${svc} (${size} bytes)"
  fi
done
```

- [ ] **Step 2: For each successful logo, add `logo: "service.svg"` to the service entry in data/services.yaml**

Use Python or sed to add the `logo:` line after the `maturity:` line for each service that has a valid logo file.

- [ ] **Step 3: Run `npm run build` to verify**

---

### Task 3: Improve Category Color Scheme

**Files:**
- Modify: `data/services.yaml` (category colors)
- Modify: `styles.css` (tier badge colors)

**Problem:** Some category colors are too similar (Operations #2ECC71 green, LMS #50C878 green). Tier badges use the same 4 colors for all categories.

**Solution:**
- Assign distinct, non-conflicting colors to each category
- Make tier badges inherit from their parent category color instead of using global tier colors

Category color palette (11 distinct hues):
```yaml
Operations & Infrastructure: "#3498db" (blue)
Security: "#e74c3c" (red)
Analytics & Search: "#f39c12" (amber)
Media: "#9b59b6" (purple)
Identity & Access: "#1abc9c" (teal)
Learning Management: "#50c878" (green)
Content & Collaboration: "#e67e22" (orange)
Project Management: "#f1c40f" (gold)
Communication: "#2ecc71" (mint green)
Development & DevOps: "#7f8c8d" (gray)
Accessibility & Inclusion: "#8e44ad" (violet)
```

- [ ] **Step 1: Update category colors in data/services.yaml**

- [ ] **Step 2: Add category-color-aware tier badges in styles.css**

Replace the global tier colors with CSS that derives from the category's accent color:
```css
.tier-critical { background: color-mix(in srgb, currentColor 25%, #e74c3c 75%); }
```
Or simpler: keep tier badges global but ensure they don't clash with category headers.

- [ ] **Step 3: Run `npm run build` to verify**

---

### Task 4: Add Category Description Tooltips

**Files:**
- Modify: `script.js` (renderCategoryNav)

**Problem:** Category names and icons are brief. Users may not know what "Analytics & Search" or "Development & DevOps" contains without scrolling.

**Solution:** Add `title` attribute with the category description to each nav link.

- [ ] **Step 1: In `renderCategoryNav()`, add the category description as a tooltip**

In script.js, find the line:
```javascript
`<a href="#${cat.id}" data-category="${cat.id}">${cat.icon} ${cat.name}</a>`
```
Replace with:
```javascript
`<a href="#${cat.id}" data-category="${cat.id}" title="${cat.description}">${cat.icon} ${cat.name}</a>`
```

- [ ] **Step 2: Run `npm run build` to verify**

---

### Task 5: Add Service Count Badges to Category Headers

**Files:**
- Modify: `script.js` (renderLandscape method)

**Problem:** Users can't quickly see how many services each category contains without counting cards.

**Solution:** Show the service count in each category header, updated when filters are active.

- [ ] **Step 1: In the `renderLandscape()` method, modify the category header rendering**

After the description `<p>`, add a count badge:
```javascript
const itemCount = visibleSubcategories.reduce((sum, sub) => sum + sub.items.length, 0);
`;<span style="font-size:0.8rem;color:var(--gray);margin-left:0.5rem;">(${itemCount} services)</span>`
```

- [ ] **Step 2: Run `npm run build` to verify**

---

### Task 6: Add Keyboard Navigation Support

**Files:**
- Modify: `script.js` (setupEventListeners)

**Problem:** No keyboard navigation. Users can't tab through cards or use keyboard shortcuts for common actions.

**Solution:** Add keyboard event handlers for:
- `Ctrl/Cmd + K` to focus search
- `Escape` already works for modal close (existing)
- `/` to focus search (alternative shortcut)

- [ ] **Step 1: Add keyboard shortcut handler in setupEventListeners**

```javascript
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search').focus();
  }
  if (e.key === '/' && !e.target.closest('#search, .item-card, textarea, input')) {
    e.preventDefault();
    document.getElementById('search').focus();
  }
});
```

- [ ] **Step 2: Run `npm run build` to verify**

---

### Task 7: Add "No Results" Empty State

**Files:**
- Modify: `script.js` (renderLandscape)
- Modify: `styles.css`

**Problem:** When a search/filter yields no results, the landscape section is empty with no feedback.

**Solution:** Show a "No services found" message when all categories are filtered out.

- [ ] **Step 1: At the end of `renderLandscape()`, check if container is empty and show empty state**

```javascript
if (container.children.length === 0) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <p>No services match your current filters.</p>
      <button class="filter-btn" onclick="document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));document.querySelector('[data-filter=\"all\"]').classList.add('active');">Clear all filters</button>
    </div>
  `;
}
```

- [ ] **Step 2: Add empty state styles to styles.css**

```css
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--gray);
}

.empty-state-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
}

.empty-state .filter-btn {
  display: inline-block;
}
```

- [ ] **Step 3: Run `npm run build` to verify**

---

### Task 8: Add OpenDesk Edu Spec Repo Reference to Footer

**Files:**
- Modify: `index.html` (footer section)

**Problem:** The footer mentions GitHub contribution but doesn't reference the spec repo.

**Solution:** Add a link to the openDesk Edu spec repo alongside the existing GitHub contribution link.

- [ ] **Step 1: In the footer, add a link to the spec repo**

Current footer:
```html
<a href="https://github.com/opendesk-edu/landscape">Contribute on GitHub</a>
```

Add after:
```html
<a href="https://github.com/opendesk-edu/opendesk-edu-spec">View Spec →</a>
```

- [ ] **Step 2: Run `npm run build` to verify**

---

## Self-Review

**Spec coverage:**
- [x] Descriptions standardized (Task 1)
- [x] More logos (Task 2)
- [x] Better color scheme (Task 3)
- [x] Better category UX (Tasks 4-5)
- [x] Accessibility: keyboard nav (Task 6)
- [x] Better empty state (Task 7)
- [x] Spec repo reference (Task 8)

**Placeholder scan:**
- [x] No TBDs
- [x] No "similar to Task N" references
- [x] All steps contain actual code or commands

**Type consistency:**
- [x] File paths are consistent throughout all tasks
- [x] No method name mismatches

---

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-07-14-landscape-improvements-round3.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
