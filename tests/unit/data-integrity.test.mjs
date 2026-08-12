// SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
// SPDX-License-Identifier: Apache-2.0
//
// Data-integrity tests against the REAL landscape dataset (data/services.yaml).
// These are the "golden invariants" of the ecosystem: if any fail, the data
// is broken and the build pipeline must refuse to publish.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {
  buildFromYaml,
    serialize,
    VALID_TIERS,
    VALID_MATURITIES
} from '../../scripts/lib/data-pipeline.js';

const REPO_ROOT = path.join(import.meta.dirname, '..', '..');
const YAML_PATH = path.join(REPO_ROOT, 'data', 'services.yaml');
const JS_PATH = path.join(REPO_ROOT, 'data', 'services.js');

const yamlText = fs.readFileSync(YAML_PATH, 'utf8');
const { data, warnings } = buildFromYaml(yamlText);

const allItems = () => data.categories.flatMap(c => c.subcategories.flatMap(s => s.items));

describe('real landscape dataset (109 services)', () => {
  it('validates without any errors or warnings', () => {
    expect(warnings).toEqual([]);
    expect(data.categories.length).toBeGreaterThanOrEqual(12);
  });

  it('has the expected service and category counts', () => {
    expect(data.metadata.total_services).toBeGreaterThanOrEqual(109);
    expect(data.metadata.total_categories).toBe(12);
  });

  it('has a balanced tier distribution', () => {
    const tiers = Object.fromEntries(data.metadata.service_tiers.map(t => [t.tier, t.count]));
    expect(tiers.critical).toBeGreaterThanOrEqual(17);
    expect(tiers.high).toBeGreaterThanOrEqual(45);
    expect(tiers.standard).toBeGreaterThanOrEqual(43);
    expect(tiers.low).toBeGreaterThanOrEqual(4);
  });

  it('has a healthy maturity mix including graduated and beta', () => {
    const m = Object.fromEntries(data.metadata.maturity_levels.map(x => [x.level, x.count]));
    expect(m.graduated).toBeGreaterThanOrEqual(13);
    expect(m.production).toBeGreaterThanOrEqual(90);
    expect(m.beta).toBeGreaterThanOrEqual(1);
  });

  it('supports a rich license ecosystem (>= 12 distinct licenses)', () => {
    expect(data.metadata.license_breakdown.length).toBeGreaterThanOrEqual(12);
  });

  it('every service has all required fields populated', () => {
    for (const item of allItems()) {
      expect(item.name, item.name).toBeTruthy();
      expect(item.description, item.name).toBeTruthy();
      expect(item.url, item.name).toBeTruthy();
      expect(item.license, item.name).toBeTruthy();
      expect(item.tier, item.name).toBeTruthy();
      expect(item.maturity, item.name).toBeTruthy();
      expect(item.category, item.name).toBeTruthy();
      expect(item.subcategory, item.name).toBeTruthy();
    }
  });

  it('every tier and maturity is from the declared enums', () => {
    for (const item of allItems()) {
      expect(VALID_TIERS, `${item.name} tier`).toContain(item.tier);
      expect(VALID_MATURITIES, `${item.name} maturity`).toContain(item.maturity);
    }
  });

  it('every url is absolute http(s)', () => {
    for (const item of allItems()) {
      expect(item.url, `${item.name} url`).toMatch(/^https?:\/\/\S+$/);
    }
  });

  it('every repository URL points to a known host', () => {
    for (const item of allItems()) {
      if (!item.repository) continue;
      expect(item.repository, `${item.name} repo`).toMatch(
        /^(https:\/\/(github\.com|codeberg\.org|gitlab\.com|git\.edu-sharing\.net|git\.shibboleth\.net|git\.openldap\.org|gitlab\.open-xchange\.com)\/?|ssh:\/\/)/
      );
    }
  });

  it('has no duplicate names and no placeholder URLs', () => {
    const names = new Set();
    for (const item of allItems()) {
      expect(names.has(item.name), `duplicate name ${item.name}`).toBe(false);
      names.add(item.name);
      expect(item.url, item.name).not.toContain('example.org');
      expect(item.url, item.name).not.toContain('example.com');
    }
  });

  it('never references the discontinued ONLYOFFICE product', () => {
    const blob = yamlText.toLowerCase() + JSON.stringify(allItems()).toLowerCase();
    expect(blob).not.toContain('onlyoffice');
  });

  it('category field of every item matches its parent category id', () => {
    for (const cat of data.categories) {
      for (const sub of cat.subcategories) {
        for (const item of sub.items) {
          expect(item.category, item.name).toBe(cat.id);
          expect(item.subcategory, item.name).toBe(sub.name);
        }
      }
    }
  });

  it('World-Office (the sovereign office suite) is present and beta', () => {
    const wo = allItems().find(i => i.name === 'World-Office');
    expect(wo).toBeTruthy();
    expect(wo.maturity).toBe('beta');
    expect(wo.license).toBe('AGPL-3.0');
  });
});

describe('golden-file contract (data/services.js)', () => {
  it('committed data/services.js is byte-identical to a fresh build', () => {
    const committed = fs.readFileSync(JS_PATH, 'utf8');
    const fresh = serialize(data);
    expect(fresh).toBe(committed);
  });

  it('committed data/services.js loads and exposes 109 services', () => {
    const code = fs.readFileSync(JS_PATH, 'utf8');
    const sandbox = { window: {} };
    vm.runInNewContext(code, sandbox);
    const loaded = sandbox.window.__LANDSCAPE_DATA;
    expect(loaded.metadata.total_services).toBe(data.metadata.total_services);
    expect(loaded.categories.length).toBe(12);
  });
});
