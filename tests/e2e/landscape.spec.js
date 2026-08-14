// SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
// SPDX-License-Identifier: Apache-2.0
//
// Browser E2E tests: real Chromium, real network requests, real rendering.
// Covers the full user journey + accessibility (axe-core) + visual regression.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const TOTAL_SERVICES = 110;
const TOTAL_CATEGORIES = 12;

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.item-card');
});

test.describe('rendering integrity', () => {
  test('renders every service exactly once (no parser-duplication bug)', async ({ page }) => {
    await expect(page.locator('.item-card')).toHaveCount(TOTAL_SERVICES);
  });

  test('renders all 12 categories in the sticky nav with counts', async ({ page }) => {
    await expect(page.locator('#category-nav-items a')).toHaveCount(TOTAL_CATEGORIES);
    const counts = await page.locator('#category-nav-items .nav-count').allTextContents();
    expect(counts.map(Number).reduce((a, b) => a + b, 0)).toBe(TOTAL_SERVICES);
  });

  test('every referenced logo file serves successfully (HTTP contract)', async ({ page }) => {
    const logos = await page.evaluate(() =>
      [...document.querySelectorAll('img.item-logo[src]')].map(img => img.getAttribute('src'))
    );
    expect(logos.length).toBeGreaterThan(80); // sanity: most services have logos
    const failed = [];
    for (const src of logos) {
      const url = new URL(src, page.url()).toString();
      const res = await page.request.get(url);
      if (!res.ok()) {
        failed.push(`${src} -> HTTP ${res.status()}`);
        continue;
      }
      const contentType = res.headers()['content-type'] || '';
      if (src.endsWith('.svg') && !contentType.includes('svg')) failed.push(`${src} -> ${contentType}`);
      if (src.endsWith('.png') && !contentType.includes('png')) failed.push(`${src} -> ${contentType}`);
    }
    expect(failed).toEqual([]);
  });

  test('shows a live result counter', async ({ page }) => {
    await expect(page.locator('#search-results')).toContainText(`${TOTAL_SERVICES} services`);
  });
});

test.describe('search & filters', () => {
  test('search narrows cards, highlights matches, and shows a chip', async ({ page }) => {
    await page.fill('#search', 'sonarqube');
    await expect(page.locator('.item-card')).toHaveCount(1);
    await expect(page.locator('.item-card mark')).toHaveCount(1);
    await expect(page.locator('#search-results')).toContainText('1 of 110 services shown');
    // search chip + clear-all chip
    await expect(page.locator('#active-filters .filter-chip')).toHaveCount(2);
    await expect(page.locator('#active-filters')).toContainText('sonarqube');
  });

  test('clear-all chip resets everything', async ({ page }) => {
    await page.fill('#search', 'matrix');
    await page.click('.filter-btn[data-filter-type="tier"][data-filter="high"]');
    await expect(page.locator('#active-filters .chip-clear-all')).toBeVisible();
    await page.click('#active-filters .chip-clear-all');
    await expect(page.locator('.item-card')).toHaveCount(TOTAL_SERVICES);
    await expect(page.locator('#search')).toHaveValue('');
  });

  test('tier filter reduces the grid to exactly the critical set', async ({ page }) => {
    await page.click('.filter-btn[data-filter-type="tier"][data-filter="critical"]');
    await expect(page.locator('#search-results')).toContainText('17 of 110 services shown');
    await expect(page.locator('.item-card')).toHaveCount(17);
  });

  test('beta maturity filter returns World-Office and HermesOffice', async ({ page }) => {
    await page.click('.filter-btn[data-filter-type="maturity"][data-filter="beta"]');
    await expect(page.locator('.item-card')).toHaveCount(2);
    await expect(page.locator('.item-name').first()).toHaveText('World-Office');
    await expect(page.locator('.item-name').nth(1)).toHaveText('HermesOffice');
  });

  test('no trace of the discontinued ONLYOFFICE product', async ({ page }) => {
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('onlyoffice');
  });

  test('Research & Publishing category shows exactly 2 services', async ({ page }) => {
    const count = await page.locator('#cat-research .item-card').count();
    expect(count).toBe(2);
  });
});

test.describe('interaction', () => {
  test('card click opens the modal with links, Escape closes it', async ({ page }) => {
    await page.locator('.item-card').first().click();
    await expect(page.locator('#detail-modal')).toBeVisible();
    await expect(page.locator('#modal-content h2')).not.toHaveText('');
    await expect(page.locator('.modal-links a').first()).toHaveAttribute('href', /^https?:\/\//);
    await page.keyboard.press('Escape');
    await expect(page.locator('#detail-modal')).not.toBeVisible();
  });

  test('theme toggle persists across reload', async ({ page }) => {
    await page.click('#theme-toggle');
    await expect(page.locator('body')).toHaveClass(/light-theme/);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('body')).toHaveClass(/light-theme/);
    // restore dark for other tests
    await page.click('#theme-toggle');
  });

  test('back-to-top appears after scrolling', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(page.locator('#back-to-top')).toHaveClass(/visible/);
  });

  test('tier donut chart and progress bars render', async ({ page }) => {
    await expect(page.locator('.tier-donut')).toBeVisible();
    const fills = await page.locator('.stat-bar-fill').count();
    expect(fills).toBeGreaterThanOrEqual(14); // licenses + maturities + tiers
  });

  test('CSV export downloads a file', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-csv');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});

test.describe('accessibility (axe-core)', () => {
  test('no critical or serious violations on the landing page', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    expect(serious, JSON.stringify(serious.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2)).toEqual([]);
  });

  test('modal dialog passes the dialog landmark checks', async ({ page }) => {
    await page.locator('.item-card').first().click();
    await expect(page.locator('#detail-modal')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('#detail-modal')
      .analyze();
    const serious = results.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    expect(serious.map(v => v.id)).toEqual([]);
  });
});

// Visual regression — opt-in via VISUAL=1 because pixel rendering depends on
// the host's fonts. Baseline lives in tests/e2e/__screenshots__/.
test.describe('visual regression', () => {
  test.skip(!process.env.VISUAL, 'visual regression opt-in (VISUAL=1)');

  test('hero and stats bar match the baseline', async ({ page }) => {
    await expect(page.locator('header')).toHaveScreenshot('hero.png', { maxDiffPixelRatio: 0.02 });
    await expect(page.locator('.stats-bar')).toHaveScreenshot('stats-bar.png', { maxDiffPixelRatio: 0.02 });
  });

  test('a category grid matches the baseline', async ({ page }) => {
    await page.evaluate(() => document.getElementById('cat-operations').scrollIntoView());
    await page.waitForTimeout(800);
    await expect(page.locator('#cat-operations')).toHaveScreenshot('operations-category.png', { maxDiffPixelRatio: 0.02 });
  });
});
