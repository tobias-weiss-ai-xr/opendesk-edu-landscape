// SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
// SPDX-License-Identifier: Apache-2.0
//
// Frontend unit tests: run the real LandscapeApp class in a jsdom DOM.
// The browser build stays untouched; script.js exports the class only when
// loaded in a CommonJS context (the module.exports seam).

// @vitest-environment jsdom

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { LandscapeApp } from '../../script.js';

const REPO_ROOT = path.join(import.meta.dirname, '..', '..');

function loadBodyFixture() {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
  document.body.innerHTML = bodyMatch ? bodyMatch[1] : '';
}

function loadRealData() {
  const code = fs.readFileSync(path.join(REPO_ROOT, 'data', 'services.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox);
  return sandbox.window.__LANDSCAPE_DATA;
}

let app;
beforeAll(async () => {
  loadBodyFixture();
  window.__LANDSCAPE_DATA = loadRealData();
  app = new LandscapeApp();
  await new Promise(r => setTimeout(r, 50)); // let async init settle
});

afterEach(() => {
  app.clearFilters();
});

describe('escapeHtml', () => {
  it('escapes HTML metacharacters', () => {
    expect(app.escapeHtml('<b>&"\'')).toBe('&lt;b&gt;&amp;&quot;&#39;');
  });

  it('handles falsy input', () => {
    expect(app.escapeHtml(null)).toBe('');
    expect(app.escapeHtml(undefined)).toBe('');
    expect(app.escapeHtml(0)).toBe(''); // falsy values yield empty string
    expect(app.escapeHtml('')).toBe('');
  });
});

describe('highlightText', () => {
  it('returns escaped text unchanged when there is no search query', () => {
    app.searchQuery = '';
    expect(app.highlightText('Hello <world>')).toBe('Hello &lt;world&gt;');
  });

  it('wraps case-insensitive matches in <mark>', () => {
    app.searchQuery = 'keycloak';
    const out = app.highlightText('Keycloak SSO');
    expect(out).toContain('<mark>Keycloak</mark>');
    expect(out).toContain('SSO');
  });

  it('does not double-escape the query when it contains special chars', () => {
    app.searchQuery = 'C++';
    const out = app.highlightText('C++ IDE');
    expect(out).toContain('<mark>C++</mark>');
    expect(out).not.toContain('&lt;');
  });

  it('handles regex metacharacters in the query safely', () => {
    app.searchQuery = 'a(b)c';
    expect(app.highlightText('a(b)c x')).toContain('<mark>a(b)c</mark>');
  });
});

describe('matchesFilter', () => {
  const item = {
    name: 'Keycloak',
    description: 'Identity and access management',
    tags: ['sso', 'oidc'],
    license: 'Apache-2.0',
    category: 'identity',
    subcategory: 'Single Sign-On',
    tier: 'critical',
    maturity: 'graduated',
    language: 'Java',
    organization: 'Keycloak Project'
  };

  it('matches everything with no filters active', () => {
    app.currentFilter = 'all';
    app.currentMaturityFilter = 'all';
    app.searchQuery = '';
    expect(app.matchesFilter(item)).toBe(true);
  });

  it('filters by tier', () => {
    app.currentFilter = 'critical';
    expect(app.matchesFilter(item)).toBe(true);
    app.currentFilter = 'low';
    expect(app.matchesFilter(item)).toBe(false);
  });

  it('filters by maturity', () => {
    app.currentMaturityFilter = 'graduated';
    app.currentFilter = 'all';
    expect(app.matchesFilter(item)).toBe(true);
    app.currentMaturityFilter = 'beta';
    expect(app.matchesFilter(item)).toBe(false);
  });

  it('searches name, description, tags, license, subcategory, language, organization', () => {
    app.currentFilter = 'all';
    app.currentMaturityFilter = 'all';
    const probes = ['keycloak', 'identity', 'sso', 'apache-2.0', 'single sign-on', 'java', 'project'];
    for (const q of probes) {
      app.searchQuery = q;
      expect(app.matchesFilter(item), `query: ${q}`).toBe(true);
    }
    app.searchQuery = 'zzzznothing';
    expect(app.matchesFilter(item)).toBe(false);
  });
});

describe('renderItem', () => {
  it('produces a card with badges, tags, logo, and docs link', () => {
    const item = {
      name: 'Grafana',
      description: 'Dashboards',
      url: 'https://grafana.com',
      docs_url: 'https://grafana.com/docs',
      repository: 'https://github.com/grafana/grafana',
      license: 'AGPL-3.0',
      tier: 'critical',
      maturity: 'production',
      category: 'operations',
      subcategory: 'Monitoring & Observability',
      tags: ['observability'],
      logo: 'grafana.svg',
      stars: '66k',
      organization: 'Grafana Labs',
      language: 'Go'
    };
    const html = app.renderItem(item);
    expect(html).toContain('class="item-card"');
    expect(html).toContain('tier-badge tier-critical');
    expect(html).toContain('maturity-badge maturity-production');
    expect(html).toContain('hosted_logos/grafana.svg');
    expect(html).toContain('item-docs');
    expect(html).toContain('⭐ 66k');
    expect(html).toContain('role="link"');
    expect(html).not.toContain('href="#"'); // no dead links
  });

  it('renders a fallback initial logo when no logo file is set', () => {
    const item = {
      name: 'Mystery Tool',
      description: 'desc',
      url: 'https://example.net',
      license: 'MIT',
      tier: 'standard',
      maturity: 'beta',
      category: 'tools',
      subcategory: 'Utilities',
      tags: []
    };
    const html = app.renderItem(item);
    expect(html).toContain('item-logo-fallback');
    expect(html).toContain('>M</div>');
  });
});

describe('renderLandscape + categories', () => {
  it('renders every category with its subcategories and item cards', () => {
    app.renderLandscape();
    const cards = document.querySelectorAll('.item-card').length;
    expect(cards).toBe(110);
    expect(document.querySelectorAll('.category').length).toBe(12);
    expect(document.getElementById('cat-research')).not.toBeNull();
    expect(document.getElementById('cat-research').querySelectorAll('.item-card').length).toBe(2);
  });

  it('renders the count badge in category headers', () => {
    const badges = [...document.querySelectorAll('.count-badge')].map(b => parseInt(b.textContent, 10));
    expect(badges.reduce((a, b) => a + b, 0)).toBe(110);
  });
});

describe('updateActiveFilters chips', () => {
  it('shows no chips when nothing is active', () => {
    app.currentFilter = 'all';
    app.currentMaturityFilter = 'all';
    app.searchQuery = '';
    app.updateActiveFilters();
    const container = document.getElementById('active-filters');
    expect(container.classList.contains('has-filters')).toBe(false);
    expect(container.querySelectorAll('.filter-chip').length).toBe(0);
  });

  it('renders a chip per active filter and a clear-all button', () => {
    app.currentFilter = 'high';
    app.currentMaturityFilter = 'beta';
    app.searchQuery = 'matrix';
    app.updateActiveFilters();
    const chips = document.querySelectorAll('#active-filters .filter-chip');
    expect(chips.length).toBe(4); // tier + maturity + search + clear-all
    expect(document.querySelector('#active-filters .chip-clear-all')).not.toBeNull();
  });

  it('removing the tier chip resets only the tier filter', () => {
    app.currentFilter = 'high';
    app.currentMaturityFilter = 'beta';
    app.searchQuery = '';
    app.updateActiveFilters();
    document.querySelector('#active-filters [data-chip-type="tier"]').click();
    expect(app.currentFilter).toBe('all');
    expect(app.currentMaturityFilter).toBe('beta');
  });
});

describe('modal', () => {
  it('opens with service details and closes', async () => {
    const modal = document.getElementById('detail-modal');
    app.showDetailModal({
      name: 'World-Office',
      description: 'Sovereign office suite',
      url: 'https://codeberg.org/World-Office',
      repository: 'https://codeberg.org/World-Office/server',
      docs_url: 'https://codeberg.org/World-Office/server/src/branch/main/README.md',
      license: 'AGPL-3.0',
      tier: 'high',
      maturity: 'beta',
      category: 'collaboration',
      subcategory: 'Office & Documents',
      tags: ['office', 'rust']
    });
    expect(modal.style.display).toBe('flex');
    expect(document.querySelector('#modal-content h2').textContent).toBe('World-Office');
    expect(modal.querySelectorAll('.modal-links a').length).toBe(3);
    app.closeModal();
    expect(modal.style.display).toBe('none');
  });
});

describe('findItem', () => {
  it('finds services by exact name', () => {
    const item = app.findItem('Kubernetes');
    expect(item).toBeTruthy();
    expect(item.tier).toBe('critical');
    expect(app.findItem('does-not-exist')).toBeUndefined();
  });
});

describe('renderStats counters', () => {
  it('animates the service counter to the real total', async () => {
    // force synchronous finish by waiting for the animation
    await new Promise(r => setTimeout(r, 900));
    expect(document.getElementById('stat-count-services').textContent).toBe('110');
    expect(document.getElementById('stat-services').textContent).toBe('110');
  });
});
