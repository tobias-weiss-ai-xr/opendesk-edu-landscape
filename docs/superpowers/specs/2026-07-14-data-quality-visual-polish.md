# Data Quality & Visual Polish — Sprint A+B

**Goal**: Reach 100% metadata coverage across all 49 services, then add subtle visual animations and polish to the landscape UI.

**Architecture**: Single-page vanilla HTML/CSS/JS. YAML data source at `data/services.yaml`, consumed via generated `data/services.js`. All visual changes are CSS-only where possible.

---

## Sprint A — Data Quality

### Current Coverage

| Field | Have | Missing |
|---|---|---|
| `docs_url` | ~16 | ~33 |
| `stars` | ~29 | ~20 |
| `organization` | ~29 | ~20 |
| `language` | ~22 | ~27 |
| `tags` (edu-specific) | ~26 have any edu tags | ~23 have none |

### Approach

Single Python script that batch-updates `data/services.yaml` using hardcoded lookup dictionaries. Each value verified against the service's actual repository, documentation site, or GitHub API. No AI guessing.

### Field-by-field plan

**1. `docs_url`** — Add official documentation URL for all 49 services. Where the project has a dedicated docs subdomain (`docs.grafana.com`) or a read-the-docs page, use that. For smaller projects without separate docs, link to the README or wiki in the repo.

**2. `stars`** — Add GitHub star counts (ballpark rounded, suffixed like `"5.2k"`). Pulled from current GitHub repo data.

**3. `organization`** — Add the primary maintaining organization. Use the vendor name (e.g., "Grafana Labs", "Elastic", "Canonical").

**4. `language`** — Add the primary programming language(s). For multi-language projects, list the main ones (e.g., "Go, TypeScript").

**5. `tags`** — **Ensure every service has at least 2 education-specific tags.** Education tags are drawn from: `education`, `lectures`, `virtual-classroom`, `curriculum`, `gdpr`, `lms-integration`, `teaching-evaluation`, `student-collaboration`, `research`, `accessibility`, `inclusion`, `exam`, `plagiarism`, `science`, `academic`, `syllabus`, `certification`, `self-study`, `group-work`, `office-hours`, `attendance`, `grading`.

Existing services that already have edu tags will be preserved; only services with 0 or 1 edu tag will be enriched.

**6. License normalization** — Normalize all license strings to SPDX identifiers. No "MIT License" → "MIT", no "Apache 2.0" → "Apache-2.0".

**Validation**: `npm run build` must pass. YAML must parse. All URLs in `docs_url` must be well-formed.

---

## Sprint B — Visual Polish

### 1. Card Entry Animation

CSS `@keyframes fadeInUp` applied to `.item-card`:

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Each card gets `animation: fadeInUp 0.3s ease both` with `animation-delay` set via inline style or CSS `nth-child` staggering. Target: cards appear in a staggered wave as the user scrolls.

### 2. Category Gradient Backgrounds

Each `.category-header` currently uses a hardcoded linear gradient. Instead, generate it from the category's `color` property via JS:

```
background: linear-gradient(135deg, ${color}22 0%, ${color}44 100%);
```

The `22` and `44` are hex alpha values (~13% and ~27% opacity), so the gradient is subtle and matches the category color.

### 3. Card Hover Lift

```css
.item-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
```

Light theme variant uses `rgba(0,0,0,0.1)` for shadow.

### 4. Loading Skeleton

Add a simple CSS pulse animation on a placeholder div in `index.html` that shows before the JS renders:

```html
<div id="landscape-skeleton" class="skeleton">
  <!-- 3-4 skeleton category blocks -->
</div>
```

Which gets hidden when `renderLandscape()` runs. CSS uses `@keyframes pulse` on gray placeholder boxes.

### 5. Filter Transitions

When filter changes trigger `renderLandscape()`, categories that become hidden use `opacity: 0; transform: scaleY(0.95)` with a 200ms transition instead of immediate `display: none`. The JS can briefly add a `filtering` class and use `requestAnimationFrame` to trigger the transition before clearing the container.

Simpler approach: wrap category sections and animate their removal via CSS transitions when detected by a ResizeObserver or a brief 100ms setTimeout before clearing innerHTML.

### Scope Boundary

- No JS framework additions
- No new dependencies
- No behavior changes, only visual polish
- All animations must respect `prefers-reduced-motion`

---

## Out of Scope (explicitly not in this sprint)

- New categories or services (data content, not structure)
- Multi-select tag/subcategory filters
- Service comparison tool
- Docker compose or deployment changes
- Performance optimization
- Accessibility beyond `prefers-reduced-motion`

---

## Success Criteria

- `npm run build` passes (11 categories, 49 services)
- Every service has `docs_url`, `stars`, `organization`, `language`
- Every service has ≥2 education-specific tags
- All license strings use SPDX identifiers
- Card animations visible on page load
- Category headers show color-matched gradients
- Hover lift effect works on all cards
- Loading skeleton visible before JS init
- Filter transitions smooth (no abrupt hide)
